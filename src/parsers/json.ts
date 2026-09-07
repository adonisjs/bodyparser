/*
 * @adonisjs/bodyparser
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { IncomingMessage } from 'node:http'
import { safeParse } from '@poppinss/utils/json'
import { Exception } from '@poppinss/utils/exception'
import { type Encoding, type Options as RawBodyOptions } from 'raw-body'

import { parseText, prepareTextParserOptions } from './text.ts'
import { formBodyNormalizers } from '../utils.ts'
import { type BodyParserJSONConfig } from '../types.ts'

/**
 * Allowed whitespace is defined in RFC 7159
 * http://www.rfc-editor.org/rfc/rfc7159.txt
 */
// eslint-disable-next-line no-control-regex
const strictJSONReg = /^[\x20\x09\x0a\x0d]*(\[|\{)/

/**
 * Prepares parser options for JSON body parsing by configuring strict mode
 * and value normalization.
 *
 * @param options - JSON body parser configuration
 */
export function prepareJSONParserOptions(options: Partial<BodyParserJSONConfig>): RawBodyOptions & {
  encoding: Encoding
  strict: boolean
  maxDepth?: number
  normalizer?: (value: string) => string | null
} {
  let normalizer: undefined | ((value: string) => string | null)
  if (options.convertEmptyStringsToNull && options.trimWhitespaces) {
    normalizer = formBodyNormalizers.trimWhitespacesAndConvertToNull
  } else if (options.convertEmptyStringsToNull) {
    normalizer = formBodyNormalizers.convertToNull
  } else if (options.trimWhitespaces) {
    normalizer = formBodyNormalizers.trimWhitespaces
  }

  return {
    ...prepareTextParserOptions(options),
    strict: options.strict !== false,
    maxDepth: options.maxDepth,
    normalizer,
  }
}

/**
 * Enforces an optional depth limit and normalizes strings in one iterative
 * traversal, without the cost of a JSON reviver.
 */
function processJSONValues(
  value: unknown,
  { normalizer, maxDepth }: ReturnType<typeof prepareJSONParserOptions>
) {
  if ((!normalizer && maxDepth === undefined) || !value || typeof value !== 'object') {
    return
  }

  const stack = [{ value: value as Record<string, unknown> | unknown[], depth: 1 }]
  while (stack.length) {
    const { value: current, depth } = stack.pop()!
    if (maxDepth !== undefined && depth > maxDepth) {
      throw new Exception(`Invalid JSON, maximum nesting depth is ${maxDepth}`, {
        status: 400,
      })
    }

    if (Array.isArray(current)) {
      for (let index = 0; index < current.length; index++) {
        const child = current[index]
        if (normalizer && typeof child === 'string') {
          current[index] = normalizer(child)
        } else if (child && typeof child === 'object') {
          stack.push({ value: child as Record<string, unknown> | unknown[], depth: depth + 1 })
        }
      }
      continue
    }

    for (const [key, child] of Object.entries(current)) {
      if (normalizer && typeof child === 'string') {
        if (key !== '') {
          current[key] = normalizer(child)
        }
      } else if (child && typeof child === 'object') {
        stack.push({ value: child as Record<string, unknown> | unknown[], depth: depth + 1 })
      }
    }
  }
}

/**
 * Parses JSON request body with optional strict mode that enforces only
 * objects and arrays as valid JSON. Returns both parsed and raw representations.
 *
 * @param req - The incoming HTTP request
 * @param options - Parser options including encoding, limits, and strict mode
 *
 * @example
 * ```ts
 * const { parsed, raw } = await parseJSON(request, options)
 * // parsed: { username: 'virk', age: 28 }
 * // raw: '{"username":"virk","age":28}'
 * ```
 */
export async function parseJSON(
  req: IncomingMessage,
  options: ReturnType<typeof prepareJSONParserOptions>
) {
  const requestBody = await parseText(req, options)

  /**
   * Do not parse body when request body is empty
   */
  if (!requestBody) {
    return options.strict
      ? {
          parsed: {},
          raw: requestBody,
        }
      : {
          parsed: requestBody,
          raw: requestBody,
        }
  }

  /**
   * Test JSON body to ensure it is valid JSON in strict mode
   */
  if (options.strict && !strictJSONReg.test(requestBody)) {
    throw new Exception('Invalid JSON, only supports object and array', { status: 422 })
  }

  try {
    const parsed = safeParse(requestBody)
    processJSONValues(parsed, options)

    return {
      parsed,
      raw: requestBody,
    }
  } catch (error: any) {
    error.status = 400
    error.body = requestBody
    throw error
  }
}
