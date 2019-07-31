/*
* @adonisjs/bodyparser
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

/// <reference path="../../adonis-typings/bodyparser.ts" />

import { Exception } from '@poppinss/utils'
import { validateExtension, validateSize, getFileType } from '../utils'

import {
  MultipartStream,
  FileValidationOptions,
  FileUploadError,
} from '@ioc:Adonis/Addons/BodyParser'

import { File } from './File'

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
  private _buff: Buffer
  private _bufferLength: number = 0
  private _fileType: ReturnType<typeof getFileType>

  private _fieldName = this._part.name
  private _clientName = this._part.filename
  private _headers = this._part.headers

  private _sizeValidated = false
  private _extValidated = false

  /**
   * Collected errors
   */
  private _errors: FileUploadError[] = []

  /**
   * The data that we want to forward to the file after successfully
   * handling it's upload
   */
  private _postProcessFileData: any = {}

  constructor (
    private _part: MultipartStream,
    private _options: Partial<FileValidationOptions & { deferValidations: boolean }>,
  ) {}

  /**
   * Validates the file size when validations are not deferred.
   */
  private _validateSize () {
    /**
     * Do not revalidate for size, when an error for size
     * already exists
     */
    if (this._sizeValidated) {
      return
    }

    const error = validateSize(this._fieldName, this._clientName, this._bufferLength, this._options.size)
    if (error) {
      this._sizeValidated = true
      this._errors.push(error)
    }
  }

  /**
   * Validates the file extension when validation is not
   * deferred and file type has been detected.
   */
  private _validateExtension () {
    /**
     * Do not re-validate file type or ext when we are unable to detect the
     * filetype or error for file ext already exists
     */
    if (this._extValidated || !this._fileType) {
      return
    }

    const error = validateExtension(
      this._fieldName,
      this._clientName,
      this._fileType.ext,
      this._options.extnames,
    )

    if (error) {
      this._extValidated = true
      this._errors.push(error)
    }
  }

  /**
   * Detects the file type and extension and also validates it when validations
   * are not deferred.
   */
  private _detectFileTypeAndExtension (force: boolean) {
    if (!this._fileType) {
      this._fileType = getFileType(this._buff, this._clientName, this._headers, force)
    }

    if (!this._options.deferValidations) {
      this._validateExtension()
    }
  }

  /**
   * Returns the file instance only when the progress of
   * the file has been reported atleast once.
   */
  public getFile (): File | null {
    if (!this._buff) {
      return null
    }

    /**
     * If we failed to pull the file type earlier, then lets make
     * another attempt.
     */
    this._detectFileTypeAndExtension(true)

    const { filePath, tmpPath, ...meta } = this._postProcessFileData

    /**
     * Create a new file instance
     */
    const file = new File({
      clientName: this._part.filename,
      fieldName: this._part.name,
      bytes: this._bufferLength,
      headers: this._part.headers,
      fileType: this._fileType!,
      filePath: filePath,
      tmpPath: tmpPath,
      meta: meta,
    })

    /**
     * Set file errors, if we have encountered any
     */
    if (this._errors.length) {
      file.errors = this._errors
    }

    /**
     * Mark file as being already validated, when the validations have
     * not been deferred
     */
    if (!this._options.deferValidations) {
      file.validated = true
    }

    return file
  }

  /**
   * Handles the file upload progress by validating the file size and
   * extension.
   */
  public reportProgress (line: Buffer, bufferLength: number) {
    this._buff = this._buff ? Buffer.concat([this._buff, line]) : line
    this._bufferLength = this._bufferLength + bufferLength

    /**
     * Do not compute file type, ext or validate anything, when
     * validations are deferred
     */
    if (this._options.deferValidations) {
      return
    }

    /**
     * Attempt to validate the file size with every chunk of line
     */
    this._validateSize()

    /**
     * Attempt to find the file type unless we are able to figure it out
     */
    this._detectFileTypeAndExtension(false)

    /**
     * We need to emit the error, to shortcircuit the writable stream. Their will be
     * more than one error only when `deferValidations=false` and size of ext
     * checks were failed.
     */
    if (this._errors.length) {
      this._part.emit(
        'error',
        new Exception('stream validation failed', 413, 'E_STREAM_VALIDATION_FAILURE'),
      )
    }
  }

  /**
   * Report errors encountered while processing the stream. These can be errors
   * apart from the one reported by this class. For example: The `s3` failure
   * due to some bad credentails.
   */
  public reportError (error: any) {
    /**
     * End the stream when an error has been encountered. We do not do it while emitting the
     * validation errors, since we want the end user to decide, if they want to stop
     * streaming or not, since many streaming API's doesn't offer abort feature.
     */
    this._part.emit('end')

    /**
     * Ignore self errors
     */
    if (error.code && error.code === 'E_STREAM_VALIDATION_FAILURE') {
      return
    }

    this._errors.push({
      fieldName: this._fieldName,
      clientName: this._clientName,
      type: 'fatal',
      message: error.message,
    })
  }

  /**
   * Report success data about the file.
   */
  public reportSuccess (data?: { filePath?: string, tmpPath?: string } & { [key: string]: any }) {
    this._postProcessFileData = data || {}
  }
}
