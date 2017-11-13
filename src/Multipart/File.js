'use strict'

/*
 * adonis-bodyparser
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const os = require('os')
const path = require('path')
const getStream = require('get-stream')
const bytes = require('bytes')
const _ = require('lodash')
const fs = require('fs-extra')
const mediaTyper = require('media-typer')
const debug = require('debug')('adonis:bodyparser')
const eos = require('end-of-stream')
const GE = require('@adonisjs/generic-exceptions')
const CE = require('../Exceptions')

function uuid (a) {
  return a ? (a ^ Math.random() * 16 >> a / 4).toString(16)
    : ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, uuid)
}

/**
 * Returns the error string for given error
 * type
 *
 * @method getError
 *
 * @param  {String} type
 * @param  {Object} data
 *
 * @return {String}
 */
const getError = function (type, data) {
  if (type === 'size') {
    return `File size should be less than ${bytes(data.size)}`
  }

  if (type === 'type') {
    const verb = data.types.length === 1 ? 'is' : 'are'
    return `Invalid file type ${data.subtype} or ${data.type}. Only ${data.types.join(', ')} ${verb} allowed`
  }
}

/**
 * File class holds information and behavior related to a single file
 * accessed using `request.file` or `request.multipart.file`. It let
 * you stream or save user uploaded file to a given location.
 *
 * @class File
 * @constructor
 */
class File {
  constructor (readStream, options = {}) {
    /**
     * Access to multipart stream
     *
     * @attribute stream
     *
     * @type {Stream}
     */
    this.stream = readStream

    /**
     * File size
     *
     * @attribute size
     *
     * @type {Number}
     */
    this.size = 0

    /**
     * The file name uploaded the end user
     *
     * @attribute clientName
     *
     * @type {String}
     */
    this.clientName = this.stream.filename

    /**
     * The field name using which file was
     * uploaded
     *
     * @attribute fieldName
     *
     * @type {String}
     */
    this.fieldName = this.stream.name

    /**
     * Upload file header
     *
     * @attribute headers
     *
     * @type {Object}
     */
    this.headers = _.clone(this.stream.headers)

    /**
     * File name after move
     *
     * @attribute fileName
     *
     * @type {String|Null}
     */
    this.fileName = null

    /**
     * File tmp path after `moveToTmp` is
     * called.
     *
     * @attribute tmpPath
     *
     * @type {String|Null}
     */
    this.tmpPath = null

    /**
     * Marked as ended when stream is consued
     *
     * @type {Boolean}
     */
    this.ended = false

    const parsedTypes = mediaTyper.parse(this.headers['content-type'])

    /**
     * The file main type.
     *
     * @attribute type
     *
     * @type {String}
     */
    this.type = parsedTypes.type

    /**
     * The file subtype.
     *
     * @type {String}
     */
    this.subtype = parsedTypes.subtype

    /**
     * valid statuses are - pending, consumed, moved, error
     * Consumed is set when readable stream ends.
     *
     * @attribute status
     *
     * @type {String}
     */
    this.status = 'pending'

    /**
     * private properties
     */
    this._validateFn = this._validateFile.bind(this)
    this._error = {}
    this._writeFd = null
    this._bindRequiredListeners()
    this.setOptions(options)
  }

  /**
   * Validates the file size and extensions before moving the
   * file using the `move` method.
   *
   * @method _validateFile
   *
   * @return {void}
   *
   * @private
   */
  _validateFile () {
    const expectedBytes = this.validationOptions.size || Infinity

    /**
     * Max size exceeded
     */
    if (this.size > expectedBytes) {
      this.setError(getError('size', { size: expectedBytes }), 'size')
      return
    }

    /**
     * Invalid file type
     */
    const types = this.validationOptions.types
    if (_.size(types) && (!_.includes(types, this.type) && !_.includes(types, this.subtype))) {
      this.setError(getError('type', { types, type: this.type, subtype: this.subtype }), 'type')
    }
  }

  /**
   * Listen for required events.
   *
   * @method _bindRequiredListeners
   *
   * @return {void}
   *
   * @private
   */
  _bindRequiredListeners () {
    this.stream.on('end', () => {
      debug('read stream ended for %s - %s', this.fieldName, this.clientName)
      this.ended = true
      this.status = this.status === 'pending' ? 'consumed' : this.status
    })
  }

  /**
   * Streams files to a given location. Also makes sure
   * to remove opened file when readable stream throws
   * error and will also close opened streams
   *
   * @method _streamFile
   *
   * @param  {String}    location
   * @param  {Number}    [limit = 0]
   *
   * @return {Promise}
   *
   * @private
   */
  _streamFile (location, limit) {
    return new Promise((resolve, reject) => {
      fs.open(location, 'w', (error, fd) => {
        /**
         * Reject when there is an erorr
         */
        if (error) {
          fs.close(fd)
          return reject(error)
        }

        const writeStream = fs.createWriteStream(location)
        writeStream.on('error', reject)

        /**
         * Knowing when stream ends
         */
        eos(this.stream, (error) => {
          fs.close(fd)
          if (!error) {
            resolve()
            return
          }
          debug('received error from read stream %s', error.message)
          writeStream.destroy()
          fs.unlink(writeStream.path).then(() => reject(error)).catch(reject)
        })

        /**
         * On each data chunk, update the file size
         */
        this.stream.on('data', (line) => {
          this.size += line.length
          if (limit && this.size > limit) {
            this.stream.emit('error', getError('size', { size: limit }))
          }
        })

        /**
         * Pipe readable stream stream to
         * writable stream.
         */
        this.stream.pipe(writeStream)
      })
    })
  }

  /**
   * Pushes an error to the errors array and also
   * set the file status to `error`.
   *
   * @method setError
   *
   * @param  {String}   message
   * @param  {String}   type
   *
   * @return {void}
   */
  setError (message, type) {
    const error = {
      fieldName: this.fieldName,
      clientName: this.clientName,
      message: message,
      type: type
    }
    this.status = 'error'
    this._error = error
  }

  /**
   * Set validation options on the file instance
   *
   * @method setOptions
   *
   * @param  {Object}   options
   *
   * @chainable
   */
  setOptions (options) {
    this.validationOptions = options

    if (typeof (this.validationOptions.size) === 'string') {
      this.validationOptions.size = bytes(this.validationOptions.size)
    }

    return this
  }

  /**
   * Set a custom validate function. It will be called before
   * the move operation
   *
   * @method validate
   *
   * @param  {Function} callback
   *
   * @chainable
   */
  validate (callback) {
    if (typeof (callback) !== 'function') {
      throw GE.InvalidArgumentException.invalidParameter('file.validate expects a function', callback)
    }
    this._validateFn = callback.bind(this)
    return this
  }

  /**
   * Read the file into buffer.
   *
   * @method read
   *
   * @return {Promise}
   */
  async read () {
    return getStream(this.stream)
  }

  /**
   * Moves file to the `tmp` directory. After this all
   * file descriptors are closed and stream cannot be
   * used any more.
   *
   * @method moveToTmp
   *
   * @package {Function} tmpNameFn
   *
   * @return {Promise}
   */
  moveToTmp (tmpNameFn) {
    if (this.ended) {
      throw CE.FileMoveException.multipleMoveAttempts(this.fieldName)
    }

    /**
     * The function to be used for generating
     * the tmp file name
     */
    tmpNameFn = typeof (tmpNameFn) === 'function' ? tmpNameFn : () => `ab-${uuid()}.tmp`

    this.tmpPath = path.join(os.tmpdir(), tmpNameFn())
    debug('moving file %s to tmp directory %s', this.fieldName, this.tmpPath)
    return this._streamFile(this.tmpPath)
  }

  /**
   * Moves file from tmp directory to the user
   * defined location.
   *
   * @method move
   *
   * @param  {String} location
   * @param  {Object} options
   *
   * @return {Promise}
   */
  async move (location, options = {}) {
    options.name = options.name || this.clientName

    /**
     * Throw error when stream has been consumed but there
     * is no `tmp` file. Since after this there is no
     * way to move file anywhere.
     */
    if (!this.tmpPath && this.ended) {
      throw CE.FileMoveException.invalidMoveState(this.fieldName)
    }

    /**
     * Validate file for extension or size checks. Size
     * check may get ignored here if there is no tmp
     * file, since size is calculated once stream
     * is consumed.
     */
    await this._validateFn()
    if (_.size(this._error)) {
      return
    }

    /**
     * If stream was not used, stream file to
     * the user specificed location
     */
    if (!this.ended) {
      try {
        await this._streamFile(path.join(location, options.name), this.validationOptions.size)
        this.fileName = options.name
        this._location = location
        this.status = 'moved'
        debug('streamed file to final location %s - %s', this.fieldName, this.fileName)
      } catch (error) {
        this.setError(getError('size', { size: this.validationOptions.size }), 'size')
      }
      return
    }

    /**
     * Otherwise move the tmpFile to the user specified
     * location.
     */
    await fs.move(this.tmpPath, path.join(location, options.name))
    this.fileName = options.name
    this._location = location
    this.status = 'moved'
    debug('moved file to final location %s - %s', this.fieldName, this.fileName)
  }

  /**
   * Returns the error if any
   *
   * @method errors
   *
   * @return {Array}
   */
  error () {
    return this._error
  }

  /**
   * Returns a boolean indicating whether
   * file has been moved or not
   *
   * @method moved
   *
   * @return {Boolean}
   */
  moved () {
    return this.status === 'moved'
  }

  /**
   * Returns JSON representation of the file
   *
   * @method toJSON
   *
   * @return {Object}
   */
  toJSON () {
    return {
      clientName: this.clientName,
      fileName: this.fileName,
      fieldName: this.fieldName,
      tmpPath: this.tmpPath,
      headers: this.headers,
      size: this.size,
      type: this.type,
      subtype: this.subtype,
      status: this.status,
      error: this._error
    }
  }
}

module.exports = File
