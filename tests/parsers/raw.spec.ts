/*
 * @adonisjs/bodyparser
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import supertest from 'supertest'
import { test } from '@japa/runner'
import { createServer } from 'node:http'
import { parseText } from '../../src/parsers/text.js'

test.group('Raw parser', () => {
  test('inflate request body', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      const body = await parseText(req, {})
      res.writeHead(200)
      res.end(body)
    })

    const { text } = await supertest(server).post('/').send('Hello World!').expect(200)
    assert.equal(text, 'Hello World!')
  })

  test('fail with 415 when content encoding is invalid', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      try {
        const body = await parseText(req, {})
        res.writeHead(200)
        res.end(body)
      } catch (error) {
        res.writeHead(error.status)
        res.end(error.message)
      }
    })

    const { text } = await supertest(server)
      .post('/')
      .set('content-encoding', 'invalid')
      .send('Hello World!')
      .expect(415)

    assert.equal(text, 'Unsupported Content-Encoding: invalid')
  })
})
