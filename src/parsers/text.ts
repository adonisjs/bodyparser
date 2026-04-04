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

/**
 * Prepares parser options for raw text body parsing by applying defaults
 * for encoding and size limits.
 *
 * @param options - Raw body parser configuration
 */
export function prepareTextParserOptions(options: Partial<BodyParserRawConfig>): RawBodyOptions & {
  encoding: Encoding
} {
  return {
    encoding: options.encoding ?? 'utf8',
    limit: options.limit ?? '56kb',
  }
}

/**
 * Parses and inflates the raw request body as text. Automatically handles
 * compressed request bodies (gzip, deflate, etc.).
 *
 * @param req - The incoming HTTP request
 * @param options - Parser options including encoding and size limits
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
