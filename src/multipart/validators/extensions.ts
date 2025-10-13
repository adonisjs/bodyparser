/*
 * @adonisjs/bodyparser
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { type MultipartFile } from '../file.ts'

/**
 * Validates the file extension against a list of allowed extensions
 */
export class ExtensionValidator {
  /**
   * Reference to the multipart file being validated
   */
  #file: MultipartFile

  /**
   * Array of allowed file extensions
   */
  #allowedExtensions?: string[] = []

  /**
   * Whether the file has been validated
   */
  validated: boolean = false

  /**
   * Update the expected file extensions
   */
  get extensions(): string[] | undefined {
    return this.#allowedExtensions
  }

  set extensions(extnames: string[] | undefined) {
    if (this.#allowedExtensions && this.#allowedExtensions.length) {
      throw new Error('Cannot update allowed extension names after file has been validated')
    }

    this.validated = false
    this.#allowedExtensions = extnames?.map((ext) => ext.toLowerCase())
  }

  /**
   * Creates a new ExtensionValidator instance
   *
   * @param file - The multipart file to validate
   */
  constructor(file: MultipartFile) {
    this.#file = file
  }

  /**
   * Report error to the file
   */
  #reportError() {
    /**
     * File is invalid, so report the error
     */
    const suffix = this.#allowedExtensions!.length === 1 ? 'is' : 'are'

    const message = [
      `Invalid file extension ${this.#file.extname?.toLowerCase()}.`,
      `Only ${this.#allowedExtensions!.join(', ')} ${suffix} allowed`,
    ].join(' ')

    this.#file.errors.push({
      fieldName: this.#file.fieldName,
      clientName: this.#file.clientName,
      message: message,
      type: 'extname',
    })
  }

  /**
   * Validating the file in the streaming mode. During this mode
   * we defer the validation, until we get the file extname.
   */
  #validateWhenGettingStreamed() {
    if (!this.#file.extname) {
      return
    }

    this.validated = true

    /**
     * Valid extension type
     */
    if (this.#allowedExtensions!.includes(this.#file.extname.toLowerCase())) {
      return
    }

    this.#reportError()
  }

  /**
   * Validate the file extension after it has been streamed
   */
  #validateAfterConsumed() {
    this.validated = true

    /**
     * Valid extension type
     */
    if (this.#allowedExtensions!.includes(this.#file.extname?.toLowerCase() || '')) {
      return
    }

    this.#reportError()
  }

  /**
   * Validate the file extension against allowed extensions
   */
  validate(): void {
    /**
     * Do not validate if already validated
     */
    if (this.validated) {
      return
    }

    /**
     * Do not run validations, when constraints on the extension are not set
     */
    if (!Array.isArray(this.#allowedExtensions) || this.#allowedExtensions.length === 0) {
      this.validated = true
      return
    }

    if (this.#file.state === 'streaming') {
      this.#validateWhenGettingStreamed()
      return
    }

    if (this.#file.state === 'consumed') {
      this.#validateAfterConsumed()
    }
  }
}
