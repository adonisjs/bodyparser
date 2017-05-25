'use strict'

/*
 * body-parser
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const multiparty = require('multiparty')
const File = require('./File')
const FileJar = require('./FileJar')
const CE = require('../Exceptions')

class Multipart {
  constructor (request) {
    this.req = request.request

    /**
     * Storing which files has been accessed by the end-user. When
     * lazy is set to false, the object is ignored and all files
     * are processed.
     *
     * @type {Object}
     */
    this._filesToAccess = {}

    /**
     * The options and handler attached to a wildcard. Which
     * means all files inside the stream will be handled
     * by the wildcard unless specific handlers are
     * defined.
     *
     * @type {Object}
     */
    this._wildcard = {}

    /**
     * Options to be passed to multiparty
     *
     * @type {Object}
     */
    this._multipartyOptions = {
      autoFields: true,
      autoFiles: false
    }

    /**
     * The callback to be called to access fields
     *
     * @type {Function|Null}
     */
    this._fieldsCallback = null

    this._jar = new FileJar()
  }

  /**
   * Executed for each part in stream. Returning
   * promise will advance the stream
   *
   * @method onPart
   *
   * @param  {Stream} part
   *
   * @return {Promise}
   */
  onPart (part) {
    let handler = this._filesToAccess[part.name]

    /**
     * Use wildcard handler when specific handler
     * is not defined
     */
    if (!handler) {
      handler = this._wildcard
    }

    /**
     * No one wants to read this file, so simply advance it
     */
    if (!handler || !handler.callback) {
      return Promise.resolve()
    }

    const fileInstance = new File(part, handler.options)
    this._jar.track(fileInstance)
    return handler.callback(fileInstance)
  }

  /**
   * Process files by going over each part of the stream. Files
   * are ignored when there are no listeners listening for them.
   *
   * @method process
   *
   * @return {Promise}
   */
  process () {
    return new Promise((resolve, reject) => {
      const form = new multiparty.Form(this._multipartyOptions)
      form.on('error', reject)
      form.on('part', (part) => {
        this.onPart(part)
          .then(() => {
            part.resume()
          })
          .catch((error) => form.emit('error', error))
      })

      form.on('field', (name, value) => {
        if (typeof (this._fieldsCallback) === 'function') {
          this._fieldsCallback(name, value)
        }
      })

      form.on('close', resolve)
      form.parse(this.req)
    })
  }

  /**
   * Add a listener to file. It is important to attach a callback and
   * handle the processing of the file. Also only one listener can
   * be added at a given point of time, since 2 parties processing
   * a single doesn't make much sense.
   *
   * @method file
   *
   * @param  {String}   name
   * @param  {Object}   options
   * @param  {Function} callback
   *
   * @chainable
   */
  file (name, options = {}, callback) {
    if (typeof (callback) !== 'function') {
      throw CE.InvalidArgumentException.invalidParameter('multipart.file expects callback to be a function')
    }

    if (name === '*') {
      this._wildcard = { options, callback }
    } else {
      this._filesToAccess[name] = { options, callback }
    }

    return this
  }

  field (callback) {
    this._fieldsCallback = callback
    return this
  }

  movedAll () {
    return this._jar.movedAll()
  }

  all () {
    return this._jar.all()
  }

  errors () {
    return this._jar.errors()
  }

  movedList () {
    return this._jar.movedList()
  }
}

module.exports = Multipart
