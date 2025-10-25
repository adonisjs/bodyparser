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

export function prepareJSONParserOptions(options: Partial<BodyParserJSONConfig>): RawBodyOptions & {
  encoding: Encoding
  strict: boolean
  reviver?: (this: any, key: string, value: any) => any
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
    reviver: normalizer
      ? function JSONReviver(key, value) {
          if (key === '') {
            return value
          }
          return typeof value === 'string' ? normalizer(value) : value
        }
      : undefined,
  }
}

/**
 * Parses JSON request body
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
    return {
      parsed: safeParse(requestBody, options.reviver),
      raw: requestBody,
    }
  } catch (error) {
    error.status = 400
    error.body = requestBody
    throw error
  }
}
