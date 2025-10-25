/*
 * @adonisjs/bodyparser
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import inflate from 'inflation'
import type { IncomingMessage } from 'node:http'
import raw, { type Encoding, type Options as RawBodyOptions } from 'raw-body'

import { type BodyParserRawConfig } from '../types.ts'

export function prepareTextParserOptions(options: Partial<BodyParserRawConfig>): RawBodyOptions & {
  encoding: Encoding
} {
  return {
    encoding: options.encoding ?? 'utf8',
    limit: options.limit ?? '56kb',
    length: 0,
  }
}

/**
 * Inflates request body
 */
export function parseText(
  req: IncomingMessage,
  options: ReturnType<typeof prepareTextParserOptions>
) {
  /**
   * Mimicing behavior of
   * https://github.com/poppinss/co-body/blob/master/lib/text.js#L30
   */
  const contentLength = req.headers['content-length']
  const encoding = req.headers['content-encoding'] || 'identity'
  if (contentLength && encoding === 'identity') {
    options = { ...options, length: ~~contentLength }
  }

  return raw(inflate(req), options)
}
