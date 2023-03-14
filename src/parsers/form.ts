/*
 * @adonisjs/bodyparser
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import raw from 'raw-body'
import inflate from 'inflation'
import qs, { IParseOptions } from 'qs'
import type { IncomingMessage } from 'node:http'
import { BodyParserFormConfig } from '../types.js'

/**
 * Parse x-www-form-urlencoded request body
 */
export async function parseForm(req: IncomingMessage, options: Partial<BodyParserFormConfig>) {
  /**
   * Shallow clone options
   */
  const normalizedOptions = Object.assign(
    {
      encoding: 'utf8',
      limit: '56kb',
      length: 0,
    },
    options
  )

  /**
   * Shallow clone query string options
   */
  const queryStringOptions: IParseOptions = Object.assign({}, normalizedOptions.queryString)

  /**
   * Mimicing behavior of
   * https://github.com/poppinss/co-body/blob/master/lib/form.js#L30
   */
  if (queryStringOptions.allowDots === undefined) {
    queryStringOptions.allowDots = true
  }

  /**
   * Mimicing behavior of
   * https://github.com/poppinss/co-body/blob/master/lib/form.js#L35
   */
  const contentLength = req.headers['content-length']
  const encoding = req.headers['content-encoding'] || 'identity'
  if (contentLength && encoding === 'identity') {
    normalizedOptions.length = ~~contentLength
  }

  /**
   * Convert empty strings to null
   */
  if (normalizedOptions.convertEmptyStringsToNull) {
    queryStringOptions.decoder = function (str, defaultDecoder, charset, type) {
      const value = defaultDecoder(str, defaultDecoder, charset)
      if (type === 'value' && value === '') {
        return null
      }
      return value
    }
  }

  const requestBody = await raw(inflate(req), normalizedOptions)
  try {
    const parsed = qs.parse(requestBody, queryStringOptions)
    return { parsed, raw: requestBody }
  } catch (error) {
    error.status = 400
    error.body = requestBody
    throw error
  }
}
