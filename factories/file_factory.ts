/*
 * @adonisjs/bodyparser
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { MultipartFile } from '../src/multipart/file.js'
import { FileValidationOptions } from '../src/types.js'

type FileFactoryParameters = {
  fieldName: string
  clientName: string
  headers: any
  size: number
  extname: string
  type: string
  subtype: string
}

/**
 * File factory exposes the API to create fake multipart file instances
 * for testing
 */
export class MultipartFileFactory {
  #parameters: Partial<FileFactoryParameters> = {}

  /**
   * Merge factory params
   */
  merge(params: Partial<FileFactoryParameters>): this {
    this.#parameters = Object.assign(this.#parameters, params)
    return this
  }

  /**
   * Create an instance of multipart file
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
