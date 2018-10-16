/*
 * adonis-bodyparser
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const File = require('../Multipart/File')
const _ = require('lodash')

/**
 * Validates a single file instance. If validation has error, then error
 * message will be returned as string, else null is returned.
 *
 * @method validateFile
 *
 * @param  {File}           file
 * @param  {Object}           options
 *
 * @return {String|Null}
 */
async function validateFile (file, options) {
  if (file instanceof File === false) {
    return null
  }

  await file.setOptions(Object.assign(file.validationOptions, options)).runValidations()
  return _.size(file.error()) ? file.error().message : null
}

module.exports = function (Validator) {
  /**
   * Ensure field is a valid File object
   */
  Validator.extend('file', async function (data, field, message, args, get) {
    if (get(data, field) instanceof File === false) {
      throw message
    }
  })

  /**
   * Validate file size
   */
  Validator.extend('fileSize', async function (data, field, message, args, get) {
    const error = await validateFile(get(data, field), { size: args[0] })
    if (error) {
      throw error
    }
  })

  /**
   * Validate file extension
   */
  Validator.extend('fileExt', async function (data, field, message, args, get) {
    const error = await validateFile(get(data, field), { extnames: args })
    if (error) {
      throw error
    }
  })

  /**
   * Validate file types
   */
  Validator.extend('fileTypes', async function (data, field, message, args, get) {
    const error = await validateFile(get(data, field), { types: args })
    if (error) {
      throw error
    }
  })
}
