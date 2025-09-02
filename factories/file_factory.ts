/*
 * @adonisjs/bodyparser
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { MultipartFile } from '../src/multipart/file.ts'
import { type FileValidationOptions } from '../src/types.ts'

/**
 * Parameters for configuring the file factory
 */
type FileFactoryParameters = {
  /** The form field name */
  fieldName: string
  /** The original filename from the client */
  clientName: string
  /** Headers associated with the file */
  headers: any
  /** Size of the file in bytes */
  size: number
  /** File extension */
  extname: string
  /** MIME type of the file */
  type: string
  /** MIME subtype */
  subtype: string
}

/**
 * File factory exposes the API to create fake multipart file instances
 * for testing purposes
 */
export class MultipartFileFactory {
  /**
   * Internal parameters for creating the file
   */
  #parameters: Partial<FileFactoryParameters> = {}

  /**
   * Merge additional factory parameters with existing ones
   *
   * @param params - Parameters to merge with existing factory parameters
   */
  merge(params: Partial<FileFactoryParameters>): this {
    this.#parameters = Object.assign(this.#parameters, params)
    return this
  }

  /**
   * Create an instance of multipart file with the configured parameters
   *
   * @param validationOptions - Optional validation options for the file
   */
  create(validationOptions?: Partial<FileValidationOptions>) {
    const file = new MultipartFile(
      {
        fieldName: this.#parameters.fieldName || 'file',
        clientName:
          this.#parameters.clientName || this.#parameters.extname
            ? `file.${this.#parameters.extname}`
            : 'file',
        headers: this.#parameters.headers || {},
      },
      validationOptions || {}
    )

    file.size = this.#parameters.size || 0
    file.extname = this.#parameters.extname
    file.type = this.#parameters.type
    file.subtype = this.#parameters.subtype
    file.state = 'consumed'

    file.validate()
    return file
  }
}
