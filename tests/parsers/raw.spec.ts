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
import { gzipSync } from 'node:zlib'
import { parseText, prepareTextParserOptions } from '../../src/parsers/text.ts'

test.group('Raw parser', () => {
  test('inflate request body', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      const body = await parseText(req, prepareTextParserOptions({}))
      res.writeHead(200)
      res.end(body)
    })

    const { text } = await supertest(server).post('/').send('Hello World!').expect(200)
    assert.equal(text, 'Hello World!')
  })

  test('inflate gzip request body', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      const body = await parseText(req, prepareTextParserOptions({}))
      res.writeHead(200)
      res.end(body)
    })

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))

    try {
      const address = server.address()
      if (!address || typeof address === 'string') {
        throw new Error('Failed to resolve test server address')
      }

      const response = await fetch(`http://127.0.0.1:${address.port}/`, {
        method: 'POST',
        headers: {
          'content-encoding': 'gzip',
        },
        body: gzipSync(Buffer.from('Hello World!')),
      })

      assert.equal(response.status, 200)
      assert.equal(await response.text(), 'Hello World!')
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) return reject(error)

          resolve()
        })
      })
    }
  })

  test('fail with 415 when content encoding is invalid', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      try {
        const body = await parseText(req, prepareTextParserOptions({}))
        res.writeHead(200)
        res.end(body)
      } catch (error: any) {
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
