/*
 * @adonisjs/bodyparser
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../../adonis-typings/index.ts" />

import { extname } from 'path'
import { Exception } from '@poppinss/utils'
import { DriveManagerContract } from '@ioc:Adonis/Core/Drive'
import { MultipartStream, FileValidationOptions } from '@ioc:Adonis/Core/BodyParser'

import { File } from './File'
import { getFileType, supportMagicFileTypes } from '../utils'

/**
 * Part handler handles the progress of a stream and also internally validates
 * it's size and extension.
 *
 * This class offloads the task of validating a file stream, regardless of how
 * the stream is consumed. For example:
 *
 * In classic scanerio, we will process the file stream and write files to the
 * tmp directory and in more advanced cases, the end user can handle the
 * stream by themselves and report each chunk to this class.
 */
export class PartHandler {
  /**
   * The stream buffer reported by the stream consumer. We hold the buffer until are
   * able to detect the file extension and then buff memory is released
   */
  private buff?: Buffer

  /**
   * A boolean to know if we can use the magic number to detect the file type. This is how it
   * works.
   *
   * - We begin by extracting the file extension from the file name
   * - If the extension is something we support via magic numbers, then we ignore the extension
   * 	 and inspect the buffer
   * - Otherwise, we have no other option than to trust the extension
   *
   * Think of this as using the optimal way for validating the file type
   */
  private canFileTypeBeDetected = supportMagicFileTypes.includes(
    extname(this.part.filename).replace(/^\./, '')
  )

  /**
   * Creating a new file object for each part inside the multipart
   * form data
   */
  public file = new File(
    {
      clientName: this.part.filename,
      fieldName: this.part.name,
      headers: this.part.headers,
    },
    {
      size: this.options.size,
      extnames: this.options.extnames,
    },
    this.drive
  )

  /**
   * A boolean to know, if we have emitted the error event after one or
   * more validation errors. We need this flag, since the race conditions
   * between `data` and `error` events will trigger multiple `error`
   * emit.
   */
  private emittedValidationError = false

  constructor(
    private part: MultipartStream,
    private options: Partial<FileValidationOptions & { deferValidations: boolean }>,
    private drive: DriveManagerContract
  ) {}

  /**
   * Detects the file type and extension and also validates it when validations
   * are not deferred.
   */
  private async detectFileTypeAndExtension(force: boolean) {
    if (!this.buff) {
      return
    }

    const fileType = await getFileType(this.buff, this.file.clientName, this.file.headers, force)
    if (fileType) {
      this.file.extname = fileType.ext
      this.file.type = fileType.type
      this.file.subtype = fileType.subtype
    }
  }

  /**
   * Skip the stream or end it forcefully. This is invoked when the
   * streaming consumer reports an error
   */
  private skipEndStream() {
    this.part.emit('close')
  }

  /**
   * Finish the process of listening for any more events and mark the
   * file state as consumed.
   */
  private finish() {
    this.file.state = 'consumed'
    if (!this.options.deferValidations) {
      this.file.validate()
    }
  }

  /**
   * Start the process the updating the file state
   * to streaming mode.
   */
  public begin() {
    this.file.state = 'streaming'
  }

  /**
   * Handles the file upload progress by validating the file size and
   * extension.
   */
  public async reportProgress(line: Buffer, bufferLength: number) {
    /**
     * Do not consume stream data when file state is not `streaming`. Stream
     * events race conditions may emit the `data` event after the `error`
     * event in some cases, so we have to restrict it here.
     */
    if (this.file.state !== 'streaming') {
      return
    }

    /**
     * Detect the file type and extension when extname is null, otherwise
     * empty out the buffer. We only need the buffer to find the
     * file extension from it's content.
     */
    if (this.file.extname === undefined) {
      this.buff = this.buff ? Buffer.concat([this.buff, line]) : line
      await this.detectFileTypeAndExtension(false)
    } else {
      this.buff = undefined
    }

    /**
     * The length of stream buffer
     */
    this.file.size = this.file.size + bufferLength

    /**
     * Validate the file on every chunk, unless validations have been deferred.
     */
    if (this.options.deferValidations) {
      return
    }

    /**
     * Attempt to validate the file after every chunk and report error
     * when it has one or more failures. After this the consumer must
     * call `reportError`.
     */
    this.file.validate()
    if (!this.file.isValid && !this.emittedValidationError) {
      this.emittedValidationError = true
      this.part.emit(
        'error',
        new Exception('one or more validations failed', 400, 'E_STREAM_VALIDATION_FAILURE')
      )
    }
  }

  /**
   * Report errors encountered while processing the stream. These can be errors
   * apart from the one reported by this class. For example: The `s3` failure
   * due to some bad credentails.
   */
  public async reportError(error: any) {
    if (this.file.state !== 'streaming') {
      return
    }

    this.skipEndStream()
    this.finish()

    if (error.code === 'E_STREAM_VALIDATION_FAILURE') {
      return
    }

    /**
     * Push to the array of file errors
     */
    this.file.errors.push({
      fieldName: this.file.fieldName,
      clientName: this.file.clientName,
      type: 'fatal',
      message: error.message,
    })
  }

  /**
   * Report success data about the file.
   */
  public async reportSuccess(
    data?: { filePath?: string; tmpPath?: string } & { [key: string]: any }
  ) {
    if (this.file.state !== 'streaming') {
      return
    }

    /**
     * Re-attempt to detect the file extension after we are done
     * consuming the stream
     */
    if (this.file.extname === undefined) {
      await this.detectFileTypeAndExtension(this.canFileTypeBeDetected ? false : true)
    }

    if (data) {
      const { filePath, tmpPath, ...meta } = data
      if (filePath) {
        this.file.filePath = filePath
      }

      if (tmpPath) {
        this.file.tmpPath = tmpPath
      }

      this.file.meta = meta || {}
    }

    this.finish()
  }
}
