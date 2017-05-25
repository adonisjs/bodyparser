'use strict'

/*
 * adonis-bodyparser
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const http = require('http')
const nodeReq = require('node-req')
module.exports = {
  server: null,
  get: null,
  post: null,
  start: function () {
    this.server = http.createServer()
    this.server.listen(4000)

    this.server.on('request', (req, res) => {
      const request = {}
      request.request = req
      request.is = function (inputs) {
        return nodeReq.is(req, inputs)
      }

      request.match = function (routes) {
        return routes.indexOf(req.url) > -1
      }

      request.hasBody = function () {
        return nodeReq.hasBody(req)
      }

      if (req.method === 'GET') {
        this.get(request, res)
      } else if (req.method === 'POST') {
        this.post(request, res)
      }
    })
  },
  end: function () {
    this.server.stop()
  }
}
