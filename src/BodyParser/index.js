'use strict'

/*
 * adonis-middleware
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const parse = require('co-body')
const defaultConfig = require('../../examples/config.js')

class BodyParser {
  constructor (Config) {
    this.config = Config.merge('bodyParser', defaultConfig)
  }

  /**
   * The JSON types to be used for identiying
   * the JSON request.
   *
   * @attributes jsonTypes
   *
   * @return {Array}
   */
  get jsonTypes () {
    return this.config.json.types
  }

  /**
   * Form types to be used for identiying
   * the form request.
   *
   * @attributes formTypes
   *
   * @return {Array}
   */
  get formTypes () {
    return this.config.form.types
  }

  /**
   * Raw types to be used for identiying
   * the raw request.
   *
   * @attributes rawTypes
   *
   * @return {Array}
   */
  get rawTypes () {
    return this.config.raw.types
  }

  /**
   * Parses the JSON body when `Content-Type` is set to
   * one of the available `this.jsonTypes`. It will
   * not parse the body when jsonTypes are empty.
   *
   * @method _parseJSON
   *
   * @param  {Object}   req
   *
   * @return {Object}
   *
   * @private
   */
  _parseJSON (req) {
    if (this.jsonTypes.length) {
      return parse.json(req, {
        limit: this.config.json.limit,
        strict: this.config.json.strict
      })
    }
    return {}
  }

  /**
   * Parses the form body when `Content-type` is set to
   * one of the available `this.formTypes`. It will not
   * parse the body when formTypes are empty.
   *
   * @method _parseForm
   *
   * @param  {Object}   req
   *
   * @return {Object}
   *
   * @private
   */
  _parseForm (req) {
    if (this.formTypes.length) {
      return parse.form(req, {
        limit: this.config.form.limit
      })
    }
    return {}
  }

  /**
   * Parses the raw body when `Content-type` is set to
   * one of the available `this.rawTypes`. It will not
   * parse the body when rawTypes are empty.
   *
   * @method _parseRaw
   *
   * @param  {Object}  req
   *
   * @return {Object}
   *
   * @private
   */
  _parseRaw (req) {
    if (this.rawTypes.length) {
      return parse.text(req, {
        limit: this.config.raw.limit
      })
    }
    return {}
  }

  /**
   * Method called by adonis middleware stack. It will read
   * the request body as per the config defined inside
   * `config/bodyParser.js` file.
   *
   * @method handle
   *
   * @param  {Object}   options.request
   * @param  {Function} next
   *
   * @return {void}
   */
  async handle ({ request }, next) {
    request._body = {}
    if (!request.hasBody()) {
      await next()
      return
    }

    if (this.jsonTypes.length && request.is(this.jsonTypes)) {
      request._body = await this._parseJSON(request.request)
    } else if (this.formTypes.length && request.is(this.formTypes)) {
      request._body = await this._parseForm(request.request)
    } else if (this.rawTypes.length && request.is(this.rawTypes)) {
      request._raw = await this._parseRaw(request.request)
    }
  }
}

module.exports = BodyParser
