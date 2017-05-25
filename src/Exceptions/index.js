'use strict'

/*
 * adonis-bodyparser
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const NE = require('node-exceptions')

class FileUploadFailed extends NE.RuntimeException {
  static validationFailed (fieldName, fileName, allowedSize) {
    const message = `Make sure the file size is under ${allowedSize}`
    const error = new this(message, 400, 'E_VALIDATION_FAILED')
    error.fileName = fileName
    error.fieldName = fieldName
    return error
  }
}

class InvalidArgumentException extends NE.InvalidArgumentException {
  /**
   * Throws exception by instantiating the class and setting error code
   * to `E_INVALID_PARAMETER`.
   *
   * @method invalidParamter
   *
   * @param  {String}        message
   *
   * @return {Object}
   */
  static invalidParamter (message) {
    return new this(message, 500, 'E_INVALID_PARAMETER')
  }
}

module.exports = { FileUploadFailed, InvalidArgumentException }
