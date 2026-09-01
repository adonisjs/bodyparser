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
import { parseJSON, prepareJSONParserOptions } from '../../src/parsers/json.ts'

test.group('JSON parser', () => {
  test('parse valid request body', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      const body = await parseJSON(req, prepareJSONParserOptions({}))
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify(body))
    })

    const { body } = await supertest(server)
      .post('/')
      .send({ foo: { bar: 'baz' } })
      .expect(200)

    assert.deepEqual(body, {
      parsed: { foo: { bar: 'baz' } },
      raw: JSON.stringify({ foo: { bar: 'baz' } }),
    })
  })

  test('should throw 415 with invalid content encoding', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      try {
        const body = await parseJSON(req, prepareJSONParserOptions({}))
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify(body))
      } catch (error: any) {
        res.writeHead(error.status)
        res.end(error.message)
      }
    })

    const { text } = await supertest(server)
      .post('/')
      .type('json')
      .set('content-encoding', 'invalid')
      .send({ foo: { bar: 'baz' } })
      .expect(415)

    assert.equal(text, 'Unsupported Content-Encoding: invalid')
  })

  test('parse valid gzip request body', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      try {
        const body = await parseJSON(req, prepareJSONParserOptions({}))
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify(body))
      } catch (error: any) {
        res.writeHead(error.status || 500, { 'content-type': 'application/json' })
        res.end(
          JSON.stringify({
            message: error.message,
            status: error.status,
            code: error.code,
            type: error.type,
          })
        )
      }
    })

    const payload = gzipSync(Buffer.from(JSON.stringify({ foo: { bar: 'baz' } })))
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))

    try {
      const address = server.address()
      if (!address || typeof address === 'string') {
        throw new Error('Failed to resolve test server address')
      }

      const response = await fetch(`http://127.0.0.1:${address.port}/`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'content-encoding': 'gzip',
        },
        body: payload,
      })

      assert.equal(response.status, 200)
      assert.deepEqual(await response.json(), {
        parsed: { foo: { bar: 'baz' } },
        raw: JSON.stringify({ foo: { bar: 'baz' } }),
      })
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) return reject(error)

          resolve()
        })
      })
    }
  })

  test('return empty string when content-length=0 and strict is false', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      const body = await parseJSON(
        req,
        prepareJSONParserOptions({
          strict: false,
        })
      )
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify(body))
    })

    const { body } = await supertest(server).post('/').set('content-length', '0').expect(200)

    assert.deepEqual(body, {
      parsed: '',
      raw: '',
    })
  })

  test('return empty object when content-length=0 and strict is true', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      const body = await parseJSON(
        req,
        prepareJSONParserOptions({
          strict: true,
        })
      )
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify(body))
    })

    const { body } = await supertest(server).post('/').set('content-length', '0').expect(200)

    assert.deepEqual(body, {
      parsed: {},
      raw: '',
    })
  })

  test('fail for invalid json when strict mode is disabled', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      try {
        const body = await parseJSON(
          req,
          prepareJSONParserOptions({
            strict: false,
          })
        )
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify(body))
      } catch (error: any) {
        res.writeHead(error.status)
        res.end(error.message)
      }
    })

    const { text } = await supertest(server)
      .post('/')
      .set('content-type', 'application/json')
      .send('{"foo": "bar')
      .expect(400)

    assert.match(text, /Unexpected end of JSON input|Unterminated string in JSON/)
  })

  test('fail for invalid json when strict mode is enabled', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      try {
        const body = await parseJSON(
          req,
          prepareJSONParserOptions({
            strict: true,
          })
        )
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify(body))
      } catch (error: any) {
        res.writeHead(error.status)
        res.end(error.message)
      }
    })

    const { text } = await supertest(server)
      .post('/')
      .set('content-type', 'application/json')
      .send('{"foo": "bar')
      .expect(400)

    assert.match(text, /Unexpected end of JSON input|Unterminated string in JSON/)
  })

  test('parse non-object json', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      try {
        const body = await parseJSON(
          req,
          prepareJSONParserOptions({
            strict: false,
          })
        )
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify(body))
      } catch (error: any) {
        res.writeHead(error.status)
        res.end(error.message)
      }
    })

    const { body } = await supertest(server)
      .post('/')
      .set('content-type', 'application/json')
      .send('"foo"')
      .expect(200)

    assert.deepEqual(body, {
      parsed: 'foo',
      raw: '"foo"',
    })
  })

  test('fail for non-object json in strict mode', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      try {
        const body = await parseJSON(
          req,
          prepareJSONParserOptions({
            strict: true,
          })
        )
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify(body))
      } catch (error: any) {
        res.writeHead(error.status)
        res.end(error.message)
      }
    })

    const { text } = await supertest(server)
      .post('/')
      .set('content-type', 'application/json')
      .send('"foo"')
      .expect(422)

    assert.equal(text, 'Invalid JSON, only supports object and array')
  })

  test('convert empty string to null', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      try {
        const body = await parseJSON(
          req,
          prepareJSONParserOptions({
            convertEmptyStringsToNull: true,
          })
        )
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify(body))
      } catch (error: any) {
        res.writeHead(error.status)
        res.end(error.message)
      }
    })

    const { body } = await supertest(server).post('/').type('json').send({ foo: '' }).expect(200)
    assert.deepEqual(body, {
      parsed: {
        foo: null,
      },
      raw: JSON.stringify({ foo: '' }),
    })
  })

  test('do not convert empty string to null when disabled', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      try {
        const body = await parseJSON(
          req,
          prepareJSONParserOptions({
            convertEmptyStringsToNull: false,
          })
        )
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify(body))
      } catch (error: any) {
        res.writeHead(error.status)
        res.end(error.message)
      }
    })

    const { body } = await supertest(server).post('/').type('json').send({ foo: '' }).expect(200)
    assert.deepEqual(body, {
      parsed: {
        foo: '',
      },
      raw: JSON.stringify({ foo: '' }),
    })
  })

  test('do not convert empty keys to null', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      try {
        const body = await parseJSON(
          req,
          prepareJSONParserOptions({
            convertEmptyStringsToNull: true,
          })
        )
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify(body))
      } catch (error: any) {
        res.writeHead(error.status)
        res.end(error.message)
      }
    })

    const { body } = await supertest(server)
      .post('/')
      .type('json')
      .send({ '': 'hello' })
      .expect(200)
    assert.deepEqual(body, {
      parsed: {
        '': 'hello',
      },
      raw: JSON.stringify({ '': 'hello' }),
    })
  })

  test('do not normalize values assigned to empty keys', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      const body = await parseJSON(
        req,
        prepareJSONParserOptions({
          convertEmptyStringsToNull: true,
          trimWhitespaces: true,
        })
      )
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify(body))
    })

    const payload = {
      '': { value: ' value ', items: [''] },
      'nested': { '': '', 'value': ' value ' },
      'array': [{ '': ' ', 'value': '' }],
    }
    const { body } = await supertest(server).post('/').type('json').send(payload).expect(200)

    assert.deepEqual(body, {
      parsed: {
        '': { value: 'value', items: [null] },
        'nested': { '': '', 'value': 'value' },
        'array': [{ '': ' ', 'value': null }],
      },
      raw: JSON.stringify(payload),
    })
  })

  test('do not normalize a primitive root value in non-strict mode', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      const body = await parseJSON(
        req,
        prepareJSONParserOptions({
          strict: false,
          convertEmptyStringsToNull: true,
          trimWhitespaces: true,
        })
      )
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify(body))
    })

    const { body } = await supertest(server).post('/').type('json').send('"  value  "').expect(200)

    assert.deepEqual(body, {
      parsed: '  value  ',
      raw: '"  value  "',
    })
  })

  test('remove prototype poisoning properties before normalizing values', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      const body = await parseJSON(
        req,
        prepareJSONParserOptions({
          convertEmptyStringsToNull: true,
          trimWhitespaces: true,
        })
      )
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify(body))
    })

    const payload =
      '{"value":" keep ","__proto__":{"polluted":"yes"},"nested":{"constructor":{"prototype":{"polluted":"yes"}}}}'
    const { body } = await supertest(server).post('/').type('json').send(payload).expect(200)

    assert.deepEqual(body, {
      parsed: { value: 'keep', nested: {} },
      raw: payload,
    })
    assert.isFalse('polluted' in Object.prototype)
  })

  test('normalize deeply nested values without recursion', async ({ assert }) => {
    const depth = 10_000
    const payload = `${'['.repeat(depth)}" value "${']'.repeat(depth)}`
    const server = createServer(async (req, res) => {
      const body = await parseJSON(
        req,
        prepareJSONParserOptions({
          trimWhitespaces: true,
        })
      )
      let value = body.parsed
      for (let index = 0; index < depth; index++) {
        value = value[0]
      }
      res.end(value)
    })

    const { text } = await supertest(server).post('/').type('json').send(payload).expect(200)
    assert.equal(text, 'value')
  })

  test('trim whitespaces and convert empty string to null', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      try {
        const body = await parseJSON(
          req,
          prepareJSONParserOptions({
            convertEmptyStringsToNull: true,
            trimWhitespaces: true,
          })
        )
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify(body))
      } catch (error: any) {
        res.writeHead(error.status)
        res.end(error.message)
      }
    })

    const { body } = await supertest(server)
      .post('/')
      .type('json')
      .send({
        username: '  foo',
        email: '',
        age: 22,
        password: 'secret ',
        scores: [' 22', 10, ''],
        profile: {
          twitter: {
            handle: ' AmanVirk1',
            enabled: true,
          },
        },
      })
      .expect(200)
    assert.deepEqual(body, {
      parsed: {
        username: 'foo',
        email: null,
        age: 22,
        password: 'secret',
        scores: ['22', 10, null],
        profile: {
          twitter: {
            handle: 'AmanVirk1',
            enabled: true,
          },
        },
      },
      raw: JSON.stringify({
        username: '  foo',
        email: '',
        age: 22,
        password: 'secret ',
        scores: [' 22', 10, ''],
        profile: {
          twitter: {
            handle: ' AmanVirk1',
            enabled: true,
          },
        },
      }),
    })
  })
})
