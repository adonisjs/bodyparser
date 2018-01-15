'use strict'

/*
 * adonis-bodyparser
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const parse = require('co-body')
const debug = require('debug')('adonis:bodyparser')
const Multipart = require('../Multipart')
const FormFields = require('../FormFields')
const defaultConfig = require('../../config/bodyParser.js')

/**
 * @module Adonis
 * @submodule bodyparser
 */

/**
 * BodyParser class is a global middleware attached to Adonis
 * HTTP server to parse and read request body. It has out
 * of the box support for.
 *
 * 1. JSON API, JSON Patch and CSV reports.
 * 2. Raw data
 * 3. Url encoded forms
 * 4. Multipart form data.
 *
 * Also it allows lazily streaming multipart payload.
 *
 * **Namespace**: `Adonis/Middleware/BodyParser` <br />
 * **Singleton**: No <br />
 * **Alias**: None
 *
 * @class BodyParser
 * @constructor
 */
class BodyParser {
  constructor (Config) {
    /**
     * Giving preference to types from the user config over the
     * default config, since user can defined empty arrays as
     * part of ignoring body parsing, which will be overridden
     * otherwise by the merge method.
     */
    this.config = Config.merge('bodyParser', defaultConfig, (obj, src, key) => {
      if (key === 'types' && typeof (src) !== 'undefined') {
        return src
      }
    })

    this.files = new FormFields()
    this.fields = new FormFields()
  }

  /**
   * The JSON types to be used for identifying the JSON request.
   * The values are defined in `config/bodyParser.js` file
   * under `json` object.
   *
   * @attribute jsonTypes
   *
   * @type {Array}
   */
  get jsonTypes () {
    return this.config.json.types
  }

  /**
   * Form types to be used for identifying the form request.
   * The values are defined in `config/bodyParser.js` file
   * under `form` object.
   *
   * @attribute formTypes
   *
   * @type {Array}
   */
  get formTypes () {
    return this.config.form.types
  }

  /**
   * Raw types to be used for identifying the raw request.
   * The values are defined in `config/bodyParser.js`
   * file under `raw` object.
   *
   * @attribute rawTypes
   *
   * @type {Array}
   */
  get rawTypes () {
    return this.config.raw.types
  }

  /**
   * Files types to be used for identifying the multipart types.
   * The values are defined in `config/bodyParser.js` file
   * under `files` object.
   *
   * @attribute filesTypes
   *
   * @type {Array}
   */
  get filesTypes () {
    return this.config.files.types
  }

  /**
   * Parses the JSON body when `Content-Type` is set to
   * one of the available `this.jsonTypes`.
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
    return parse.json(req, {
      limit: this.config.json.limit,
      strict: this.config.json.strict
    })
  }

  /**
   * Parses the form body when `Content-type` is set to
   * one of the available `this.formTypes`.
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
    return parse.form(req, {
      limit: this.config.form.limit
    })
  }

  /**
   * Parses the raw body when `Content-type` is set to
   * one of the available `this.rawTypes`.
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
    return parse.text(req, {
      limit: this.config.raw.limit
    })
  }

  /**
   * Returns a boolean indicating whether request is
   * of a given type. Also makes sure that user
   * wants to process the given type.
   *
   * @method _isType
   *
   * @param  {Object}  request
   * @param  {Array}  types
   *
   * @return {Boolean}
   *
   * @private
   */
  _isType (request, types) {
    return types && types.length && request.is(types)
  }

  /**
   * Returns a boolean indicating whether or not
   * the files should be autoProcessed based
   * on certain conditions
   *
   * @method _shouldBeProcessed
   *
   * @param {Object} request
   *
   * @return {Boolean}
   *
   * @private
   */
  _shouldBeProcessed (request) {
    const autoProcess = this.config.files.autoProcess
    if (!autoProcess) {
      return false
    }

    if (autoProcess instanceof Array === true && request.match(autoProcess)) {
      return true
    }

    return !request.match(this.config.files.processManually)
  }

  /**
   * Method called by Adonis middleware stack. It will read
   * the request body as per the config defined inside
   * `config/bodyParser.js` file. It will set following
   * private properties on the request object.
   *
   * 1. _body - The request body ( JSON or Url endcoded )
   * 2. _files - Uploaded files
   * 3. _raw - The request raw body.
   *
   * @method handle
   *
   * @param  {Object}   options.request
   * @param  {Function} next
   *
   * @return {void}
   */
  async handle ({ request }, next) {
    request._files = {}
    request.body = {}
    request._raw = {}

    /**
     * Don't bother when request does not have body
     */
    if (!request.hasBody()) {
      debug('skipping body parsing, since request body is empty')
      await next()
      return
    }

    /**
     * Body is multipart/form-data and autoProcess is set to
     * true, so process all the files and fields inside
     * it.
     */
    if (this._shouldBeProcessed(request) && this._isType(request, this.filesTypes)) {
      debug('detected multipart body')
      request.multipart = new Multipart(request, true)

      request.multipart.file('*', {}, async (file) => {
        this.files.add(file.fieldName, file)
        await file.moveToTmp(this.config.files.tmpFileName)
      })

      request.multipart.field((name, value) => {
        this.fields.add(name, value)
      })

      await request.multipart.process()
      request._files = this.files.get()
      request.body = this.fields.get()

      await next()
      return
    }

    request.multipart = new Multipart(request)

    /**
     * Body is JSON, so parse it and move forward
     */
    if (this._isType(request, this.jsonTypes)) {
      debug('detected json body')
      request.body = await this._parseJSON(request.request)
      await next()
      return
    }

    /**
     * Body is Url encoded form, so parse it and move forward
     */
    if (this._isType(request, this.formTypes)) {
      debug('detected form body')
      request.body = await this._parseForm(request.request)
      await next()
      return
    }

    /**
     * Body is raw data, parse it and move forward
     */
    if (this._isType(request, this.rawTypes)) {
      debug('detected raw body')
      request._raw = await this._parseRaw(request.request)
      await next()
      return
    }

    /**
     * Nothing matched, so please move forward
     */
    await next()
  }
}

module.exports = BodyParser
