/*
* @adonisjs/bodyparser
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

/// <reference path="../adonis-typings/bodyparser.ts" />

import { BodyParserMiddleware } from '../src/BodyParser/index'
import { FileValidationOptions, MultipartFileContract } from '@ioc:Adonis/Addons/BodyParser'

export default class BodyParserProvider {
  constructor (protected $container: any) {
  }

  /**
   * Registers the bodyparser middleware namespace to the container.
   */
  public register () {
    this.$container.bind('Adonis/Middleware/BodyParser', () => {
      const config = this.$container.use('Adonis/Src/Config')
      return new BodyParserMiddleware(config)
    })
  }

  /**
   * Adding the `file` macro to add support for reading request files.
   */
  public boot () {
    const Request = this.$container.use('Adonis/Src/Config')

    /**
     * Adding `file` macro to the request class.
     */
    Request.macro('file', function getFile (key: string, options?: Partial<FileValidationOptions>) {
      const file = this._files[key]
      if (!file) {
        return null
      }

      if (options) {
        if (file instanceof Array) {
          (file as MultipartFileContract[]).forEach((one) => one.setValidationOptions(options))
        } else {
          (file as MultipartFileContract).setValidationOptions(options)
        }
      }

      return file
    })
  }
}
