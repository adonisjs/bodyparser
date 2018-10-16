'use strict'

/*
 * adonis-bodyparser
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const { ServiceProvider } = require('@adonisjs/fold')
const _ = require('lodash')
const FileJar = require('../src/Multipart/FileJar')

class BodyParserProvider extends ServiceProvider {
  /**
   * Defines the request macro to get an instance of
   * file.
   *
   * @method _defineRequestMacro
   *
   * @return {void}
   *
   * @private
   */
  _defineRequestMacro () {
    const Request = this.app.use('Adonis/Src/Request')

    /**
     * Access all files as an object
     */
    Request.macro('files', function () {
      return this._files
    })

    /**
     * Request macro to access a file from the uploaded
     * files.
     */
    Request.macro('file', function (name, options) {
      const file = _.get(this.files(), name)
      /**
       * Return null when there is no file
       */
      if (!file) {
        return null
      }

      /**
       * Return file when it's a single file
       */
      if (!_.isArray(file)) {
        if (options) {
          file.setOptions(options)
        }
        return file
      }

      /**
       * Set options to each file when it's an
       * array of files and instead return
       * the file jar
       */
      if (options) {
        file.forEach((eachFile) => {
          eachFile.setOptions(options)
        })
      }

      return new FileJar(file)
    })
  }

  /**
   * Extends the validator by adding file related validations. Only when
   * validator is used by the app
   *
   * @method _registerValidatorBindings
   *
   * @return {void}
   *
   * @private
   */
  _registerValidatorBindings () {
    this.app.with(['Adonis/Addons/Validator'], function (Validator) {
      require('../src/Bindings/Validations')(Validator)
    })
  }

  /**
   * The boot method called by ioc container
   * as a life-cycle method
   *
   * @method boot
   *
   * @return {void}
   */
  boot () {
    this._defineRequestMacro()
    this._registerValidatorBindings()
  }

  /**
   * The register method called by ioc container
   * as a life-cycle method
   *
   * @method register
   *
   * @return {void}
   */
  register () {
    this.app.bind('Adonis/Middleware/BodyParser', (app) => {
      const BodyParser = require('../src/BodyParser')
      return new BodyParser(app.use('Adonis/Src/Config'))
    })
  }
}

module.exports = BodyParserProvider
