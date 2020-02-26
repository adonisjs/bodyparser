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
import { move } from 'fs-extra'
import { Exception } from '@poppinss/utils'

import {
  FileUploadError,
  FileValidationOptions,
  MultipartFileContract,
} from '@ioc:Adonis/Core/BodyParser'

import { SizeValidator } from './Validators/Size'
import { ExtensionValidator } from './Validators/Extensions'

/**
 * The file holds the meta/data for an uploaded file, along with
 * an errors occurred during the upload process.
 */
export class File implements MultipartFileContract {
  private sizeValidator = new SizeValidator(this)
  private extensionValidator = new ExtensionValidator(this)

  /**
   * A boolean to know if file is an instance of this class
   * or not
   */
  public isMultipartFile: true = true

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
   * File name is only set after the move operation. It is the relative
   * path of the moved file
   */
  public fileName?: string

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
  public get validated (): boolean {
    return this.sizeValidator.validated && this.extensionValidator.validated
  }

  /**
   * A boolean to know if file has one or more errors
   */
  public get isValid () {
    return this.errors.length === 0
  }

  /**
   * Opposite of [[this.isValid]]
   */
  public get hasErrors () {
    return !this.isValid
  }

  /**
   * The maximum file size limit
   */
  public get sizeLimit () {
    return this.sizeValidator.maxLimit
  }
  public set sizeLimit (limit: number | string | undefined) {
    this.sizeValidator.maxLimit = limit
  }

  /**
   * Extensions allowed
   */
  public get allowedExtensions () {
    return this.extensionValidator.extensions
  }
  public set allowedExtensions (extensions: string[] | undefined) {
    this.extensionValidator.extensions = extensions
  }

  constructor (
    private data: { fieldName: string, clientName: string, headers: any },
    validationOptions: Partial<FileValidationOptions>,
  ) {
    this.sizeLimit = validationOptions.size
    this.allowedExtensions = validationOptions.extnames
  }

  /**
   * Validate the file
   */
  public validate () {
    this.extensionValidator.validate()
    this.sizeValidator.validate()
  }

  /**
   * Moves the file to a given location. Multiple calls to the `move` method are allowed,
   * incase you want to move a file to multiple locations.
   */
  public async move (location: string, options?: { name?: string, overwrite?: boolean }): Promise<void> {
    if (!this.tmpPath) {
      throw new Exception('tmpPath must be set on the file before moving it', 500, 'E_MISSING_FILE_TMP_PATH')
    }

    options = Object.assign({ name: this.clientName, overwrite: true }, options)
    const filePath = join(location, options.name!)

    try {
      await move(this.tmpPath, filePath, { overwrite: options.overwrite! })
      this.filePath = filePath
      this.fileName = options.name!
      this.state = 'moved'
    } catch (error) {
      if (error.message.includes('dest already exists')) {
        throw new Error(`"${options.name!}" already exists at "${location}". Set "overwrite = true" to overwrite it`)
      }
      throw error
    }
  }

  /**
   * Returns file JSON representation
   */
  public toJSON () {
    return {
      fieldName: this.fieldName,
      clientName: this.clientName,
      size: this.size,
      filePath: this.filePath,
      fileName: this.fileName,
      type: this.type,
      extname: this.extname,
      subtype: this.subtype,
      state: this.state,
      isValid: this.isValid,
      validated: this.validated,
    }
  }
}
