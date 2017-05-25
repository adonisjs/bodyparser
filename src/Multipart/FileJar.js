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

class FileJar {
  constructor (files = []) {
    this._files = files
  }

  track (file) {
    this._files.push(file)
  }

  all () {
    return _.map(this._files, (file) => file.toJSON())
  }

  movedList () {
    return _.filter(this.all(), (file) => file.status === 'moved')
  }

  movedAll () {
    return _.every(this.all(), (file) => file.status === 'moved')
  }

  errors () {
    return _(this.all())
    .filter((file) => file.status !== 'moved')
    .map((file) => file.error)
    .value()
  }
}

module.exports = FileJar
