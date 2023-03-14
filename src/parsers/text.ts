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
import type { IncomingMessage } from 'node:http'
import { BodyParserRawConfig } from '../types.js'

/**
 * Inflates request body
 */
export function parseText(req: IncomingMessage, options: Partial<BodyParserRawConfig>) {
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
   * https://github.com/poppinss/co-body/blob/master/lib/text.js#L30
   */
  const contentLength = req.headers['content-length']
  const encoding = req.headers['content-encoding'] || 'identity'
  if (contentLength && encoding === 'identity') {
    normalizedOptions.length = ~~contentLength
  }

  return raw(inflate(req), normalizedOptions)
}
