/*
 * adonis-bodyparser
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const { ioc, registrar, resolver } = require('@adonisjs/fold')
const { Config } = require('@adonisjs/sink')
const http = require('http')
const { join } = require('path')
const Request = require('./helpers/Request')
const Response = require('./helpers/Response')
const Route = require('./helpers/Route')
const Server = require('./helpers/Server')

module.exports = {
  server: null,

  /**
   * Execute after tests suite
   */
  down () {
    return new Promise((resolve) => this.server.close(resolve))
  },

  async requestHandler (req, res) {
    const request = new Request(req)
    const response = new Response(req, res)

    const bodyParser = use('Adonis/Middleware/BodyParser')
    const validatorMiddleware = use('Adonis/Middleware/Validator')

    try {
      await bodyParser.handle({ request, response }, async () => {
        await validatorMiddleware.handle({ request, response }, () => {
          res.writeHead(200, { 'content-type': 'application/json' })
          res.write(JSON.stringify(request.body))
          res.end()
        }, ['Sample'])
      })
    } catch (error) {
      res.writeHead(500, { 'content-type': 'application/json' })
      const message = error.messages ? error.messages : { message: error.message }
      res.write(JSON.stringify(message))
      res.end()
    }
  },

  /**
   * Execute before tests suite
   */
  up (port) {
    return new Promise((resolve, reject) => {
      ioc.bind('Adonis/Src/Server', () => new Server())
      ioc.bind('Adonis/Src/Route', () => Route)
      ioc.bind('Adonis/Src/Request', () => Request)
      ioc.bind('Adonis/Src/Config', () => new Config())

      resolver.appNamespace('App').directories({ validators: 'Validators' })

      registrar
        .providers([
          '@adonisjs/validator/providers/ValidatorProvider',
          join(__dirname, '../../providers/BodyParserProvider')
        ])
        .registerAndBoot()
        .then(() => {
          this.server = http.createServer(this.requestHandler)
          this.server.listen(port, resolve)
        })
        .catch(reject)
    })
  }
}
