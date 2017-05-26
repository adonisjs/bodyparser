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

const CE = require('../Exceptions')

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
     * public properties
     */
    this.stream = readStream
    this.size = 0

    /**
     * Marked as ended when stream is consued
     *
     * @type {Boolean}
     */
    this.ended = false

    /**
     * private properties
     */
    this._validateFn = this._validateFile.bind(this)
    this._error = {}
    this._fileName = null
    this._clientName = this.stream.filename
    this._fieldName = this.stream.name
    this._headers = _.clone(this.stream.headers)
    this._tmpPath = null
    this._writeStream = null

    const parsedTypes = mediaTyper.parse(this._headers['content-type'])
    this._type = parsedTypes.type
    this._subtype = parsedTypes.subtype

    /**
     * valid statuses are - pending, consumed, moved, error
     *
     * Consumed is set when readable stream ends.
     *
     * @type {String}
     */
    this._status = 'pending'
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
    if (_.size(types) && (!_.includes(types, this._type) && !_.includes(types, this._subtype))) {
      this.setError(getError('type', { types, type: this._type, subtype: this._subtype }), 'type')
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
      debug('read stream ended for %s - %s', this._fieldName, this._clientName)
      this.ended = true
      this._status = this._status === 'pending' ? 'consumed' : this._status
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
        if (error) { return reject(error) }

        this.stream.on('error', (error) => {
          debug('received error from read stream %s', error.message)
          if (this._writeStream && this._writeStream.destroy) {
            this._writeStream.destroy()
            fs
              .unlink(this._writeStream.path)
              .then(() => {
                reject(error)
              }).catch(reject)
          }
        })

        this._writeStream = fs.createWriteStream(location)
        this._writeStream.on('error', reject)
        this._writeStream.on('close', resolve)

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
        this.stream.pipe(this._writeStream)
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
      fieldName: this._fieldName,
      clientName: this._clientName,
      message: message,
      type: type
    }
    this._status = 'error'
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
      throw CE.InvalidArgumentException.invalidParameter('file.validate expects a function')
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
   * @return {Promise}
   */
  moveToTmp () {
    if (this.ended) {
      throw CE.FileMoveException.multipleMoveAttempts(this._fieldName)
    }

    this._tmpPath = path.join(os.tmpdir(), `ab-${new Date().getTime()}.tmp`)
    debug('moving file %s to tmp directory %s', this._fieldName, this._tmpPath)
    return this._streamFile(this._tmpPath)
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
    options.filename = options.name || this._clientName

    /**
     * Throw error when stream has been consumed but there
     * is no `tmp` file. Since after this there is no
     * way to move file anywhere.
     */
    if (!this._tmpPath && this.ended) {
      throw CE.FileMoveException.invalidMoveState(this._fieldName)
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
        await this._streamFile(path.join(location, options.filename), this.validationOptions.size)
        this._fileName = options.filename
        this._location = location
        this._status = 'moved'
        debug('streamed file to final location %s - %s', this._fieldName, this._fileName)
      } catch (error) {
        this.setError(getError('size', { size: this.validationOptions.size }), 'size')
      }
      return
    }

    /**
     * Otherwise move the tmpFile to the user specified
     * location.
     */
    await fs.move(this._tmpPath, path.join(location, options.filename))
    this._fileName = options.filename
    this._location = location
    this._status = 'moved'
    debug('moved file to final location %s - %s', this._fieldName, this._fileName)
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
   * Returns JSON representation of the file
   *
   * @method toJSON
   *
   * @return {Object}
   */
  toJSON () {
    return {
      clientName: this._clientName,
      fileName: this._fileName,
      fieldName: this._fieldName,
      tmpPath: this._tmpPath,
      headers: this._headers,
      size: this.size,
      type: this._type,
      subtype: this._subtype,
      status: this._status,
      error: this._error
    }
  }
}

module.exports = File
