/*
* @adonisjs/bodyparser
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

/// <reference path="../../adonis-typings/bodyparser.ts" />

import { join } from 'path'
import { outputFile } from 'fs-extra'
import { Exception } from '@poppinss/utils'

import {
  FileInputNode,
  FileUploadError,
  FileValidationOptions,
  MultipartFileContract,
} from '@ioc:Adonis/Core/BodyParser'

import { validateExtension, validateSize } from '../utils'

/**
 * The file holds the meta/data for an uploaded file, along with
 * an errors occurred during the upload process.
 */
export class File implements MultipartFileContract {
  /**
   * In the streaming mode, the part handler will brute force the `validate` method
   * as it attempts to re-run the validations after each chunk. So to avoid
   * duplicate validation errors, we need to track their state
   */
  private didSizeValidationFailed = false
  private didExtensionValidationFailed = false

  /**
   * Field name is the name of the field
   */
  public fieldName = this.data.fieldName

  /**
   * Client name is the file name on the user client
   */
  public clientName = this.data.clientName

  /**
   * The headers sent as part of the multipart request
   */
  public headers = this.data.headers

  /**
   * File size in bytes
   */
  public size: number = 0

  /**
   * The extname for the file.
   */
  public extname?: string

  /**
   * Upload errors
   */
  public errors: FileUploadError[] = []

  /**
   * Type and subtype are extracted from the `content-type`
   * header or from the file magic number
   */
  public type?: string
  public subtype?: string

  /**
   * File path is only set after the move operation
   */
  public filePath?: string

  /**
   * Tmp path, only exists when file is uploaded using the
   * classic mode.
   */
  public tmpPath?: string

  /**
   * The file meta data
   */
  public meta: any = {}

  /**
   * The state of the file
   */
  public state: 'idle' | 'streaming' | 'consumed' | 'moved' = 'idle'

  /**
   * Whether or not the validations have been executed
   */
  public validated = false

  /**
   * A boolean to know if file has one or more errors
   */
  public get isValid () {
    return this.errors.length === 0
  }

  constructor (private data: FileInputNode, public validationOptions: Partial<FileValidationOptions>) {
  }

  /**
   * Validates the size. Calling this method multiple times may
   * push the same error to the errors array
   */
  private validateSize () {
    if (this.didSizeValidationFailed) {
      return
    }

    const error = validateSize(this.fieldName, this.clientName, this.size, this.validationOptions.size)
    if (error) {
      this.didSizeValidationFailed = true
      this.errors.push(error)
    }
  }

  /**
   * Validates the file extension. Calling this method multiple times may
   * push the same error to the errors array
   */
  private validateExtension () {
    if (this.didExtensionValidationFailed) {
      return
    }

    const error = validateExtension(this.fieldName, this.clientName, this.extname!, this.validationOptions.extnames)
    if (error) {
      this.didExtensionValidationFailed = true
      this.errors.push(error)
    }
  }

  public validate () {
    /**
     * In stream mode, validate the extension only when we have been able
     * to detect the extension and validate size everytime.
     *
     * It is responsiblity of the consumer to end the stream once one of the
     * validations has failed and not re-call this method.
     */
    if (this.state === 'streaming') {
      if (this.extname) {
        this.validateExtension()
      }
      this.validateSize()
      return
    }

    /**
     * Do not validate file when it's validated or the state is not consumed
     */
    if (this.state === 'consumed' && !this.validated) {
      this.validated = true
      this.extname = this.extname || ''
      this.validateExtension()
      this.validateSize()
    }
  }

  /**
   * Moves the file to a given location. Multiple calls to the `move` method are allowed,
   * incase you want to move a file to multiple locations.
   */
  public async move (location: string, options?: { name?: string, overwrite?: boolean }): Promise<void> {
    if (!this.tmpPath) {
      throw new Exception('tmpPath must be set on the file before moving it', 500, 'E_MISSING_FILE_TMP_PATH')
    }

    options = Object.assign({ name: this.clientName, overwrite: false }, options)

    this.filePath = join(location, options!.name!)
    this.state = 'moved'
    await outputFile(this.filePath, { overwrite: options!.overwrite! })
  }
}
