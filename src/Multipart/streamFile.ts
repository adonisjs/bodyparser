/*
 * @adonisjs/bodyparser
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { promisify } from 'util'
import { unlink } from 'fs-extra'
import { createWriteStream } from 'fs'
import { Readable, pipeline } from 'stream'

const pump = promisify(pipeline)

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
    await pump(readStream, writeStream)
  } catch (error) {
    unlink(writeStream.path).catch(() => {})
    throw error
  }
}
