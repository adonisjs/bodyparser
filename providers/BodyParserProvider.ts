/*
* @adonisjs/bodyparser
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

import { IocContract } from '@adonisjs/fold'
import extendRequest from '../src/Bindings/Request'
import { BodyParserMiddleware } from '../src/BodyParser/index'

export default class BodyParserProvider {
  constructor (protected container: IocContract) {
  }

  /**
   * Registers the bodyparser middleware namespace to the container.
   */
  public register () {
    this.container.bind('Adonis/Core/BodyParserMiddleware', () => {
      const Config = this.container.use('Adonis/Core/Config')
      return new BodyParserMiddleware(Config.get('bodyparser', {}))
    })
  }

  /**
   * Adding the `file` macro to add support for reading request files.
   */
  public boot () {
    extendRequest(this.container.use('Adonis/Core/Request'))
  }
}
