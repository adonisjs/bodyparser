/*
 * @adonisjs/bodyparser
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import eos from 'end-of-stream'
import { Readable } from 'node:stream'
import { createWriteStream } from 'node:fs'
import { open, unlink } from 'node:fs/promises'

/**
 * Writes readable stream to the given location by properly cleaning up readable
 * and writable streams in case of any errors. Also an optional data listener
 * can listen for the `data` event.
 */
export function streamFile(
  readStream: Readable,
  location: string,
  dataListener?: (line: Buffer) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    open(location, 'w')
      .then((fd) => {
        /**
         * Create write stream and reject promise on error
         * event
         */
        const writeStream = createWriteStream(location)
        writeStream.on('error', reject)

        /**
         * Handle closing of read stream from multiple sources
         */
        eos(readStream, (error?: Error | null) => {
          fd.close()

          /**
           * Resolve when their are no errors in
           * streaming
           */
          if (!error) {
            resolve()
            return
          }

          /**
           * Otherwise cleanup write stream
           */
          reject(error)

          process.nextTick(() => {
            writeStream.end()
            unlink(writeStream.path).catch(() => {})
          })
        })

        if (typeof dataListener === 'function') {
          readStream.pause()
          readStream.on('data', dataListener)
        }

        readStream.pipe(writeStream)
      })
      .catch(reject)
  })
}
