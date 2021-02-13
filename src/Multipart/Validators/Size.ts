/*
 * @adonisjs/bodyparser
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../../../adonis-typings/bodyparser.ts" />

import bytes from 'bytes'
import { MultipartFileContract } from '@ioc:Adonis/Core/BodyParser'

/**
 * Size validator validates the file size
 */
export class SizeValidator {
  private maximumAllowedLimit?: number | string
  private bytesLimit: number = 0

  public validated: boolean = false

  /**
   * Defining the maximum bytes the file can have
   */
  public get maxLimit(): number | string | undefined {
    return this.maximumAllowedLimit
  }
  public set maxLimit(limit: number | string | undefined) {
    if (this.maximumAllowedLimit !== undefined) {
      throw new Error('Cannot reset sizeLimit after file has been validated')
    }

    this.validated = false
    this.maximumAllowedLimit = limit

    if (this.maximumAllowedLimit) {
      this.bytesLimit =
        typeof this.maximumAllowedLimit === 'string'
          ? bytes(this.maximumAllowedLimit)
          : this.maximumAllowedLimit
    }
  }

  constructor(private file: MultipartFileContract) {}

  /**
   * Reporting error to the file
   */
  private reportError() {
    this.file.errors.push({
      fieldName: this.file.fieldName,
      clientName: this.file.clientName,
      message: `File size should be less than ${bytes(this.bytesLimit)}`,
      type: 'size',
    })
  }

  /**
   * Validating file size while it is getting streamed. We only mark
   * the file as `validated` when it's validation fails. Otherwise
   * we keep re-validating the file as we receive more data.
   */
  private validateWhenGettingStreamed() {
    if (this.file.size > this.bytesLimit) {
      this.validated = true
      this.reportError()
    }
  }

  /**
   * We have the final file size after the stream has been consumed. At this
   * stage we always mark `validated = true`.
   */
  private validateAfterConsumed() {
    this.validated = true
    if (this.file.size > this.bytesLimit) {
      this.reportError()
    }
  }

  /**
   * Validate the file size
   */
  public validate() {
    if (this.validated) {
      return
    }

    /**
     * Do not attempt to validate when `maximumAllowedLimit` is not
     * defined.
     */
    if (this.maximumAllowedLimit === undefined) {
      this.validated = true
      return
    }

    if (this.file.state === 'streaming') {
      this.validateWhenGettingStreamed()
      return
    }

    if (this.file.state === 'consumed') {
      this.validateAfterConsumed()
      return
    }
  }
}
