/*
* @adonisjs/bodyparser
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

/// <reference path="../adonis-typings/bodyparser.ts" />
/// <reference path="../adonis-typings/index.ts" />

import { join } from 'path'
import { tmpdir } from 'os'
import * as test from 'japa'
import { merge } from 'lodash'
import { createServer } from 'http'
import { pathExists } from 'fs-extra'
import * as supertest from 'supertest'
import { Request } from '@poppinss/request'
import { HttpContext as BaseHttpContext } from '@poppinss/http-server'
import { HttpContextConstructorContract } from '@ioc:Adonis/Core/HttpContext'

import { config } from '../config/index'
import { Multipart } from '../src/Multipart'
import { BodyParserMiddleware } from '../src/BodyParser'
import extendRequest from '../src/Bindings/Request'

import { packageFilePath, packageFileSize } from '../test-helpers'
extendRequest(Request)

/**
 * The shape of `AdonisJs HTTP context` is bit different from `@poppinss/http-server`. So
 * we need to cast the types here for TS to work.
 */
const HttpContext = BaseHttpContext as unknown as HttpContextConstructorContract

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
          validated: ctx.request['_files'].package.validated,
        }))
      })
    })

    const { body } = await supertest(server)
      .post('/')
      .attach('package', packageFilePath)

    assert.isAbove(body.size, 0)
    assert.exists(body.tmpPath)
    assert.isFalse(body.validated)
  })

  test('handle request with files and fields', async (assert) => {
    const server = createServer(async (req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)
      const middleware = new BodyParserMiddleware(config)

      await middleware.handle(ctx, async () => {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify({
          size: ctx.request['_files'].package.size,
          validated: ctx.request['_files'].package.validated,
          username: ctx.request.input('username'),
        }))
      })
    })

    const { body } = await supertest(server)
      .post('/')
      .attach('package', packageFilePath)
      .field('username', 'virk')

    assert.isAbove(body.size, 0)
    assert.equal(body.username, 'virk')
    assert.isFalse(body.validated)
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
      .attach('package[]', packageFilePath)
      .attach('package[]', packageFilePath)

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
          limit: (packageFileSize * 2) - 10,
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
      .attach('package[]', packageFilePath)
      .attach('package[]', packageFilePath)

    assert.equal(text, 'E_REQUEST_ENTITY_TOO_LARGE: request entity too large')

    const file1 = await pathExists(join(tmpdir(), '0.tmp'))
    const file2 = await pathExists(join(tmpdir(), '1.tmp'))

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
      .attach('package', packageFilePath)
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
      .attach('', packageFilePath)

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
        assert.deepEqual(ctx.request['_files'], {})
        assert.instanceOf(ctx.request['multipart'], Multipart)
        res.end()
      })
    })

    await supertest(server)
      .post('/')
      .attach('package', packageFilePath)
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
        assert.deepEqual(ctx.request['_files'], {})
        assert.instanceOf(ctx.request['multipart'], Multipart)
        res.end()
      })
    })

    await supertest(server)
      .post('/')
      .attach('package', packageFilePath)
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
        assert.deepEqual(ctx.request['_files'], {})
        assert.instanceOf(ctx.request['multipart'], Multipart)
        res.end()
      })
    })

    await supertest(server)
      .post('/')
      .attach('package', packageFilePath)
      .field('username', 'virk')
  })

  test('detect file ext and mime type using magic number', async (assert) => {
    const server = createServer(async (req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)
      const middleware = new BodyParserMiddleware(config)

      await middleware.handle(ctx, async () => {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify({
          type: ctx.request['_files'].avatar.type,
          subtype: ctx.request['_files'].avatar.subtype,
          extname: ctx.request['_files'].avatar.extname,
        }))
      })
    })

    const { body } = await supertest(server)
      .post('/')
      .attach('avatar', join(__dirname, '../unicorn.png'), {
        contentType: 'application/json',
      })

    assert.deepEqual(body, {
      type: 'image',
      subtype: 'png',
      extname: 'png',
    })
  })

  test('validate file when access via request.file method', async (assert) => {
    const server = createServer(async (req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)
      const middleware = new BodyParserMiddleware(config)

      await middleware.handle(ctx, async () => {
        res.writeHead(200, { 'content-type': 'application/json' })
        const pkgFile = ctx.request.file('package', { size: 10 })!

        res.end(JSON.stringify({
          tmpPath: pkgFile.tmpPath!,
          size: pkgFile.size,
          validated: pkgFile.validated,
          isValid: pkgFile.isValid,
          errors: pkgFile.errors,
        }))
      })
    })

    const { body } = await supertest(server)
      .post('/')
      .attach('package', packageFilePath)

    assert.equal(body.size, packageFileSize)
    assert.exists(body.tmpPath)
    assert.isTrue(body.validated)
    assert.isFalse(body.isValid)
    assert.deepEqual(body.errors, [{
      fieldName: 'package',
      clientName: 'package.json',
      message: 'File size should be less than 10B',
      type: 'size',
    }])
  })

  test('validate array of files when access via request.file method', async (assert) => {
    const server = createServer(async (req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)
      const middleware = new BodyParserMiddleware(config)

      await middleware.handle(ctx, async () => {
        res.writeHead(200, { 'content-type': 'application/json' })
        const pkgFiles = ctx.request.files('package', { size: 10 }).map((pkgFile) => {
          return {
            tmpPath: pkgFile.tmpPath!,
            size: pkgFile.size,
            validated: pkgFile.validated,
            isValid: pkgFile.isValid,
            errors: pkgFile.errors,
          }
        })

        res.end(JSON.stringify(pkgFiles))
      })
    })

    const { body } = await supertest(server)
      .post('/')
      .attach('package[0]', packageFilePath)
      .attach('package[1]', packageFilePath)

    assert.lengthOf(body, 2)
    assert.equal(body[0].size, packageFileSize)
    assert.equal(body[1].size, packageFileSize)

    assert.exists(body[0].tmpPath)
    assert.exists(body[1].tmpPath)

    assert.isTrue(body[0].validated)
    assert.isTrue(body[1].validated)

    assert.isFalse(body[0].isValid)
    assert.isFalse(body[1].isValid)

    assert.deepEqual(body[0].errors, [{
      fieldName: 'package[0]',
      clientName: 'package.json',
      message: 'File size should be less than 10B',
      type: 'size',
    }])

    assert.deepEqual(body[1].errors, [{
      fieldName: 'package[1]',
      clientName: 'package.json',
      message: 'File size should be less than 10B',
      type: 'size',
    }])
  })

  test('pull first file even when source is an array', async (assert) => {
    const server = createServer(async (req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)
      const middleware = new BodyParserMiddleware(config)

      await middleware.handle(ctx, async () => {
        res.writeHead(200, { 'content-type': 'application/json' })
        const pkgFile = ctx.request.file('package', { size: 10 })!

        res.end(JSON.stringify({
          tmpPath: pkgFile.tmpPath!,
          size: pkgFile.size,
          validated: pkgFile.validated,
          isValid: pkgFile.isValid,
          errors: pkgFile.errors,
        }))
      })
    })

    const { body } = await supertest(server)
      .post('/')
      .attach('package[0]', packageFilePath)
      .attach('package[1]', packageFilePath)

    assert.equal(body.size, packageFileSize)
    assert.exists(body.tmpPath)
    assert.isTrue(body.validated)
    assert.isFalse(body.isValid)
    assert.deepEqual(body.errors, [{
      fieldName: 'package[0]',
      clientName: 'package.json',
      message: 'File size should be less than 10B',
      type: 'size',
    }])
  })

  test('return null when file doesn\'t exists', async (assert) => {
    const server = createServer(async (req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)
      const middleware = new BodyParserMiddleware(config)

      await middleware.handle(ctx, async () => {
        res.writeHead(200, { 'content-type': 'application/json' })
        const pkgFile = ctx.request.file('package', { size: 10 })
        res.end(JSON.stringify(pkgFile))
      })
    })

    const { body } = await supertest(server).post('/')
    assert.isNull(body)
  })

  test('return empty array file doesn\'t exists', async (assert) => {
    const server = createServer(async (req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)
      const middleware = new BodyParserMiddleware(config)

      await middleware.handle(ctx, async () => {
        res.writeHead(200, { 'content-type': 'application/json' })
        const pkgFile = ctx.request.files('package', { size: 10 })
        res.end(JSON.stringify(pkgFile))
      })
    })

    const { body } = await supertest(server).post('/')
    assert.deepEqual(body, [])
  })

  test('get file from nested object', async (assert) => {
    const server = createServer(async (req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)
      const middleware = new BodyParserMiddleware(config)

      await middleware.handle(ctx, async () => {
        res.writeHead(200, { 'content-type': 'application/json' })
        const pkgFile = ctx.request.file('user.package')!

        res.end(JSON.stringify({
          tmpPath: pkgFile.tmpPath!,
          size: pkgFile.size,
          validated: pkgFile.validated,
          isValid: pkgFile.isValid,
          errors: pkgFile.errors,
        }))
      })
    })

    const { body } = await supertest(server)
      .post('/')
      .attach('user.package', packageFilePath)

    assert.equal(body.size, packageFileSize)
    assert.exists(body.tmpPath)
    assert.isTrue(body.validated)
    assert.isTrue(body.isValid)
    assert.deepEqual(body.errors, [])
  })
})
