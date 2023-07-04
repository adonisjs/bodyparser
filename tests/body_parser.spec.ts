/*
 * @adonisjs/bodyparser
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import 'reflect-metadata'
import { fetch } from 'undici'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import supertest from 'supertest'
import { test } from '@japa/runner'
import { createServer } from 'node:http'
import {
  RequestFactory,
  ResponseFactory,
  HttpContextFactory,
} from '@adonisjs/http-server/factories'
import { Multipart } from '../src/multipart/main.js'
import { MultipartFile } from '../src/multipart/file.js'
import { BodyParserMiddlewareFactory } from '../factories/middleware_factory.js'
import { packageFilePath, packageFileSize, unicornFilePath } from '../test_helpers/main.js'

test.group('BodyParser Middleware', () => {
  test('do not parse get requests', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const middleware = new BodyParserMiddlewareFactory().create()

      await middleware.handle(ctx, async () => {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify(ctx.request.all()))
      })
    })

    const { body } = await supertest(server).get('/').type('json').send({ username: 'virk' })

    assert.deepEqual(body, {})
  })

  test('by pass when body is empty', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const middleware = new BodyParserMiddlewareFactory().create()

      await middleware.handle(ctx, async () => {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify(ctx.request.all()))
      })
    })

    const { body } = await supertest(server).post('/').type('json')

    assert.deepEqual(body, {})
  })

  test('by pass when content type is not supported', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const middleware = new BodyParserMiddlewareFactory().create()

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
  test('handle request with form data', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const middleware = new BodyParserMiddlewareFactory().create()

      await middleware.handle(ctx, async () => {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify(ctx.request.all()))
      })
    })

    const { body } = await supertest(server).post('/').type('form').send({ username: 'virk' })

    assert.deepEqual(body, { username: 'virk' })
  })

  test('abort if request size is over limit', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const middleware = new BodyParserMiddlewareFactory()
        .merge({
          form: {
            limit: 2,
          },
        })
        .create()

      try {
        await middleware.handle(ctx, async () => {})
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

    assert.deepEqual(text, 'request entity too large')
  })

  test('abort if specified encoding is not supported', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const middleware = new BodyParserMiddlewareFactory()
        .merge({
          form: {
            encoding: 'foo',
          },
        })
        .create()

      try {
        await middleware.handle(ctx, async () => {})
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

    assert.deepEqual(text, 'specified encoding unsupported')
  })

  test('ignore fields with empty name', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const middleware = new BodyParserMiddlewareFactory().create()

      await middleware.handle(ctx, async () => {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify(ctx.request.all()))
      })
    })

    const { body } = await supertest(server).post('/').type('form').send({ '': 'virk' })
    assert.deepEqual(body, {})
  })

  test('convert empty strings to null', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const middleware = new BodyParserMiddlewareFactory().create()

      await middleware.handle(ctx, async () => {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify(ctx.request.all()))
      })
    })

    const { body } = await supertest(server).post('/').type('form').send({ name: '' })

    assert.deepEqual(body, {
      name: null,
    })
  })

  test('abort when multipart body is invalid', async ({ assert, cleanup }) => {
    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const middleware = new BodyParserMiddlewareFactory().create()

      try {
        await middleware.handle(ctx, async () => {})
      } catch (error) {
        res.writeHead(error.status)
        res.end(error.message)
      }
    })
    cleanup(() => {
      server.close()
    })

    await new Promise<void>((resolve) => server.listen(3333, 'localhost', () => resolve()))

    const response = await fetch('http://localhost:3333', {
      method: 'POST',
      headers: {
        'Content-type': `multipart/form-data; boundary=9d01a3fb93deedb4d0a81389271d097f28fd67e2fcbff2932befc0458ad7`,
      },
      body: '--9d01a3fb93deedb4d0a81389271d097f28fd67e2fcbff2932befc0458ad7\x0d\x0aContent-Disposition: form-data; name="test"; filename="csv_files/test.csv"\x0d\x0aContent-Type: application/octet-stream\x0d\x0a\x0d\x0atest123',
    })

    assert.equal(await response.text(), 'Invalid multipart request')
  })

  test('abort when multipart body is invalid newline characters', async ({ assert, cleanup }) => {
    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const middleware = new BodyParserMiddlewareFactory().create()

      try {
        await middleware.handle(ctx, async () => {})
      } catch (error) {
        res.writeHead(error.status)
        res.end(error.message)
      }
    })

    cleanup(() => {
      server.close()
    })
    await new Promise<void>((resolve) => server.listen(3333, 'localhost', () => resolve()))

    const response = await fetch('http://localhost:3333', {
      method: 'POST',
      headers: {
        'Content-type': `multipart/form-data; boundary=XXX`,
      },
      body: '--XXX\nContent-Disposition: form-data; name="file"; filename="filename.csv"\nContent-Type: text/csv\n\nA,B,C\n1,1.1,name1\n2,2.2,name2\n\n--XXX--',
    })

    assert.equal(await response.text(), 'Expected CR Received 10')
  })
})

test.group('BodyParser Middleware | json', () => {
  test('handle request with json body', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const middleware = new BodyParserMiddlewareFactory().create()

      await middleware.handle(ctx, async () => {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify(ctx.request.all()))
      })
    })

    const { body } = await supertest(server).post('/').type('json').send({ username: 'virk' })

    assert.deepEqual(body, { username: 'virk' })
  })

  test('abort if request size is over limit', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const middleware = new BodyParserMiddlewareFactory()
        .merge({
          json: {
            limit: 2,
          },
        })
        .create()

      try {
        await middleware.handle(ctx, async () => {})
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

    assert.deepEqual(text, 'request entity too large')
  })

  test('ignore fields with empty name', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const middleware = new BodyParserMiddlewareFactory().create()

      await middleware.handle(ctx, async () => {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify(ctx.request.all()))
      })
    })

    const { body } = await supertest(server).post('/').type('json').send({ '': 'virk' })

    assert.deepEqual(body, { '': 'virk' })
  })

  test('convert empty strings to null', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const middleware = new BodyParserMiddlewareFactory().create()

      await middleware.handle(ctx, async () => {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify(ctx.request.all()))
      })
    })

    const { body } = await supertest(server).post('/').type('json').send({ name: '' })

    assert.deepEqual(body, {
      name: null,
    })
  })
})

test.group('BodyParser Middleware | raw body', () => {
  test('handle request with raw body', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const middleware = new BodyParserMiddlewareFactory().create()

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

  test('abort if request size is over limit', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const middleware = new BodyParserMiddlewareFactory()
        .merge({
          raw: {
            limit: 2,
          },
        })
        .create()

      try {
        await middleware.handle(ctx, async () => {})
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

    assert.deepEqual(text, 'request entity too large')
  })
})

test.group('BodyParser Middleware | multipart', () => {
  test('handle request with just files', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const middleware = new BodyParserMiddlewareFactory().create()

      await middleware.handle(ctx, async () => {
        const pkgFile = ctx.request['__raw_files'].package as MultipartFile

        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(
          JSON.stringify({
            tmpPath: pkgFile.tmpPath,
            size: pkgFile.size,
            validated: pkgFile.validated,
          })
        )
      })
    })

    const { body } = await supertest(server).post('/').attach('package', packageFilePath)

    assert.isAbove(body.size, 0)
    assert.exists(body.tmpPath)
    assert.isFalse(body.validated)
  })

  test('handle request with files and fields', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const middleware = new BodyParserMiddlewareFactory().create()

      await middleware.handle(ctx, async () => {
        const pkgFile = ctx.request['__raw_files'].package as MultipartFile

        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(
          JSON.stringify({
            size: pkgFile.size,
            validated: pkgFile.validated,
            username: ctx.request.input('username'),
          })
        )
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

  test('handle request array of files', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const middleware = new BodyParserMiddlewareFactory().create()

      await middleware.handle(ctx, async () => {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(
          JSON.stringify({
            multiple: Array.isArray(ctx.request['__raw_files'].package),
          })
        )
      })
    })

    const { body } = await supertest(server)
      .post('/')
      .attach('package[]', packageFilePath)
      .attach('package[]', packageFilePath)

    assert.deepEqual(body, { multiple: true })
  })

  test('abort request when total bytes are over limit', async ({ assert, fs }) => {
    let index = 0

    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const middleware = new BodyParserMiddlewareFactory()
        .merge({
          multipart: {
            tmpFileName() {
              return `${index++}.tmp`
            },
            limit: packageFileSize * 2 - 10,
          },
        })
        .create()

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

    assert.equal(text, 'request entity too large')

    const file1 = await fs.adapter.pathExists(join(tmpdir(), '0.tmp'))
    const file2 = await fs.adapter.pathExists(join(tmpdir(), '1.tmp'))

    assert.isTrue(file1)
    assert.isFalse(file2)
  })

  test('handle request with empty field name', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const middleware = new BodyParserMiddlewareFactory().create()

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

  test('handle request with empty file name', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const middleware = new BodyParserMiddlewareFactory().create()

      await middleware.handle(ctx, async () => {
        res.writeHead(200)
        res.end(String(Object.keys(ctx.request['__raw_files']).length))
      })
    })

    const { text } = await supertest(server).post('/').attach('', packageFilePath)

    assert.deepEqual(text, '0')
  })

  test('do not process request when autoProcess is false', async ({ assert }) => {
    assert.plan(2)

    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const middleware = new BodyParserMiddlewareFactory()
        .merge({
          multipart: {
            autoProcess: false,
          },
        })
        .create()

      await middleware.handle(ctx, async () => {
        assert.deepEqual(ctx.request['__raw_files'], {})
        assert.instanceOf(ctx.request['multipart'], Multipart)
        await ctx.request['multipart'].process()
        res.end()
      })
    })

    await supertest(server).post('/').attach('package', packageFilePath).field('username', 'virk')
  }).retry(3)

  test('do not process request when processManually static route matches', async ({ assert }) => {
    assert.plan(2)

    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      ctx.route = {
        pattern: '/',
        execute: () => {},
        handler: () => {},
        meta: {},
        middleware: {} as any,
      }

      const middleware = new BodyParserMiddlewareFactory()
        .merge({
          multipart: {
            autoProcess: true,
            processManually: ['/'],
          },
        })
        .create()

      await middleware.handle(ctx, async () => {
        assert.deepEqual(ctx.request.__raw_files, {})
        assert.instanceOf(ctx.request.multipart, Multipart)
        await ctx.request.multipart.process()
        res.end()
      })
    })

    await supertest(server).post('/').attach('package', packageFilePath).field('username', 'virk')
  }).retry(3)

  test('do not process request when processManually has dynamic route', async ({ assert }) => {
    assert.plan(2)

    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      ctx.route = {
        pattern: '/project/:id/file',
        execute: () => {},
        handler: () => {},
        meta: {},
        middleware: {} as any,
      }

      const middleware = new BodyParserMiddlewareFactory()
        .merge({
          multipart: {
            autoProcess: true,
            processManually: ['/project/:id/file'],
          },
        })
        .create()

      await middleware.handle(ctx, async () => {
        assert.deepEqual(ctx.request['__raw_files'], {})
        assert.instanceOf(ctx.request['multipart'], Multipart)
        await ctx.request['multipart'].process()
        res.end()
      })
    })

    await supertest(server).post('/').attach('package', packageFilePath).field('username', 'virk')
  })

  test('do not process request when autoProcess route does not match', async ({ assert }) => {
    assert.plan(2)

    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      ctx.route = {
        pattern: '/project/:id/file',
        execute: () => {},
        handler: () => {},
        meta: {},
        middleware: {} as any,
      }

      const middleware = new BodyParserMiddlewareFactory()
        .merge({
          multipart: {
            autoProcess: ['/projects/:id/assets'],
          },
        })
        .create()

      await middleware.handle(ctx, async () => {
        assert.deepEqual(ctx.request['__raw_files'], {})
        assert.instanceOf(ctx.request['multipart'], Multipart)
        await ctx.request['multipart'].process()
        res.end()
      })
    })

    await supertest(server).post('/').attach('package', packageFilePath).field('username', 'virk')
  })

  test('process request when autoProcess route does matches', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      ctx.route = {
        pattern: '/projects/:id/assets',
        execute: () => {},
        handler: () => {},
        meta: {},
        middleware: {} as any,
      }

      const middleware = new BodyParserMiddlewareFactory()
        .merge({
          multipart: {
            autoProcess: ['/projects/:id/assets'],
          },
        })
        .create()

      await middleware.handle(ctx, async () => {
        const pkgFile = ctx.request['__raw_files'].package as MultipartFile

        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(
          JSON.stringify({
            tmpPath: pkgFile.tmpPath,
            size: pkgFile.size,
            validated: pkgFile.validated,
          })
        )
      })
    })

    const { body } = await supertest(server).post('/').attach('package', packageFilePath)

    assert.isAbove(body.size, 0)
    assert.exists(body.tmpPath)
    assert.isFalse(body.validated)
  })

  test('detect file ext and mime type using magic number', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const middleware = new BodyParserMiddlewareFactory().create()

      await middleware.handle(ctx, async () => {
        const avatar = ctx.request['__raw_files'].avatar as MultipartFile

        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(
          JSON.stringify({
            type: avatar.type,
            subtype: avatar.subtype,
            extname: avatar.extname,
          })
        )
      })
    })

    const { body } = await supertest(server).post('/').attach('avatar', unicornFilePath, {
      contentType: 'application/json',
    })

    assert.deepEqual(body, {
      type: 'image',
      subtype: 'png',
      extname: 'png',
    })
  })

  test('validate file when access via request.file method', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const middleware = new BodyParserMiddlewareFactory().create()

      await middleware.handle(ctx, async () => {
        res.writeHead(200, { 'content-type': 'application/json' })
        const pkgFile = ctx.request.file('package', { size: 10 })!

        res.end(
          JSON.stringify({
            tmpPath: pkgFile.tmpPath!,
            size: pkgFile.size,
            validated: pkgFile.validated,
            isValid: pkgFile.isValid,
            errors: pkgFile.errors,
          })
        )
      })
    })

    const { body } = await supertest(server).post('/').attach('package', packageFilePath)

    assert.equal(body.size, packageFileSize)
    assert.exists(body.tmpPath)
    assert.isTrue(body.validated)
    assert.isFalse(body.isValid)
    assert.deepEqual(body.errors, [
      {
        fieldName: 'package',
        clientName: 'package.json',
        message: 'File size should be less than 10B',
        type: 'size',
      },
    ])
  })

  test('validate array of files when access via request.file method', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const middleware = new BodyParserMiddlewareFactory().create()

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

    assert.deepEqual(body[0].errors, [
      {
        fieldName: 'package[0]',
        clientName: 'package.json',
        message: 'File size should be less than 10B',
        type: 'size',
      },
    ])

    assert.deepEqual(body[1].errors, [
      {
        fieldName: 'package[1]',
        clientName: 'package.json',
        message: 'File size should be less than 10B',
        type: 'size',
      },
    ])
  })

  test('pull first file even when source is an array', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const middleware = new BodyParserMiddlewareFactory().create()

      await middleware.handle(ctx, async () => {
        res.writeHead(200, { 'content-type': 'application/json' })
        const pkgFile = ctx.request.file('package', { size: 10 })!

        res.end(
          JSON.stringify({
            tmpPath: pkgFile.tmpPath!,
            size: pkgFile.size,
            validated: pkgFile.validated,
            isValid: pkgFile.isValid,
            errors: pkgFile.errors,
          })
        )
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
    assert.deepEqual(body.errors, [
      {
        fieldName: 'package[0]',
        clientName: 'package.json',
        message: 'File size should be less than 10B',
        type: 'size',
      },
    ])
  })

  test("return null when file doesn't exists", async ({ assert }) => {
    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const middleware = new BodyParserMiddlewareFactory().create()

      await middleware.handle(ctx, async () => {
        res.writeHead(200, { 'content-type': 'application/json' })
        const pkgFile = ctx.request.file('package', { size: 10 })
        res.end(JSON.stringify(pkgFile))
      })
    })

    const { body } = await supertest(server).post('/')
    assert.isNull(body)
  })

  test("return empty array file doesn't exists", async ({ assert }) => {
    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const middleware = new BodyParserMiddlewareFactory().create()

      await middleware.handle(ctx, async () => {
        res.writeHead(200, { 'content-type': 'application/json' })
        const pkgFile = ctx.request.files('package', { size: 10 })
        res.end(JSON.stringify(pkgFile))
      })
    })

    const { body } = await supertest(server).post('/')
    assert.deepEqual(body, [])
  })

  test('get file from nested object', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const middleware = new BodyParserMiddlewareFactory().create()

      await middleware.handle(ctx, async () => {
        res.writeHead(200, { 'content-type': 'application/json' })
        const pkgFile = ctx.request.file('user.package')!

        res.end(
          JSON.stringify({
            tmpPath: pkgFile.tmpPath!,
            size: pkgFile.size,
            validated: pkgFile.validated,
            isValid: pkgFile.isValid,
            errors: pkgFile.errors,
          })
        )
      })
    })

    const { body } = await supertest(server).post('/').attach('user.package', packageFilePath)

    assert.equal(body.size, packageFileSize)
    assert.exists(body.tmpPath)
    assert.isTrue(body.validated)
    assert.isTrue(body.isValid)
    assert.deepEqual(body.errors, [])
  })

  test('move file to a given location', async ({ assert, fs }) => {
    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const middleware = new BodyParserMiddlewareFactory().create()

      await middleware.handle(ctx, async () => {
        const pkgFile = ctx.request.file('package')!

        try {
          await pkgFile.move(fs.basePath)
          assert.equal(pkgFile.state, 'moved')
          res.writeHead(200, { 'content-type': 'application/json' })
          res.end()
        } catch (error) {
          res.writeHead(500, { 'content-type': 'application/json' })
          res.end(error.message)
        }
      })
    })

    await supertest(server).post('/').attach('package', packageFilePath).expect(200)

    const uploadedFileContents = await fs.contents('package.json')
    const originalFileContents = await fs.adapter.readFile(packageFilePath, 'utf-8')
    assert.equal(uploadedFileContents, originalFileContents)
  })

  test('move file with custom name', async ({ assert, fs }) => {
    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const middleware = new BodyParserMiddlewareFactory().create()

      await middleware.handle(ctx, async () => {
        const pkgFile = ctx.request.file('package')!

        try {
          await pkgFile.move(fs.basePath, {
            name: `myapp.${pkgFile.subtype}`,
          })
          assert.equal(pkgFile.state, 'moved')
          res.writeHead(200, { 'content-type': 'application/json' })
          res.end()
        } catch (error) {
          res.writeHead(500, { 'content-type': 'application/json' })
          res.end(error.message)
        }
      })
    })

    await supertest(server).post('/').attach('package', packageFilePath).expect(200)

    const uploadedFileContents = await fs.contents('myapp.json')
    const originalFileContents = await fs.adapter.readFile(packageFilePath, 'utf-8')
    assert.equal(uploadedFileContents, originalFileContents)
  })

  test('raise error when destination file already exists', async ({ assert, fs }) => {
    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const middleware = new BodyParserMiddlewareFactory().create()

      await middleware.handle(ctx, async () => {
        const pkgFile = ctx.request.file('package')!

        try {
          await pkgFile.move(fs.basePath, { overwrite: false })
        } catch (error) {
          assert.equal(
            error.message,
            `"package.json" already exists at "${fs.basePath}". Set "overwrite = true" to overwrite it`
          )
          assert.equal(pkgFile.state, 'consumed')
          res.writeHead(200, { 'content-type': 'application/json' })
          res.end()
        }
      })
    })

    await fs.create('package.json', JSON.stringify({}))
    await supertest(server).post('/').attach('package', packageFilePath).expect(200)
  })

  test('validate file extension and file size seperately', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const middleware = new BodyParserMiddlewareFactory().create()

      await middleware.handle(ctx, async () => {
        res.writeHead(200, { 'content-type': 'application/json' })
        const pkgFile = ctx.request.file('package')!
        pkgFile.sizeLimit = 10
        pkgFile.validate()

        pkgFile.allowedExtensions = ['jpg']
        pkgFile.validate()

        res.end(
          JSON.stringify({
            tmpPath: pkgFile.tmpPath!,
            size: pkgFile.size,
            validated: pkgFile.validated,
            isValid: pkgFile.isValid,
            errors: pkgFile.errors,
          })
        )
      })
    })

    const { body } = await supertest(server).post('/').attach('package', packageFilePath)

    assert.equal(body.size, packageFileSize)
    assert.exists(body.tmpPath)
    assert.isTrue(body.validated)
    assert.isFalse(body.isValid)
    assert.deepEqual(body.errors, [
      {
        fieldName: 'package',
        clientName: 'package.json',
        message: 'File size should be less than 10B',
        type: 'size',
      },
      {
        fieldName: 'package',
        clientName: 'package.json',
        message: 'Invalid file extension json. Only jpg is allowed',
        type: 'extname',
      },
    ])
  })

  test('calling validate multiple times must be a noop', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const middleware = new BodyParserMiddlewareFactory().create()

      await middleware.handle(ctx, async () => {
        res.writeHead(200, { 'content-type': 'application/json' })
        const pkgFile = ctx.request.file('package')!
        pkgFile.sizeLimit = 10
        pkgFile.validate()
        pkgFile.validate()
        pkgFile.validate()

        pkgFile.allowedExtensions = ['jpg']
        pkgFile.validate()
        pkgFile.validate()
        pkgFile.validate()

        res.end(
          JSON.stringify({
            tmpPath: pkgFile.tmpPath!,
            size: pkgFile.size,
            validated: pkgFile.validated,
            isValid: pkgFile.isValid,
            errors: pkgFile.errors,
          })
        )
      })
    })

    const { body } = await supertest(server).post('/').attach('package', packageFilePath)

    assert.equal(body.size, packageFileSize)
    assert.exists(body.tmpPath)
    assert.isTrue(body.validated)
    assert.isFalse(body.isValid)
    assert.deepEqual(body.errors, [
      {
        fieldName: 'package',
        clientName: 'package.json',
        message: 'File size should be less than 10B',
        type: 'size',
      },
      {
        fieldName: 'package',
        clientName: 'package.json',
        message: 'Invalid file extension json. Only jpg is allowed',
        type: 'extname',
      },
    ])
  })

  test('validate file size using request.file method and extension manually', async ({
    assert,
  }) => {
    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const middleware = new BodyParserMiddlewareFactory().create()

      await middleware.handle(ctx, async () => {
        res.writeHead(200, { 'content-type': 'application/json' })
        const pkgFile = ctx.request.file('package', { size: 10 })!

        pkgFile.allowedExtensions = ['jpg']
        pkgFile.validate()

        res.end(
          JSON.stringify({
            tmpPath: pkgFile.tmpPath!,
            size: pkgFile.size,
            validated: pkgFile.validated,
            isValid: pkgFile.isValid,
            errors: pkgFile.errors,
          })
        )
      })
    })

    const { body } = await supertest(server).post('/').attach('package', packageFilePath)

    assert.equal(body.size, packageFileSize)
    assert.exists(body.tmpPath)
    assert.isTrue(body.validated)
    assert.isFalse(body.isValid)
    assert.deepEqual(body.errors, [
      {
        fieldName: 'package',
        clientName: 'package.json',
        message: 'File size should be less than 10B',
        type: 'size',
      },
      {
        fieldName: 'package',
        clientName: 'package.json',
        message: 'Invalid file extension json. Only jpg is allowed',
        type: 'extname',
      },
    ])
  })

  test('updating sizeLimit multiple times must not be allowed', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const middleware = new BodyParserMiddlewareFactory().create()

      await middleware.handle(ctx, async () => {
        const pkgFile = ctx.request.file('package', { size: 10 })!

        try {
          pkgFile.sizeLimit = 20
          res.writeHead(200)
          res.end()
        } catch (error) {
          res.writeHead(500)
          res.end(error.message)
        }
      })
    })

    const { text } = await supertest(server)
      .post('/')
      .attach('package', packageFilePath)
      .expect(500)

    assert.equal(text, 'Cannot reset sizeLimit after file has been validated')
  })

  test('updating allowedExtensions multiple times must not be allowed', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const middleware = new BodyParserMiddlewareFactory().create()

      await middleware.handle(ctx, async () => {
        const pkgFile = ctx.request.file('package', { extnames: ['json'] })!

        try {
          pkgFile.allowedExtensions = ['jpg']
          res.writeHead(200)
          res.end()
        } catch (error) {
          res.writeHead(500)
          res.end(error.message)
        }
      })
    })

    const { text } = await supertest(server)
      .post('/')
      .attach('package', packageFilePath)
      .expect(500)

    assert.equal(text, 'Cannot update allowed extension names after file has been validated')
  })

  test('get all files as an object', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const middleware = new BodyParserMiddlewareFactory().create()

      await middleware.handle(ctx, async () => {
        res.writeHead(200, { 'content-type': 'application/json' })
        const allFiles = ctx.request.allFiles()
        const files = Object.keys(allFiles).map((field) => {
          const file = allFiles[field] as MultipartFile
          return {
            field: field,
            tmpPath: file.tmpPath!,
            size: file.size,
            validated: file.validated,
            isValid: file.isValid,
            errors: file.errors,
          }
        })

        res.end(JSON.stringify(files))
      })
    })

    const { body } = await supertest(server).post('/').attach('package', packageFilePath)

    assert.lengthOf(body, 1)
    assert.equal(body[0].size, packageFileSize)
    assert.exists(body[0].tmpPath)
    assert.isFalse(body[0].validated)
    assert.isTrue(body[0].isValid)
    assert.lengthOf(body[0].errors, 0)
  })

  test('convert empty strings to null', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const middleware = new BodyParserMiddlewareFactory().create()

      await middleware.handle(ctx, async () => {
        res.writeHead(200, { 'content-type': 'application/json' })
        const body = ctx.request.all()
        res.end(JSON.stringify(body))
      })
    })

    const { body } = await supertest(server)
      .post('/')
      .attach('package', packageFilePath)
      .field('username', '')

    assert.deepEqual(body, { username: null })
  })
})
