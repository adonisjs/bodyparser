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
import { parseForm } from '../../src/parsers/form.js'

test.group('Form parser', () => {
  test('parse valid request body', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      const body = await parseForm(req, {})
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify(body))
    })

    const { body } = await supertest(server)
      .post('/')
      .type('form')
      .send({ foo: { bar: 'baz' } })
      .expect(200)

    assert.deepEqual(body, {
      parsed: { foo: { bar: 'baz' } },
      raw: 'foo%5Bbar%5D=baz',
    })
  })

  test('should throw 415 with invalid content encoding', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      try {
        const body = await parseForm(req, {})
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify(body))
      } catch (error) {
        res.writeHead(error.status)
        res.end(error.message)
      }
    })

    const { text } = await supertest(server)
      .post('/')
      .type('form')
      .set('content-encoding', 'invalid')
      .send({ foo: { bar: 'baz' } })
      .expect(415)

    assert.equal(text, 'Unsupported Content-Encoding: invalid')
  })

  test('parse until default depth (ie 5)', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      try {
        const body = await parseForm(req, {
          queryString: {
            depth: 5,
          },
        })
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify(body))
      } catch (error) {
        res.writeHead(error.status)
        res.end(error.message)
      }
    })

    const { body } = await supertest(server)
      .post('/')
      .type('form')
      .send({
        level1: { level2: { level3: { level4: { level5: { level6: { level7: 'Hello' } } } } } },
      })
      .expect(200)

    assert.deepEqual(body.parsed, {
      level1: { level2: { level3: { level4: { level5: { level6: { '[level7]': 'Hello' } } } } } },
    })
  })

  test('parse until configured depth', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      try {
        const body = await parseForm(req, {
          queryString: {
            depth: 10,
          },
        })
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify(body))
      } catch (error) {
        res.writeHead(error.status)
        res.end(error.message)
      }
    })

    const { body } = await supertest(server)
      .post('/')
      .type('form')
      .send({
        level1: { level2: { level3: { level4: { level5: { level6: { level7: 'Hello' } } } } } },
      })
      .expect(200)

    assert.deepEqual(body.parsed, {
      level1: { level2: { level3: { level4: { level5: { level6: { level7: 'Hello' } } } } } },
    })
  })

  test('allow dots by default', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      try {
        const body = await parseForm(req, {
          queryString: {
            depth: 5,
          },
        })
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify(body))
      } catch (error) {
        res.writeHead(error.status)
        res.end(error.message)
      }
    })

    const { body } = await supertest(server).post('/').type('form').send('a.b=1&a.c=2').expect(200)
    assert.deepEqual(body.parsed, { a: { b: '1', c: '2' } })
  })

  test('disable dots', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      try {
        const body = await parseForm(req, {
          queryString: {
            allowDots: false,
          },
        })
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify(body))
      } catch (error) {
        res.writeHead(error.status)
        res.end(error.message)
      }
    })

    const { body } = await supertest(server).post('/').type('form').send('a.b=1&a.c=2').expect(200)
    assert.deepEqual(body.parsed, { 'a.b': '1', 'a.c': '2' })
  })

  test('JSON poisoning: remove inline __proto__ properties', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      try {
        const body = await parseForm(req, {
          queryString: {
            allowDots: false,
          },
        })
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify(body))
      } catch (error) {
        res.writeHead(error.status)
        res.end(error.message)
      }
    })

    const { body } = await supertest(server)
      .post('/')
      .type('form')
      .send('foo=bar&__proto__[admin]=true')
      .expect(200)

    assert.notProperty(body, 'admin')
  })

  test('convert empty string to null', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      try {
        const body = await parseForm(req, {
          convertEmptyStringsToNull: true,
        })
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify(body))
      } catch (error) {
        res.writeHead(error.status)
        res.end(error.message)
      }
    })

    const { body } = await supertest(server)
      .post('/')
      .type('form')
      .send({ foo: { bar: '' } })
      .expect(200)

    assert.deepEqual(body.parsed, { foo: { bar: null } })
  })

  test('do not convert empty string to null when not enabled', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      try {
        const body = await parseForm(req, {
          convertEmptyStringsToNull: false,
        })
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify(body))
      } catch (error) {
        res.writeHead(error.status)
        res.end(error.message)
      }
    })

    const { body } = await supertest(server)
      .post('/')
      .type('form')
      .send({ foo: { bar: '' } })
      .expect(200)

    assert.deepEqual(body.parsed, { foo: { bar: '' } })
  })

  test('do not convert empty keys to null', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      try {
        const body = await parseForm(req, {
          convertEmptyStringsToNull: true,
        })
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify(body))
      } catch (error) {
        res.writeHead(error.status)
        res.end(error.message)
      }
    })

    const { body } = await supertest(server)
      .post('/')
      .type('form')
      .send({ foo: { '': 'foo', 'a': 'b' } })
      .expect(200)

    assert.deepEqual(body.parsed, { foo: { 0: 'foo', a: 'b' } })
  })
})
