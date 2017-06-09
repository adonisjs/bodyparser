'use strict'

/*
 * adonis-bodyparser
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const { ServiceProvider } = require('adonis-bodyparser')

class BodyParserProvider extends ServiceProvider {
  boot () {
    const Server = this.app.use('Adonis/Src/Server')
    Server.registerGlobal(['Adonis/Middleware/BodyParser'])
  }

  register () {
    this.app.bind('Adonis/Middleware/BodyParser', () => {
      const BodyParser = require('../src/BodyParser')
      return new BodyParser(app.use('Adonis/Src/Config'))
    })
  }
}

module.exports = BodyParserProvider
