/*
 * @adonisjs/bodyparser
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Readable } from 'node:stream'
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
  if (typeof dataListener === 'function') {
    readStream.pause()
    readStream.on('data', dataListener)
  }

  const writeStream = createWriteStream(location)
  try {
    await pipeline(readStream, writeStream)
  } catch (error) {
    unlink(writeStream.path).catch(() => {})
    throw error
  }
}
