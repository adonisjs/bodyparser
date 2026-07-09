/*
 * @adonisjs/bodyparser
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Transform, type Readable } from 'node:stream'
import { unlink } from 'node:fs/promises'
import { createWriteStream } from 'node:fs'
import { pipeline } from 'node:stream/promises'

/**
 * Streams a file from a readable stream to a file system location. Automatically
 * cleans up on errors and optionally reports data chunks to a listener.
 *
 * @param readStream - The source readable stream
 * @param location - The destination file path
 * @param dataListener - Optional callback to receive data chunks
 *
 * @example
 * ```ts
 * await streamFile(part, '/tmp/upload.jpg', (chunk) => {
 *   console.log('Received', chunk.length, 'bytes')
 * })
 * ```
 */
export async function streamFile(
  readStream: Readable,
  location: string,
  dataListener?: (line: Buffer) => void
): Promise<void> {
  const writeStream = createWriteStream(location)
  try {
    if (typeof dataListener === 'function') {
      await pipeline(
        readStream,
        new Transform({
          async transform(line: Buffer, _encoding, callback) {
            try {
              await dataListener(line)
              callback(null, line)
            } catch (error: any) {
              callback(error)
            }
          },
        }),
        writeStream
      )
      return
    }

    await pipeline(readStream, writeStream)
  } catch (error) {
    await unlink(writeStream.path).catch(() => {})
    throw error
  }
}
