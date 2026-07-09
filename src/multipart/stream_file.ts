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
 * Writes readable stream to the given location by properly cleaning up readable
 * and writable streams in case of any errors. Also an optional data listener
 * can listen for the `data` event.
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
