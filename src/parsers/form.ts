/*
 * @adonisjs/bodyparser
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { IncomingMessage } from 'node:http'
import qs, { type IParseOptions } from '@poppinss/qs'
import { type Encoding, type Options as RawBodyOptions } from 'raw-body'

import { formBodyNormalizers } from '../utils.ts'
import { type BodyParserFormConfig } from '../types.ts'
import { parseText, prepareTextParserOptions } from './text.ts'

/**
 * Prepares parser options for URL-encoded form data by configuring
 * query string parsing and value normalization.
 *
 * @param options - Form body parser configuration
 */
export function prepareFormParserOptions(
  options: Partial<BodyParserFormConfig>
): RawBodyOptions & { encoding: Encoding; qs: IParseOptions } {
  /**
   * Shallow clone query string options
   */
  const queryStringOptions: IParseOptions = { ...options.queryString }
  if (queryStringOptions.allowDots === undefined) {
    queryStringOptions.allowDots = true
  }

  let normalizer: undefined | ((value: string) => string | null)
  if (options.convertEmptyStringsToNull && options.trimWhitespaces) {
    normalizer = formBodyNormalizers.trimWhitespacesAndConvertToNull
  } else if (options.convertEmptyStringsToNull) {
    normalizer = formBodyNormalizers.convertToNull
  } else if (options.trimWhitespaces) {
    normalizer = formBodyNormalizers.trimWhitespaces
  }

  /**
   * Convert empty strings to null
   */
  if (normalizer) {
    queryStringOptions.decoder = function (str, defaultDecoder, charset, type) {
      let value = defaultDecoder(str, defaultDecoder, charset)
      if (type === 'value') {
        return normalizer(value)
      }
      return value
    }
  }

  /**
   * Shallow clone of provided options
   */
  return {
    ...prepareTextParserOptions(options),
    qs: queryStringOptions,
  }
}

/**
 * Parses URL-encoded form data (application/x-www-form-urlencoded) from
 * the request body and returns both parsed and raw representations.
 *
 * @param req - The incoming HTTP request
 * @param options - Parser options including encoding, limits, and query string config
 *
 * @example
 * ```ts
 * const { parsed, raw } = await parseForm(request, options)
 * // parsed: { username: 'virk', tags: ['node', 'typescript'] }
 * // raw: 'username=virk&tags=node&tags=typescript'
 * ```
 */
export async function parseForm(
  req: IncomingMessage,
  options: ReturnType<typeof prepareFormParserOptions>
) {
  const requestBody = await parseText(req, options)
  const parsed = qs.parse(requestBody, options.qs)
  return { parsed, raw: requestBody }
}
