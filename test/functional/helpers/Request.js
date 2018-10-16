/*
 * adonis-bodyparser
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

module.exports = class Request {
  constructor (request) {
    this.request = request
  }

  hasBody () {
    return true
  }

  match () {
    return false
  }

  is (types) {
    const contentType = this.request.headers['content-type']
    return types.indexOf('multipart/form-data') > -1 && contentType && contentType.startsWith('multipart/form-data')
  }

  all () {
    return this.body
  }

  files () {
    return this._files
  }

  static macro () {}
}
