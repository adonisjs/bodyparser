/*
* @adonisjs/bodyparser
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

/// <reference path="../../../adonis-typings/bodyparser.ts" />

import { MultipartFileContract } from '@ioc:Adonis/Core/BodyParser'

/**
 * Validates the file extension
 */
export class ExtensionValidator {
  private allowedExtensions?: string[] = []
  public validated: boolean = false

  /**
   * Update the expected file extensions
   */
  public get extensions (): string[] | undefined {
    return this.allowedExtensions
  }
  public set extensions (extnames: string[] | undefined) {
    if (this.allowedExtensions && this.allowedExtensions.length) {
      throw new Error('Cannot update allowed extension names after file has been validated')
    }

    this.validated = false
    this.allowedExtensions = extnames
  }

  constructor (private file: MultipartFileContract) {}

  /**
   * Report error to the file
   */
  private reportError () {
    /**
     * File is invalid, so report the error
     */
    const suffix = this.allowedExtensions!.length === 1 ? 'is' : 'are'
    const message = [
      `Invalid file extension ${this.file.extname}.`,
      `Only ${this.allowedExtensions!.join(', ')} ${suffix} allowed`,
    ].join(' ')

    this.file.errors.push({
      fieldName: this.file.fieldName,
      clientName: this.file.clientName,
      message: message,
      type: 'extname',
    })
  }

  /**
   * Validating the file in the streaming mode. During this mode
   * we defer the validation, until we get the file extname.
   */
  private validateWhenGettingStreamed () {
    if (!this.file.extname) {
      return
    }

    this.validated = true

    /**
     * Valid extension type
     */
    if (this.allowedExtensions!.includes(this.file.extname)) {
      return
    }

    this.reportError()
  }

  /**
   * Validate the file extension after it has been streamed
   */
  private validateAfterConsumed () {
    this.validated = true

    /**
     * Valid extension type
     */
    if (this.allowedExtensions!.includes(this.file.extname || '')) {
      return
    }

    this.reportError()
  }

  /**
   * Validate the file
   */
  public validate (): void {
    /**
     * Do not validate if already validated
     */
    if (this.validated) {
      return
    }

    /**
     * Do not run validations, when constraints on the extension are not set
     */
    if (!Array.isArray(this.allowedExtensions) || this.allowedExtensions.length === 0) {
      this.validated = true
      return
    }

    if (this.file.state === 'streaming') {
      this.validateWhenGettingStreamed()
      return
    }

    if (this.file.state === 'consumed') {
      this.validateAfterConsumed()
    }
  }
}
