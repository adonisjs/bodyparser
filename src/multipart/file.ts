/*
 * @adonisjs/bodyparser
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { move } from 'fs-extra'
import { join } from 'node:path'
import { Exception } from '@poppinss/utils'
import { Macroable } from '@poppinss/macroable'

import { SizeValidator } from './validators/size.js'
import { ExtensionValidator } from './validators/extensions.js'
import type { FileUploadError, FileValidationOptions } from '../types.js'

/**
 * The file holds the meta/data for an uploaded file, along with
 * an errors occurred during the upload process.
 */
export class MultipartFile extends Macroable {
  #sizeValidator = new SizeValidator(this)

  #extensionValidator = new ExtensionValidator(this)

  /**
   * A boolean to know if file is an instance of this class
   * or not
   */
  isMultipartFile: true = true

  /**
   * Field name is the name of the field
   */
  fieldName: string

  /**
   * Client name is the file name on the user client
   */
  clientName: string

  /**
   * The headers sent as part of the multipart request
   */
  headers: Record<string, any>

  /**
   * File size in bytes
   */
  size: number = 0

  /**
   * The extname for the file.
   */
  extname?: string

  /**
   * Upload errors
   */
  errors: FileUploadError[] = []

  /**
   * Type and subtype are extracted from the `content-type`
   * header or from the file magic number
   */
  type?: string
  subtype?: string

  /**
   * File path is only set after the move operation
   */
  filePath?: string

  /**
   * File name is only set after the move operation. It is the relative
   * path of the moved file
   */
  fileName?: string

  /**
   * Tmp path, only exists when file is uploaded using the
   * classic mode.
   */
  tmpPath?: string

  /**
   * The file meta data
   */
  meta: any = {}

  /**
   * The state of the file
   */
  state: 'idle' | 'streaming' | 'consumed' | 'moved' = 'idle'

  /**
   * Whether or not the validations have been executed
   */
  get validated(): boolean {
    return this.#sizeValidator.validated && this.#extensionValidator.validated
  }

  /**
   * A boolean to know if file has one or more errors
   */
  get isValid() {
    return this.errors.length === 0
  }

  /**
   * Opposite of [[this.isValid]]
   */
  get hasErrors() {
    return !this.isValid
  }

  /**
   * The maximum file size limit
   */
  get sizeLimit() {
    return this.#sizeValidator.maxLimit
  }

  set sizeLimit(limit: number | string | undefined) {
    this.#sizeValidator.maxLimit = limit
  }

  /**
   * Extensions allowed
   */
  get allowedExtensions() {
    return this.#extensionValidator.extensions
  }

  set allowedExtensions(extensions: string[] | undefined) {
    this.#extensionValidator.extensions = extensions
  }

  constructor(
    data: { fieldName: string; clientName: string; headers: any },
    validationOptions: Partial<FileValidationOptions>
  ) {
    super()
    this.sizeLimit = validationOptions.size
    this.allowedExtensions = validationOptions.extnames
    this.fieldName = data.fieldName
    this.clientName = data.clientName
    this.headers = data.headers
  }

  /**
   * Validate the file
   */
  validate() {
    this.#extensionValidator.validate()
    this.#sizeValidator.validate()
  }

  /**
   * Mark file as moved
   */
  markAsMoved(fileName: string, filePath: string) {
    this.filePath = filePath
    this.fileName = fileName
    this.state = 'moved'
  }

  /**
   * Moves the file to a given location. Multiple calls to the `move` method are allowed,
   * incase you want to move a file to multiple locations.
   */
  async move(location: string, options?: { name?: string; overwrite?: boolean }): Promise<void> {
    if (!this.tmpPath) {
      throw new Exception('property "tmpPath" must be set on the file before moving it', {
        status: 500,
        code: 'E_MISSING_FILE_TMP_PATH',
      })
    }

    options = Object.assign({ name: this.clientName, overwrite: true }, options)
    const filePath = join(location, options.name!)

    try {
      await move(this.tmpPath, filePath, { overwrite: options.overwrite! })
      this.markAsMoved(options.name!, filePath)
    } catch (error) {
      if (error.message.includes('dest already exists')) {
        throw new Exception(
          `"${options.name!}" already exists at "${location}". Set "overwrite = true" to overwrite it`
        )
      }
      throw error
    }
  }

  /**
   * Returns file JSON representation
   */
  toJSON() {
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
      errors: this.errors,
      meta: this.meta,
    }
  }
}
