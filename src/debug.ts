/*
 * @adonisjs/bodyparser
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { debuglog } from 'node:util'

/**
 * Debug logger instance for the bodyparser package. Use the DEBUG=adonisjs:bodyparser
 * environment variable to enable debug logging.
 *
 * @example
 * ```sh
 * DEBUG=adonisjs:bodyparser node ace serve
 * ```
 */
export default debuglog('adonisjs:bodyparser')
