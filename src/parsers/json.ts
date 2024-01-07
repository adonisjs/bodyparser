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
import json from '@poppinss/utils/json'
import { Exception } from '@poppinss/utils'
import type { IncomingMessage } from 'node:http'
import { BodyParserJSONConfig } from '../types.js'

/**
 * Allowed whitespace is defined in RFC 7159
 * http://www.rfc-editor.org/rfc/rfc7159.txt
 */
// eslint-disable-next-line no-control-regex
const strictJSONReg = /^[\x20\x09\x0a\x0d]*(\[|\{)/

/**
 * JSON reviver to convert empty strings to null
 */
function convertEmptyStringsToNull(key: string, value: any) {
  if (key === '') {
    return value
  }

  if (value === '') {
    return null
  }

  return value
}

/**
 * Parses JSON request body
 */
export async function parseJSON(req: IncomingMessage, options: Partial<BodyParserJSONConfig>) {
  /**
   * Shallow clone options
   */
  const normalizedOptions = Object.assign(
    {
      encoding: 'utf8',
      limit: '1mb',
      length: 0,
    },
    options
  )

  /**
   * Mimicing behavior of
   * https://github.com/poppinss/co-body/blob/master/lib/json.js#L47
   */
  const contentLength = req.headers['content-length']
  const encoding = req.headers['content-encoding'] || 'identity'
  if (contentLength && encoding === 'identity') {
    normalizedOptions.length = ~~contentLength
  }

  const strict = normalizedOptions.strict !== false
  const reviver = normalizedOptions.convertEmptyStringsToNull
    ? convertEmptyStringsToNull
    : undefined

  const requestBody = await raw(inflate(req), normalizedOptions)

  /**
   * Do not parse body when request body is empty
   */
  if (!requestBody) {
    return strict
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
  if (strict && !strictJSONReg.test(requestBody)) {
    throw new Exception('Invalid JSON, only supports object and array', { status: 422 })
  }

  try {
    return {
      parsed: json.safeParse(requestBody, reviver),
      raw: requestBody,
    }
  } catch (error) {
    error.status = 400
    error.body = requestBody
    throw error
  }
}
