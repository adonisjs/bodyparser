/*
 * @adonisjs/bodyparser
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import bytes from 'bytes'
import { MultipartFile } from '../file.js'

/**
 * Size validator validates the file size
 */
export class SizeValidator {
  #file: MultipartFile
  #maximumAllowedLimit?: number | string
  #bytesLimit: number = 0

  validated: boolean = false

  /**
   * Defining the maximum bytes the file can have
   */
  get maxLimit(): number | string | undefined {
    return this.#maximumAllowedLimit
  }
  set maxLimit(limit: number | string | undefined) {
    if (this.#maximumAllowedLimit !== undefined) {
      throw new Error('Cannot reset sizeLimit after file has been validated')
    }

    this.validated = false
    this.#maximumAllowedLimit = limit

    if (this.#maximumAllowedLimit) {
      this.#bytesLimit =
        typeof this.#maximumAllowedLimit === 'string'
          ? bytes(this.#maximumAllowedLimit)
          : this.#maximumAllowedLimit
    }
  }

  constructor(file: MultipartFile) {
    this.#file = file
  }

  /**
   * Reporting error to the file
   */
  #reportError() {
    this.#file.errors.push({
      fieldName: this.#file.fieldName,
      clientName: this.#file.clientName,
      message: `File size should be less than ${bytes(this.#bytesLimit)}`,
      type: 'size',
    })
  }

  /**
   * Validating file size while it is getting streamed. We only mark
   * the file as `validated` when it's validation fails. Otherwise
   * we keep re-validating the file as we receive more data.
   */
  #validateWhenGettingStreamed() {
    if (this.#file.size > this.#bytesLimit) {
      this.validated = true
      this.#reportError()
    }
  }

  /**
   * We have the final file size after the stream has been consumed. At this
   * stage we always mark `validated = true`.
   */
  #validateAfterConsumed() {
    this.validated = true
    if (this.#file.size > this.#bytesLimit) {
      this.#reportError()
    }
  }

  /**
   * Validate the file size
   */
  validate() {
    if (this.validated) {
      return
    }

    /**
     * Do not attempt to validate when `maximumAllowedLimit` is not
     * defined.
     */
    if (this.#maximumAllowedLimit === undefined) {
      this.validated = true
      return
    }

    if (this.#file.state === 'streaming') {
      this.#validateWhenGettingStreamed()
      return
    }

    if (this.#file.state === 'consumed') {
      this.#validateAfterConsumed()
      return
    }
  }
}
