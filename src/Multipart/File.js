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

class File {
  constructor (readStream, options = {}) {
    /**
     * public properties
     */
    this.stream = readStream
    this.ended = false

    /**
     * private properties
     */
    this._validationOptions = options
    this._error = {}
    this._filename = this.stream.filename
    this._fieldName = this.stream.name
    this._headers = _.clone(this.stream.headers)
    this._size = 0
    this._tmpPath = null
    this._writeStream = null
    this._validateFn = this._validateFile.bind(this)

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

    if (this._validationOptions.maxSize && typeof (this._validationOptions.maxSize) === 'string') {
      this._validationOptions.maxSize = bytes(this._validationOptions.maxSize)
    }
    this._bindRequiredListeners()
  }

  /**
   * Validates the file maxSize and extensions before moving the
   * file using the `move` method.
   *
   * @method _validateFile
   *
   * @return {void}
   *
   * @private
   */
  _validateFile () {
    const expectedBytes = this._validationOptions.maxSize || Infinity

    /**
     * Max size exceeded
     */
    if (this._size > expectedBytes) {
      this._setError(`File size should be less than ${bytes(expectedBytes)}`, 'size')
      return
    }

    /**
     * Invalid extension
     */
    const extensions = this._validationOptions.allowedExtensions
    if (_.size(extensions) && (!_.includes(extensions, this._type) && !_.includes(extensions, this._subtype))) {
      const verb = extensions.length === 1 ? 'is' : 'are'
      this._setError(`Invalid file extension ${this._subtype}. Only ${extensions.join(',')} ${verb} allowed`, 'extension')
    }
  }

  /**
   * Pushes an error to the errors array
   *
   * @method _setError
   *
   * @param  {String}   message
   * @param  {String}   type
   *
   * @return {void}
   *
   * @private
   */
  _setError (message, type) {
    const error = {
      fieldName: this._fieldName,
      filename: this._filename,
      message: message,
      type: type
    }
    this._status = 'failed'
    this._error = error
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
   */
  _streamFile (location, limit) {
    return new Promise((resolve, reject) => {
      fs.open(location, 'w', (error, fd) => {
        /**
         * Reject when there is an erorr
         */
        if (error) { return reject(error) }

        this.stream.on('error', (error) => {
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

        this.stream.on('data', (line) => {
          this._size += line.length
          if (limit && this._size > limit) {
            this.stream.emit('error', 'Max buffer exceeded')
          }
        })
        this.stream.pipe(this._writeStream)
      })
    })
  }

  /**
   * Set validation options on the file instance
   *
   * @method setOptions
   *
   * @param  {Object}   options
   *
   * @return {void}
   */
  setOptions (options) {
    this._validationOptions = options
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
      throw new Error('file.validate expects a function')
    }
    this._validateFn = callback
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
      throw new Error('Cannot file to tmp directory for multiple times')
    }

    this._tmpPath = path.join(os.tmpdir(), `ab-${new Date().getTime()}.tmp`)
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
    options.filename = options.name || this._filename

    /**
     * Throw error when stream has been consumed but there
     * is no `tmp` file. Since after this there is no
     * way to move file anywhere.
     */
    if (!this._tmpPath && this.ended) {
      throw new Error('Cannot move file since tmp file does not exists')
    }

    /**
     * Validate file for extension or size checks. Size
     * check may get ignored here if there is no tmp
     * file, since size is calculated once stream
     * is consumed.
     */
    await this._validateFile()
    if (_.size(this._error)) {
      return
    }

    /**
     * If stream was not used, stream file to
     * the user specificed location
     */
    if (!this.ended) {
      try {
        await this._streamFile(path.join(location, options.filename), this._validationOptions.maxSize)
        this._status = 'moved'
      } catch (error) {
        this._setError(`File size should be less than ${bytes(this._validationOptions.maxSize)}`, 'size')
      }
      return
    }

    /**
     * Otherwise move the tmpFile to the user specified
     * location.
     */
    await fs.move(this._tmpPath, path.join(location, options.filename))
    this._status = 'moved'
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
      filename: this._filename,
      fieldName: this._fieldName,
      tmpPath: this._tmpPath,
      headers: this._headers,
      size: this._size,
      type: this._type,
      subtype: this._subtype,
      status: this._status,
      error: this._error
    }
  }
}

module.exports = File
