/*
 * @adonisjs/bodyparser
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { join } from 'node:path'
import Macroable from '@poppinss/macroable'
import { Exception } from '@poppinss/utils/exception'

import { moveFile } from '../utils.ts'
import { SizeValidator } from './validators/size.ts'
import { ExtensionValidator } from './validators/extensions.ts'
import type { FileJSON, FileUploadError, FileValidationOptions } from '../types.ts'

/**
 * The file holds the meta/data for an uploaded file, along with
 * any errors that occurred during the upload process.
 */
export class MultipartFile extends Macroable {
  /**
   * File validators for size and extension validation
   */
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
   * The extension for the file
   */
  extname?: string

  /**
   * Upload errors that occurred during processing
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
   * Temporary path, only exists when file is uploaded using the
   * classic mode
   */
  tmpPath?: string

  /**
   * The file metadata
   */
  meta: any = {}

  /**
   * The current state of the file
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

  /**
   * Creates a new MultipartFile instance
   *
   * @param data - Object containing field name, client name, and headers
   * @param validationOptions - Validation options for the file
   */
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
   * Validate the file using configured validators
   */
  validate() {
    this.#extensionValidator.validate()
    this.#sizeValidator.validate()
  }

  /**
   * Mark file as moved to its final destination
   *
   * @param fileName - The name of the moved file
   * @param filePath - The full path where the file was moved
   */
  markAsMoved(fileName: string, filePath: string) {
    this.filePath = filePath
    this.fileName = fileName
    this.state = 'moved'
  }

  /**
   * Moves the file to a given location. Multiple calls to the `move` method are allowed,
   * in case you want to move a file to multiple locations.
   *
   * @param location - The destination directory
   * @param options - Move options including name and overwrite flag
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
      await moveFile(this.tmpPath, filePath, { overwrite: options.overwrite! })
      this.markAsMoved(options.name!, filePath)
    } catch (error) {
      if (error.message.includes('destination file already')) {
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
  toJSON(): FileJSON {
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
