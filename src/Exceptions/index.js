'use strict'

/*
 * adonis-bodyparser
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const GE = require('@adonisjs/generic-exceptions')

/**
 * This class contains static methods to throw exceptions
 * when unable to move file due to some unexpected
 * reasons.
 *
 * @class FileMoveException
 * @constructor
 */
class FileMoveException extends GE.RuntimeException {
  /**
   * This exception is thrown when user is trying to move
   * file to the `tmp` directory for multiple times.
   *
   * Exception code `E_CANNOT_MOVE`
   *
   * @method multipleMoveAttempts
   *
   * @param  {String}             fieldname
   *
   * @return {Object}
   */
  static multipleMoveAttempts (fieldname) {
    const message = `Cannot move file ${fieldname} for multiple times`
    return new this(message, 400, 'E_CANNOT_MOVE')
  }

  /**
   * This exception is thrown when user is trying to call `move`
   * for multiple times, or maybe used the stream manually
   * and now calling the move method.
   *
   * Exception code `E_CANNOT_MOVE`
   *
   * @method invalidMoveState
   *
   * @param  {String}         fieldname
   *
   * @return {Object}
   */
  static invalidMoveState (fieldname) {
    const message = `Cannot move file ${fieldname} since there is no tmp file and stream is already consumed`
    return new this(message, 400, 'E_CANNOT_MOVE')
  }
}

module.exports = { FileMoveException }
