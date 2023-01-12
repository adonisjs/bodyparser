/*
 * @adonisjs/bodyparser
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

// @ts-expect-error
import multiparty from '@poppinss/multiparty'

import bytes from 'bytes'
import { Exception } from '@poppinss/utils'
import type { HttpContext } from '@adonisjs/http-server'

import debug from '../debug.js'
import { FormFields } from '../form_fields.js'
import { PartHandler } from './part_handler.js'
import type {
  MultipartStream,
  FileValidationOptions,
  PartHandler as PartHandlerType,
} from '../types.js'

/**
 * Multipart class offers a low level API to interact the incoming
 * HTTP request data as a stream. This makes it super easy to
 * write files to s3 without saving them to the disk first.
 */
export class Multipart {
  #ctx: HttpContext
  #config: Partial<{
    limit: string | number
    fieldsLimit: string | number
    maxFields: number
    convertEmptyStringsToNull: boolean
  }>

  /**
   * The registered handlers to handle the file uploads
   */
  #handlers: {
    [key: string]: {
      handler: PartHandlerType
      options: Partial<FileValidationOptions & { deferValidations: boolean }>
    }
  } = {}

  /**
   * Collected fields from the multipart stream
   */
  #fields: FormFields

  /**
   * Collected files from the multipart stream. Files are only collected
   * when there is an attached listener for a given file.
   */
  #files: FormFields

  /**
   * We track the finishing of `this.onFile` async handlers
   * to make sure that `process` promise resolves for all
   * handlers to finish.
   */
  #pendingHandlers = 0

  /**
   * The reference to underlying multiparty form
   */
  #form: multiparty.Form

  /**
   * Total size limit of the multipart stream. If it goes beyond
   * the limit, then an exception will be raised.
   */
  #upperLimit?: number

  /**
   * Total size in bytes for all the fields (not the files)
   */
  #maxFieldsSize?: number

  /**
   * A track of total number of file bytes processed so far
   */
  #processedBytes: number = 0

  /**
   * The current state of the multipart form handler
   */
  state: 'idle' | 'processing' | 'error' | 'success' = 'idle'

  constructor(
    ctx: HttpContext,
    config: Partial<{
      limit: string | number
      fieldsLimit: string | number
      maxFields: number
      convertEmptyStringsToNull: boolean
    }> = {}
  ) {
    this.#ctx = ctx
    this.#config = config
    this.#fields = new FormFields({
      convertEmptyStringsToNull: this.#config.convertEmptyStringsToNull === true,
    })
    this.#files = new FormFields({
      convertEmptyStringsToNull: this.#config.convertEmptyStringsToNull === true,
    })
  }

  /**
   * Returns a boolean telling whether all streams have been
   * consumed along with all handlers execution
   */
  #isClosed(): boolean {
    return this.#form['flushing'] <= 0 && this.#pendingHandlers <= 0
  }

  /**
   * Removes array like expression from the part name to
   * find the handler
   */
  #getHandlerName(name: string): string {
    return name.replace(/\[\d*\]/, '')
  }

  /**
   * Validates and returns an error when upper limit is defined and
   * processed bytes is over the upper limit
   */
  #validateProcessedBytes(chunkLength: number) {
    if (!this.#upperLimit) {
      return
    }

    this.#processedBytes += chunkLength
    if (this.#processedBytes > this.#upperLimit) {
      return new Exception('request entity too large', {
        code: 'E_REQUEST_ENTITY_TOO_LARGE',
        status: 413,
      })
    }
  }

  /**
   * Handles a given part by invoking it's handler or
   * by resuming the part, if there is no defined
   * handler
   */
  async #handlePart(part: MultipartStream) {
    /**
     * Skip parts with empty name or empty filenames. The empty
     * filenames takes place when user doesn't upload a file
     * and empty name is more of a bad client scanerio.
     */
    if (!part.name || !part.filename) {
      part.resume()
      return
    }

    const name = this.#getHandlerName(part.name)

    /**
     * Skip, if their is no handler to consume the part.
     */
    const handler = this.#handlers[name] || this.#handlers['*']
    if (!handler) {
      debug('skipping multipart part as there are no handlers "%s"', name)
      part.resume()
      return
    }

    debug('processing multipart part "%s"', name)
    this.#pendingHandlers++

    /**
     * Instantiate the part handler
     */
    const partHandler = new PartHandler(part, handler.options)
    partHandler.begin()

    /**
     * Track the file instance created by the part handler. The end user
     * must be able to access these files.
     */
    this.#files.add(partHandler.file.fieldName, partHandler.file)
    part.file = partHandler.file

    try {
      const response = await handler.handler(part, async (line) => {
        if (this.state !== 'processing') {
          return
        }

        const lineLength = line.length

        /**
         * Keeping an eye on total bytes processed so far and shortcircuit
         * request when more than expected bytes have been received.
         */
        const error = this.#validateProcessedBytes(lineLength)
        if (error) {
          part.emit('error', error)
          this.abort(error)
          return
        }

        try {
          await partHandler.reportProgress(line, lineLength)
        } catch (err) {
          this.#ctx.logger.fatal(
            'Unhandled multipart stream error. Make sure to handle "error" events for all manually processed streams'
          )
        }
      })

      /**
       * Stream consumed successfully
       */
      await partHandler.reportSuccess(response || {})
    } catch (error) {
      /**
       * The stream handler reported an exception
       */
      await partHandler.reportError(error)
    }

    this.#pendingHandlers--
  }

  /**
   * Record the fields inside multipart contract
   */
  #handleField(key: string, value: string) {
    if (!key) {
      return
    }

    this.#fields.add(key, value)
  }

  /**
   * Processes the user config and computes the `upperLimit` value from
   * it.
   */
  #processConfig(config?: Partial<{ limit: string | number; maxFields: number }>) {
    this.#config = Object.assign(this.#config, config)

    /**
     * Getting bytes from the `config.fieldsLimit` option, which can
     * also be a string.
     */
    this.#maxFieldsSize =
      typeof this.#config!.fieldsLimit === 'string'
        ? bytes(this.#config.fieldsLimit)
        : this.#config!.fieldsLimit

    /**
     * Getting bytes from the `config.limit` option, which can
     * also be a string
     */
    this.#upperLimit =
      typeof this.#config!.limit === 'string' ? bytes(this.#config!.limit) : this.#config!.limit
  }

  /**
   * Mark the process as finished
   */
  #finish(newState: 'error' | 'success') {
    if (this.state === 'idle' || this.state === 'processing') {
      this.state = newState
      ;(this.#ctx.request as any)['__raw_files'] = this.#files.get()
      this.#ctx.request.setInitialBody(this.#fields.get())
    }
  }

  /**
   * Attach handler for a given file. To handle all files, you
   * can attach a wildcard handler.
   *
   * @example
   * ```ts
   * multipart.onFile('package', {}, async (stream) => {
   * })
   *
   * multipart.onFile('*', {}, async (stream) => {
   * })
   * ```
   */
  onFile(
    name: string,
    options: Partial<FileValidationOptions & { deferValidations: boolean }>,
    handler: PartHandlerType
  ): this {
    this.#handlers[name] = { handler, options }
    return this
  }

  /**
   * Abort request by emitting error
   */
  abort(error: any): void {
    this.#form.emit('error', error)
  }

  /**
   * Process the request by going all the file and field
   * streams.
   */
  process(config?: Partial<{ limit: string | number; maxFields: number }>): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.state !== 'idle') {
        reject(
          new Exception('multipart stream has already been consumed', {
            code: 'E_RUNTIME_EXCEPTION',
          })
        )
        return
      }

      this.state = 'processing'
      this.#processConfig(config)

      this.#form = new multiparty.Form({
        maxFields: this.#config!.maxFields,
        maxFieldsSize: this.#maxFieldsSize,
      })

      debug('processing multipart body')

      /**
       * Raise error when form encounters an
       * error
       */
      this.#form.on('error', (error: Error) => {
        this.#finish('error')

        process.nextTick(() => {
          if (this.#ctx.request.request.readable) {
            this.#ctx.request.request.resume()
          }

          if (error.message.match(/maxFields [0-9]+ exceeded/)) {
            reject(
              new Exception('Fields length limit exceeded', {
                status: 413,
                code: 'E_REQUEST_ENTITY_TOO_LARGE',
              })
            )
          } else if (error.message.match(/maxFieldsSize [0-9]+ exceeded/)) {
            reject(
              new Exception('Fields size in bytes exceeded', {
                status: 413,
                code: 'E_REQUEST_ENTITY_TOO_LARGE',
              })
            )
          } else {
            reject(error)
          }
        })
      })

      /**
       * Process each part at a time and also resolve the
       * promise when all parts are consumed and processed
       * by their handlers
       */
      this.#form.on('part', async (part: MultipartStream) => {
        await this.#handlePart(part)

        /**
         * When a stream finishes before the handler, the close `event`
         * will not resolve the current Promise. So in that case, we
         * check and resolve from here
         */
        if (this.#isClosed()) {
          this.#finish('success')
          resolve()
        }
      })

      /**
       * Listen for fields
       */
      this.#form.on('field', (key: string, value: any) => {
        try {
          this.#handleField(key, value)
        } catch (error) {
          this.abort(error)
        }
      })

      /**
       * Resolve promise on close, when all internal
       * file handlers are done processing files
       */
      this.#form.on('close', () => {
        if (this.#isClosed()) {
          this.#finish('success')
          resolve()
        }
      })

      this.#form.parse(this.#ctx.request.request)
    })
  }
}
