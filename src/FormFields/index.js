'use strict'

/*
 * adonis-bodyparser
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const _ = require('lodash')

/**
 * FormFields class is used to handle array of or nested fields
 * when parsing multipart data.
 *
 * @class FormFields
 * @constructor
 */
class FormFields {
  constructor () {
    this._fields = {}
  }

  /**
   * Add key/value pair to the object. Which handles
   * string expression on keys. For example
   *
   * @example
   * ```
   *  user[0][age] => { user: [{age}] }
   * ```
   *
   * @method add
   *
   * @param  {String} key
   * @param  {Mixed} value
   */
  add (key, value) {
    /**
     * Detecting if array like expression
     *
     * @example
     * users[]
     */
    let isArray = false
    key = key.replace(/\[]$/, (match) => {
      isArray = true
      return ''
    })

    const existingValue = _.get(this._fields, key)

    /**
     * Add to the fields group, if there is no
     * existing value.
     */
    if (!existingValue) {
      _.set(this._fields, key, isArray ? [value] : value)
      return
    }

    /**
     * If existing value is an array push the value
     */
    if (existingValue instanceof Array) {
      existingValue.push(value)
      return
    }

    /**
     * Otherwise transform the string value to array by
     * resetting it and adding both values.
     */
    _.set(this._fields, key, [existingValue, value])
  }

  /**
   * Returns the serialized object
   *
   * @method get
   *
   * @return {Object}
   */
  get () {
    return this._fields
  }
}

module.exports = FormFields
