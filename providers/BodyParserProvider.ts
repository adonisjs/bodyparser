/*
 * @adonisjs/bodyparser
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { ApplicationContract } from '@ioc:Adonis/Core/Application'

export default class BodyParserProvider {
  constructor(protected app: ApplicationContract) {}

  public static needsApplication = true

  /**
   * Registers the bodyparser middleware namespace to the container.
   */
  public register() {
    this.app.container.bind('Adonis/Core/BodyParser', () => {
      const { BodyParserMiddleware } = require('../src/BodyParser/index')
      return BodyParserMiddleware
    })
  }

  /**
   * Adding the `file` macro to add support for reading request files.
   */
  public boot() {
    const extendRequest = require('../src/Bindings/Request').default
    extendRequest(this.app.container.resolveBinding('Adonis/Core/Request'))
  }
}
