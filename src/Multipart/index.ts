/*
 * @adonisjs/bodyparser
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../../adonis-typings/bodyparser.ts" />

import bytes from 'bytes'
import multiparty from 'multiparty'
import { Exception } from '@poppinss/utils'
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

import {
  MultipartStream,
  MultipartContract,
  PartHandler as PartHandlerType,
} from '@ioc:Adonis/Core/BodyParser'

import { FormFields } from '../FormFields'
import { PartHandler } from './PartHandler'

/**
 * Multipart class offers a low level API to interact the incoming
 * HTTP request data as a stream. This makes it super easy to
 * write files to s3 without saving them to the disk first.
 */
export class Multipart implements MultipartContract {
  /**
   * The registered handlers to handle the file uploads
   */
  private handlers: {
    [key: string]: {
      handler: PartHandlerType
      options: Parameters<MultipartContract['onFile']>[1]
    }
  } = {}

  /**
   * Collected fields from the multipart stream
   */
  private fields = new FormFields()

  /**
   * Collected files from the multipart stream. Files are only collected
   * when there is an attached listener for a given file.
   */
  private files = new FormFields()

  /**
   * We track the finishing of `this.onFile` async handlers
   * to make sure that `process` promise resolves for all
   * handlers to finish.
   */
  private pendingHandlers = 0

  /**
   * The reference to underlying multiparty form
   */
  private form: multiparty.Form

  /**
   * Total size limit of the multipart stream. If it goes beyond
   * this limit, then an exception will be raised.
   */
  private upperLimit?: number

  /**
   * A track of total number of file bytes processed so far
   */
  private processedBytes: number = 0

  /**
   * The current state of the multipart form handler
   */
  public state: 'idle' | 'processing' | 'error' | 'success' = 'idle'

  constructor(
    private ctx: HttpContextContract,
    private config: Partial<{ limit: string | number; maxFields: number }> = {}
  ) {}

  /**
   * Returns a boolean telling whether all streams have been
   * consumed along with all handlers execution
   */
  private isClosed(): boolean {
    return this.form['flushing'] <= 0 && this.pendingHandlers <= 0
  }

  /**
   * Removes array like expression from the part name to
   * find the handler
   */
  private getHandlerName(name: string): string {
    return name.replace(/\[\d*\]/, '')
  }

  /**
   * Validates and returns an error when upper limit is defined and
   * processed bytes is over the upper limit
   */
  private validateProcessedBytes(chunkLength: number) {
    if (!this.upperLimit) {
      return
    }

    this.processedBytes += chunkLength
    if (this.processedBytes > this.upperLimit) {
      return new Exception('request entity too large', 413, 'E_REQUEST_ENTITY_TOO_LARGE')
    }
  }

  /**
   * Handles a given part by invoking it's handler or
   * by resuming the part, if there is no defined
   * handler
   */
  private async handlePart(part: MultipartStream) {
    /**
     * Skip parts with empty name or empty filenames. The empty
     * filenames takes place when user doesn't upload a file
     * and empty name is more of a bad client scanerio.
     */
    if (!part.name || !part.filename) {
      part.resume()
      return
    }

    const name = this.getHandlerName(part.name)

    /**
     * Skip, if their is no handler to consume the part.
     */
    const handler = this.handlers[name] || this.handlers['*']
    if (!handler) {
      part.resume()
      return
    }

    this.pendingHandlers++

    /**
     * Instantiate the part handler
     */
    const partHandler = new PartHandler(part, handler.options)
    partHandler.begin()

    /**
     * Track the file instance created by the part handler. The end user
     * must be able to access these files.
     */
    this.files.add(partHandler.file.fieldName, partHandler.file)
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
        const error = this.validateProcessedBytes(lineLength)
        if (error) {
          part.emit('error', error)
          this.abort(error)
          return
        }

        try {
          await partHandler.reportProgress(line, lineLength)
        } catch (err) {
          this.ctx.logger.fatal(
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

    this.pendingHandlers--
  }

  /**
   * Record the fields inside multipart contract
   */
  private handleField(key: string, value: string) {
    if (!key) {
      return
    }

    const error = this.validateProcessedBytes(value.length)
    if (error) {
      this.abort(error)
    } else {
      this.fields.add(key, value)
    }
  }

  /**
   * Processes the user config and computes the `upperLimit` value from
   * it.
   */
  private processConfig(config?: Parameters<MultipartContract['process']>[0]) {
    this.config = Object.assign(this.config, config)

    /**
     * Getting bytes from the `config.limit` option, which can
     * also be a string
     */
    this.upperLimit =
      typeof this.config!.limit === 'string' ? bytes(this.config!.limit) : this.config!.limit
  }

  /**
   * Mark the process as finished
   */
  private finish(newState: 'error' | 'success') {
    if (this.state === 'idle' || this.state === 'processing') {
      this.state = newState
      this.ctx.request['__raw_files'] = this.files.get()
      this.ctx.request.setInitialBody(this.fields.get())
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
  public onFile(
    name: string,
    options: Parameters<MultipartContract['onFile']>[1],
    handler: PartHandlerType
  ): this {
    this.handlers[name] = { handler, options }
    return this
  }

  /**
   * Abort request by emitting error
   */
  public abort(error: any): void {
    this.form.emit('error', error)
  }

  /**
   * Process the request by going all the file and field
   * streams.
   */
  public process(config?: Parameters<MultipartContract['process']>[0]): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.state !== 'idle') {
        reject(
          new Exception('multipart stream has already been consumed', 500, 'E_RUNTIME_EXCEPTION')
        )
        return
      }

      this.state = 'processing'
      this.processConfig(config)

      this.form = new multiparty.Form({ maxFields: this.config!.maxFields })

      /**
       * Raise error when form encounters an
       * error
       */
      this.form.on('error', (error: Error) => {
        this.finish('error')

        process.nextTick(() => {
          if (this.ctx.request.request.readable) {
            this.ctx.request.request.resume()
          }

          if (error.message === 'maxFields 1 exceeded.') {
            reject(new Exception('Max fields limit exceeded', 413, 'E_REQUEST_ENTITY_TOO_LARGE'))
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
      this.form.on('part', async (part: MultipartStream) => {
        await this.handlePart(part)

        /**
         * When a stream finishes before the handler, the close `event`
         * will not resolve the current Promise. So in that case, we
         * check and resolve from here
         */
        if (this.isClosed()) {
          this.finish('success')
          resolve()
        }
      })

      /**
       * Listen for fields
       */
      this.form.on('field', (key: string, value: any) => {
        try {
          this.handleField(key, value)
        } catch (error) {
          this.abort(error)
        }
      })

      /**
       * Resolve promise on close, when all internal
       * file handlers are done processing files
       */
      this.form.on('close', () => {
        if (this.isClosed()) {
          this.finish('success')
          resolve()
        }
      })

      this.form.parse(this.ctx.request.request)
    })
  }
}
