/*
* @adonisjs/bodyparser
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

import { join } from 'path'
import { homedir } from 'os'
import * as test from 'japa'
import { merge } from 'lodash'
import { createServer } from 'http'
import { pathExists } from 'fs-extra'
import * as supertest from 'supertest'
import { HttpContext } from '@poppinss/http-server'
import { BodyParserMiddleware } from '../src/BodyParser'
import { Multipart } from '../src/Multipart'
import { config } from '../config/index'

const PACKAGE_FILE_PATH = join(__dirname, '../package.json')
const PACKAGE_FILE_SIZE = Buffer.from(
  JSON.stringify(require('../package.json'), null, 2),
  'utf-8',
).length + 1

test.group('BodyParser Middleware | generic', () => {
  test('do not parse get requests', async (assert) => {
    const server = createServer(async (req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)
      const middleware = new BodyParserMiddleware(config)

      await middleware.handle(ctx, async () => {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify(ctx.request.all()))
      })
    })

    const { body } = await supertest(server)
      .get('/')
      .type('json')
      .send({ username: 'virk' })

    assert.deepEqual(body, {})
  })

  test('by pass when body is empty', async (assert) => {
    const server = createServer(async (req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)
      const middleware = new BodyParserMiddleware(config)

      await middleware.handle(ctx, async () => {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify(ctx.request.all()))
      })
    })

    const { body } = await supertest(server)
      .post('/')
      .type('json')

    assert.deepEqual(body, {})
  })

  test('by pass when content type is not supported', async (assert) => {
    const server = createServer(async (req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)
      const middleware = new BodyParserMiddleware(config)

      await middleware.handle(ctx, async () => {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify(ctx.request.all()))
      })
    })

    const { body } = await supertest(server)
      .post('/')
      .set('content-type', 'my-type')
      .send(JSON.stringify({ username: 'virk' }))

    assert.deepEqual(body, {})
  })
})

test.group('BodyParser Middleware | form data', () => {
  test('handle request with form data', async (assert) => {
    const server = createServer(async (req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)
      const middleware = new BodyParserMiddleware(config)

      await middleware.handle(ctx, async () => {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify(ctx.request.all()))
      })
    })

    const { body } = await supertest(server)
      .post('/')
      .type('form')
      .send({ username: 'virk' })

    assert.deepEqual(body, { username: 'virk' })
  })

  test('abort if request size is over limit', async (assert) => {
    const server = createServer(async (req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)
      const middleware = new BodyParserMiddleware(merge({}, config, {
        form: {
          limit: 2,
        },
      }))

      try {
        await middleware.handle(ctx, async () => {
        })
      } catch (error) {
        res.writeHead(error.status)
        res.end(error.message)
      }
    })

    const { text } = await supertest(server)
      .post('/')
      .type('form')
      .send({ username: 'virk' })
      .expect(413)

    assert.deepEqual(text, 'E_REQUEST_ENTITY_TOO_LARGE: request entity too large')
  })

  test('abort if specified encoding is not supported', async (assert) => {
    const server = createServer(async (req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)
      const middleware = new BodyParserMiddleware(merge({}, config, {
        form: {
          encoding: 'foo',
        },
      }))

      try {
        await middleware.handle(ctx, async () => {
        })
      } catch (error) {
        res.writeHead(error.status)
        res.end(error.message)
      }
    })

    const { text } = await supertest(server)
      .post('/')
      .type('form')
      .send({ username: 'virk' })
      .expect(415)

    assert.deepEqual(text, 'E_ENCODING_UNSUPPORTED: specified encoding unsupported')
  })

  test('ignore fields with empty name', async (assert) => {
    const server = createServer(async (req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)
      const middleware = new BodyParserMiddleware(config)

      await middleware.handle(ctx, async () => {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify(ctx.request.all()))
      })
    })

    const { body } = await supertest(server)
      .post('/')
      .type('form')
      .send({ '': 'virk' })

    assert.deepEqual(body, {})
  })
})

test.group('BodyParser Middleware | json', () => {
  test('handle request with json body', async (assert) => {
    const server = createServer(async (req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)
      const middleware = new BodyParserMiddleware(config)

      await middleware.handle(ctx, async () => {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify(ctx.request.all()))
      })
    })

    const { body } = await supertest(server)
      .post('/')
      .type('json')
      .send({ username: 'virk' })

    assert.deepEqual(body, { username: 'virk' })
  })

  test('abort if request size is over limit', async (assert) => {
    const server = createServer(async (req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)
      const middleware = new BodyParserMiddleware(merge({}, config, {
        json: {
          limit: 2,
        },
      }))

      try {
        await middleware.handle(ctx, async () => {
        })
      } catch (error) {
        res.writeHead(error.status)
        res.end(error.message)
      }
    })

    const { text } = await supertest(server)
      .post('/')
      .type('json')
      .send({ username: 'virk' })
      .expect(413)

    assert.deepEqual(text, 'E_REQUEST_ENTITY_TOO_LARGE: request entity too large')
  })

  test('ignore fields with empty name', async (assert) => {
    const server = createServer(async (req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)
      const middleware = new BodyParserMiddleware(config)

      await middleware.handle(ctx, async () => {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify(ctx.request.all()))
      })
    })

    const { body } = await supertest(server)
      .post('/')
      .type('json')
      .send({ '': 'virk' })

    assert.deepEqual(body, { '': 'virk' })
  })
})

test.group('BodyParser Middleware | raw body', () => {
  test('handle request with raw body', async (assert) => {
    const server = createServer(async (req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)
      const middleware = new BodyParserMiddleware(config)

      await middleware.handle(ctx, async () => {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(ctx.request.raw())
      })
    })

    const { body } = await supertest(server)
      .post('/')
      .type('text')
      .send(JSON.stringify({ username: 'virk' }))

    assert.deepEqual(body, { username: 'virk' })
  })

  test('abort if request size is over limit', async (assert) => {
    const server = createServer(async (req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)
      const middleware = new BodyParserMiddleware(merge({}, config, {
        raw: {
          limit: 2,
        },
      }))

      try {
        await middleware.handle(ctx, async () => {
        })
      } catch (error) {
        res.writeHead(error.status)
        res.end(error.message)
      }
    })

    const { text } = await supertest(server)
      .post('/')
      .type('text')
      .send(JSON.stringify({ username: 'virk' }))
      .expect(413)

    assert.deepEqual(text, 'E_REQUEST_ENTITY_TOO_LARGE: request entity too large')
  })
})

test.group('BodyParser Middleware | multipart', () => {
  test('handle request with just files', async (assert) => {
    const server = createServer(async (req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)
      const middleware = new BodyParserMiddleware(config)

      await middleware.handle(ctx, async () => {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify({
          tmpPath: ctx.request['_files'].package.tmpPath,
          size: ctx.request['_files'].package.size,
        }))
      })
    })

    const { body } = await supertest(server)
      .post('/')
      .attach('package', PACKAGE_FILE_PATH)

    assert.isAbove(body.size, 0)
    assert.exists(body.tmpPath)
  })

  test('handle request with files and fields', async (assert) => {
    const server = createServer(async (req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)
      const middleware = new BodyParserMiddleware(config)

      await middleware.handle(ctx, async () => {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify({
          size: ctx.request['_files'].package.size,
          username: ctx.request.input('username'),
        }))
      })
    })

    const { body } = await supertest(server)
      .post('/')
      .attach('package', PACKAGE_FILE_PATH)
      .field('username', 'virk')

    assert.isAbove(body.size, 0)
    assert.equal(body.username, 'virk')
  })

  test('handle request array of files', async (assert) => {
    const server = createServer(async (req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)
      const middleware = new BodyParserMiddleware(config)

      await middleware.handle(ctx, async () => {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify({
          multiple: Array.isArray(ctx.request['_files'].package),
        }))
      })
    })

    const { body } = await supertest(server)
      .post('/')
      .attach('package[]', PACKAGE_FILE_PATH)
      .attach('package[]', PACKAGE_FILE_PATH)

    assert.deepEqual(body, { multiple: true })
  })

  test('abort request when total bytes are over limit', async (assert) => {
    let index = 0

    const server = createServer(async (req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)
      const middleware = new BodyParserMiddleware(merge({}, config, {
        multipart: {
          autoProcess: true,
          tmpFileName () {
            return `${index++}.tmp`
          },
          types: ['multipart/form-data'],
          limit: (PACKAGE_FILE_SIZE * 2) - 10,
        },
      }))

      try {
        await middleware.handle(ctx, async () => {})
      } catch (error) {
        res.writeHead(error.status)
        res.end(error.message)
      }
    })

    const { text } = await supertest(server)
      .post('/')
      .attach('package[]', PACKAGE_FILE_PATH)
      .attach('package[]', PACKAGE_FILE_PATH)

    assert.equal(text, 'E_REQUEST_ENTITY_TOO_LARGE: request entity too large')

    const file1 = await pathExists(join(homedir(), '0.tmp'))
    const file2 = await pathExists(join(homedir(), '1.tmp'))

    assert.isTrue(file1)
    assert.isFalse(file2)
  })

  test('handle request with empty field name', async (assert) => {
    const server = createServer(async (req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)
      const middleware = new BodyParserMiddleware(config)

      await middleware.handle(ctx, async () => {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify(ctx.request.all()))
      })
    })

    const { body } = await supertest(server)
      .post('/')
      .attach('package', PACKAGE_FILE_PATH)
      .field('', 'virk')

    assert.deepEqual(body, {})
  })

  test('handle request with empty file name', async (assert) => {
    const server = createServer(async (req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)
      const middleware = new BodyParserMiddleware(config)

      await middleware.handle(ctx, async () => {
        res.writeHead(200)
        res.end(String(Object.keys(ctx.request['_files']).length))
      })
    })

    const { text } = await supertest(server)
      .post('/')
      .attach('', PACKAGE_FILE_PATH)

    assert.deepEqual(text, '0')
  })

  test('do not process request when autoProcess is false', async (assert) => {
    assert.plan(2)

    const server = createServer(async (req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)
      const middleware = new BodyParserMiddleware(merge({}, config, {
        multipart: {
          autoProcess: false,
        },
      }))

      await middleware.handle(ctx, async () => {
        assert.isUndefined(ctx.request['_files'])
        assert.instanceOf(ctx.request['multipart'], Multipart)
        res.end()
      })
    })

    await supertest(server)
      .post('/')
      .attach('package', PACKAGE_FILE_PATH)
      .field('username', 'virk')
  })

  test('do not process request when processManually static route matches', async (assert) => {
    assert.plan(2)

    const server = createServer(async (req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)
      const middleware = new BodyParserMiddleware(merge({}, config, {
        multipart: {
          autoProcess: true,
          processManually: ['/'],
        },
      }))

      await middleware.handle(ctx, async () => {
        assert.isUndefined(ctx.request['_files'])
        assert.instanceOf(ctx.request['multipart'], Multipart)
        res.end()
      })
    })

    await supertest(server)
      .post('/')
      .attach('package', PACKAGE_FILE_PATH)
      .field('username', 'virk')
  })

  test('do not process request when processManually has dynamic route', async (assert) => {
    assert.plan(2)

    const server = createServer(async (req, res) => {
      const ctx = HttpContext.create('/project/:id/file', { id: 1 }, req, res)
      const middleware = new BodyParserMiddleware(merge({}, config, {
        multipart: {
          autoProcess: true,
          processManually: ['/project/:id/file'],
        },
      }))

      await middleware.handle(ctx, async () => {
        assert.isUndefined(ctx.request['_files'])
        assert.instanceOf(ctx.request['multipart'], Multipart)
        res.end()
      })
    })

    await supertest(server)
      .post('/')
      .attach('package', PACKAGE_FILE_PATH)
      .field('username', 'virk')
  })
})
