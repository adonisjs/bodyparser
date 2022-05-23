/*
 * @adonisjs/bodyparser
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../adonis-typings/bodyparser.ts" />

import { test } from '@japa/runner'
import { join } from 'path'
import supertest from 'supertest'
import { createServer } from 'http'
import { pathExists, remove, createWriteStream } from 'fs-extra'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'

import { Multipart } from '../src/Multipart'
import { File } from '../src/Multipart/File'
import {
  fs,
  sleep,
  setupApp,
  xlsFilePath,
  xlsxFilePath,
  packageFilePath,
  packageFileSize,
} from '../test-helpers'

let app: ApplicationContract

test.group('Multipart', (group) => {
  group.setup(async () => {
    app = await setupApp()
    return () => fs.cleanup()
  })

  test('process file by attaching handler on field name', async ({ assert }) => {
    let files: null | { [key: string]: File } = null

    const server = createServer(async (req, res) => {
      const ctx = app.container.use('Adonis/Core/HttpContext').create('/', {}, req, res)
      const multipart = new Multipart(
        ctx,
        { maxFields: 1000, limit: 8000 },
        app.container.use('Adonis/Core/Drive')
      )

      multipart.onFile('package', {}, (part, reporter) => {
        return new Promise((resolve, reject) => {
          part.on('data', (line) => {
            reporter(line)
          })
          part.on('error', reject)
          part.on('end', resolve)
        })
      })

      await multipart.process()
      files = ctx.request['__raw_files']
      res.end()
    })

    await supertest(server).post('/').attach('package', packageFilePath)
    assert.property(files, 'package')
    assert.isTrue(files!.package.isValid)
    assert.equal(files!.package.state, 'consumed')
    assert.equal(files!.package.size, packageFileSize)
  })

  test('error inside onFile handler should propogate to file errors', async ({ assert }) => {
    let files: null | { [key: string]: File } = null

    const server = createServer(async (req, res) => {
      const ctx = app.container.use('Adonis/Core/HttpContext').create('/', {}, req, res)
      const multipart = new Multipart(
        ctx,
        { maxFields: 1000, limit: 8000 },
        app.container.use('Adonis/Core/Drive')
      )

      multipart.onFile('package', {}, (part, reporter) => {
        return new Promise((_resolve, reject) => {
          part.on('data', (line) => {
            reporter(line)
          })
          part.on('error', reject)
          reject(Error('Cannot process'))
        })
      })

      await multipart.process()
      files = ctx.request['__raw_files'] || null
      res.end()
    })

    await supertest(server).post('/').attach('package', packageFilePath)
    assert.property(files, 'package')
    assert.isFalse(files!.package.isValid)
    assert.equal(files!.package.state, 'consumed')
    assert.deepEqual(files!.package.errors, [
      {
        fieldName: 'package',
        clientName: 'package.json',
        message: 'Cannot process',
        type: 'fatal',
      },
    ])
  })

  test('wait for promise to return even when part has been streamed', async ({ assert }) => {
    let files: null | { [key: string]: File } = null
    const stack: string[] = []

    const server = createServer(async (req, res) => {
      const ctx = app.container.use('Adonis/Core/HttpContext').create('/', {}, req, res)
      const multipart = new Multipart(
        ctx,
        { maxFields: 1000, limit: 8000 },
        app.container.use('Adonis/Core/Drive')
      )

      multipart.onFile('package', {}, async (part, reporter) => {
        part.on('data', (line) => {
          reporter(line)
        })

        stack.push('before')
        part.resume()
        await sleep(100)
        stack.push('after')
      })

      await multipart.process()
      files = ctx.request['__raw_files']
      stack.push('ended')
      res.end()
    })

    await supertest(server).post('/').attach('package', packageFilePath)
    assert.deepEqual(stack, ['before', 'after', 'ended'])
    assert.property(files, 'package')
    assert.isTrue(files!.package.isValid)
    assert.equal(files!.package.state, 'consumed')
    assert.equal(files!.package.size, packageFileSize)
  })

  test('work fine when stream is piped to a destination', async ({ assert }) => {
    const SAMPLE_FILE_PATH = join(__dirname, './sample.json')
    let files: null | { [key: string]: File } = null

    const server = createServer(async (req, res) => {
      const ctx = app.container.use('Adonis/Core/HttpContext').create('/', {}, req, res)
      const multipart = new Multipart(
        ctx,
        { maxFields: 1000, limit: 8000 },
        app.container.use('Adonis/Core/Drive')
      )

      multipart.onFile('package', {}, (part, reporter) => {
        return new Promise((resolve, reject) => {
          part.pause()
          part.on('data', (line) => {
            reporter(line)
          })

          part.on('error', reject)
          part.on('end', resolve)
          part.pipe(createWriteStream(SAMPLE_FILE_PATH))
        })
      })

      await multipart.process()
      files = ctx.request['__raw_files']

      const hasFile = await pathExists(SAMPLE_FILE_PATH)
      res.end(String(hasFile))
    })

    const { text } = await supertest(server).post('/').attach('package', packageFilePath)

    assert.property(files, 'package')
    assert.isTrue(files!.package.isValid)
    assert.equal(files!.package.size, packageFileSize)
    assert.equal(files!.package.state, 'consumed')
    assert.equal(text, 'true')

    await remove(SAMPLE_FILE_PATH)
  })

  test('work fine with array of files', async ({ assert }) => {
    const stack: string[] = []
    let files: null | { [key: string]: File } = null

    const server = createServer(async (req, res) => {
      const ctx = app.container.use('Adonis/Core/HttpContext').create('/', {}, req, res)
      const multipart = new Multipart(
        ctx,
        { maxFields: 1000, limit: 8000 },
        app.container.use('Adonis/Core/Drive')
      )

      multipart.onFile('package', {}, async (part, reporter) => {
        part.on('data', reporter)

        stack.push('before')
        part.resume()
        await sleep(100)
        stack.push('after')
      })

      await multipart.process()
      files = ctx.request['__raw_files']
      stack.push('ended')
      res.end()
    })

    await supertest(server).post('/').attach('package[]', packageFilePath)

    assert.deepEqual(stack, ['before', 'after', 'ended'])
    assert.property(files, 'package')
    assert.isTrue(files!.package[0].isValid)
    assert.equal(files!.package[0].state, 'consumed')
    assert.equal(files!.package[0].size, packageFileSize)
  })

  test('work fine with indexed array of files', async ({ assert }) => {
    const stack: string[] = []
    let files: null | { [key: string]: File } = null

    const server = createServer(async (req, res) => {
      const ctx = app.container.use('Adonis/Core/HttpContext').create('/', {}, req, res)
      const multipart = new Multipart(
        ctx,
        { maxFields: 1000, limit: 8000 },
        app.container.use('Adonis/Core/Drive')
      )

      multipart.onFile('package', {}, async (part, reporter) => {
        part.on('data', reporter)

        stack.push('before')
        part.resume()
        await sleep(100)
        stack.push('after')
      })

      await multipart.process()
      files = ctx.request['__raw_files']
      stack.push('ended')
      res.end()
    })

    await supertest(server).post('/').attach('package[0]', packageFilePath)
    assert.deepEqual(stack, ['before', 'after', 'ended'])
    assert.property(files, 'package')
    assert.isTrue(files!.package[0].isValid)
    assert.equal(files!.package[0].state, 'consumed')
    assert.equal(files!.package[0].size, packageFileSize)
  })

  test('pass file to wildcard handler when defined', async ({ assert }) => {
    const stack: string[] = []
    let files: null | { [key: string]: File } = null

    const server = createServer(async (req, res) => {
      const ctx = app.container.use('Adonis/Core/HttpContext').create('/', {}, req, res)
      const multipart = new Multipart(
        ctx,
        { maxFields: 1000, limit: 8000 },
        app.container.use('Adonis/Core/Drive')
      )

      multipart.onFile('*', {}, async (part, reporter) => {
        part.on('data', reporter)

        stack.push('before')
        part.resume()
        await sleep(100)
        stack.push('after')
      })

      await multipart.process()
      files = ctx.request['__raw_files']
      stack.push('ended')
      res.end()
    })

    await supertest(server).post('/').attach('package', packageFilePath)
    assert.deepEqual(stack, ['before', 'after', 'ended'])
    assert.property(files, 'package')
    assert.isTrue(files!.package.isValid)
    assert.equal(files!.package.state, 'consumed')
    assert.equal(files!.package.size, packageFileSize)
  })

  test('collect fields automatically', async ({ assert }) => {
    const stack: string[] = []
    let files: null | { [key: string]: File } = null
    let fields: null | { [key: string]: any } = null

    const server = createServer(async (req, res) => {
      const ctx = app.container.use('Adonis/Core/HttpContext').create('/', {}, req, res)
      const multipart = new Multipart(
        ctx,
        { maxFields: 1000, limit: 8000 },
        app.container.use('Adonis/Core/Drive')
      )

      multipart.onFile('*', {}, (part, reporter) => {
        return new Promise((resolve, reject) => {
          part.on('data', reporter)
          part.on('error', reject)
          part.on('end', resolve)
          stack.push('file')
          part.resume()
        })
      })

      await multipart.process()
      files = ctx.request['__raw_files']
      fields = ctx.request.all()
      stack.push('ended')
      res.end()
    })

    await supertest(server).post('/').attach('package', packageFilePath).field('name', 'virk')

    assert.deepEqual(stack, ['file', 'ended'])
    assert.property(files, 'package')
    assert.isTrue(files!.package.isValid)
    assert.equal(files!.package.size, packageFileSize)
    assert.equal(files!.package.state, 'consumed')
    assert.deepEqual(fields, { name: 'virk' })
  })

  test('FIELDS: raise error when process is invoked multiple times', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      const ctx = app.container.use('Adonis/Core/HttpContext').create('/', {}, req, res)
      const multipart = new Multipart(
        ctx,
        { maxFields: 1000, limit: 8000 },
        app.container.use('Adonis/Core/Drive')
      )

      try {
        await multipart.process()
        await multipart.process()
        res.end()
      } catch (error) {
        res.writeHead(500)
        res.end(error.message)
      }
    })

    const { text } = await supertest(server).post('/').field('name', 'virk')

    assert.equal(text, 'E_RUNTIME_EXCEPTION: multipart stream has already been consumed')
  })

  test('FIELDS: raise error when maxFields are crossed', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      const ctx = app.container.use('Adonis/Core/HttpContext').create('/', {}, req, res)
      const multipart = new Multipart(
        ctx,
        { maxFields: 1, limit: 8000 },
        app.container.use('Adonis/Core/Drive')
      )

      try {
        await multipart.process()
        res.end()
      } catch (error) {
        res.writeHead(500)
        res.end(error.message)
      }
    })

    const { text } = await supertest(server).post('/').field('name', 'virk').field('age', '22')

    assert.equal(text, 'E_REQUEST_ENTITY_TOO_LARGE: Fields length limit exceeded')
  })

  test('FIELDS: raise error when bytes limit is crossed', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      const ctx = app.container.use('Adonis/Core/HttpContext').create('/', {}, req, res)
      const multipart = new Multipart(
        ctx,
        { maxFields: 1000, fieldsLimit: 2 },
        app.container.use('Adonis/Core/Drive')
      )

      try {
        await multipart.process()
        res.end()
      } catch (error) {
        res.writeHead(500)
        res.end(error.message)
      }
    })

    const { text } = await supertest(server).post('/').field('name', 'virk').field('age', '22')
    assert.equal(text, 'E_REQUEST_ENTITY_TOO_LARGE: Fields size in bytes exceeded')
  })

  test('disrupt file uploads error when total bytes limit is crossed', async ({ assert }) => {
    assert.plan(2)

    const server = createServer(async (req, res) => {
      const ctx = app.container.use('Adonis/Core/HttpContext').create('/', {}, req, res)
      const multipart = new Multipart(
        ctx,
        { maxFields: 1000, limit: 20 },
        app.container.use('Adonis/Core/Drive')
      )

      multipart.onFile('package', {}, (part, report) => {
        return new Promise((resolve, reject) => {
          part.on('error', (error) => {
            assert.equal(error.message, 'E_REQUEST_ENTITY_TOO_LARGE: request entity too large')
            reject(error)
          })

          part.on('data', report)
          part.on('end', resolve)
        })
      })

      try {
        await multipart.process()
        res.end()
      } catch (error) {
        res.writeHead(500)
        res.end(error.message)
      }
    })

    try {
      const { text } = await supertest(server)
        .post('/')
        .attach('package', packageFilePath)
        .field('name', 'virk')
        .field('age', '22')

      assert.equal(text, 'E_REQUEST_ENTITY_TOO_LARGE: request entity too large')
    } catch (error) {
      assert.oneOf(error.code, ['ECONNABORTED', 'ECONNRESET'])
    }
  })

  test('disrupt part streaming when validation fails', async ({ assert }) => {
    let files: null | { [key: string]: File } = null
    assert.plan(5)

    const server = createServer(async (req, res) => {
      const ctx = app.container.use('Adonis/Core/HttpContext').create('/', {}, req, res)
      const multipart = new Multipart(
        ctx,
        { maxFields: 1000, limit: 8000 },
        app.container.use('Adonis/Core/Drive')
      )

      multipart.onFile(
        '*',
        {
          size: 10,
        },
        (part, reporter) => {
          return new Promise((resolve, reject) => {
            part.on('error', (error: any) => {
              assert.equal(error.code, 'E_STREAM_VALIDATION_FAILURE')
              reject(error)
            })
            part.on('end', resolve)
            part.on('data', reporter)
          })
        }
      )

      await multipart.process()
      files = ctx.request['__raw_files'] || null
      res.end()
    })

    await supertest(server).post('/').attach('package', packageFilePath)

    assert.property(files, 'package')
    assert.isFalse(files!.package.isValid)
    assert.equal(files!.package.state, 'consumed')
    assert.deepEqual(files!.package.errors, [
      {
        type: 'size',
        clientName: 'package.json',
        fieldName: 'package',
        message: 'File size should be less than 10B',
      },
    ])
  })

  test('validate stream only once', async ({ assert }) => {
    assert.plan(5)
    let files: null | { [key: string]: File } = null

    const server = createServer(async (req, res) => {
      const ctx = app.container.use('Adonis/Core/HttpContext').create('/', {}, req, res)
      const multipart = new Multipart(
        ctx,
        { maxFields: 1000 },
        app.container.use('Adonis/Core/Drive')
      )

      multipart.onFile('*', { size: 10 }, (part, reporter) => {
        return new Promise((resolve, reject) => {
          part.on('error', (error: any) => {
            assert.equal(error.code, 'E_STREAM_VALIDATION_FAILURE')
            reject(error)
          })

          part.on('end', resolve)
          part.on('data', reporter)
        })
      })

      await multipart.process()
      files = ctx.request['__raw_files'] || null
      res.end()
    })

    await supertest(server).post('/').attach('profile', join(__dirname, '..', 'unicorn.png'))

    assert.property(files, 'profile')
    assert.isFalse(files!.profile.isValid)
    assert.equal(files!.profile.state, 'consumed')
    assert.deepEqual(files!.profile.errors, [
      {
        type: 'size',
        clientName: 'unicorn.png',
        fieldName: 'profile',
        message: 'File size should be less than 10B',
      },
    ])
  })

  test('report extension validation errors', async ({ assert }) => {
    assert.plan(4)

    let files: null | { [key: string]: File } = null

    const server = createServer(async (req, res) => {
      const ctx = app.container.use('Adonis/Core/HttpContext').create('/', {}, req, res)
      const multipart = new Multipart(
        ctx,
        { maxFields: 1000, limit: 8000 },
        app.container.use('Adonis/Core/Drive')
      )

      multipart.onFile(
        '*',
        {
          extnames: ['jpg'],
        },
        (part, reporter) => {
          return new Promise((resolve, reject) => {
            part.on('error', reject)
            part.on('end', resolve)
            part.on('data', reporter)
          })
        }
      )

      await multipart.process()
      files = ctx.request['__raw_files'] || null
      res.end()
    })

    await supertest(server).post('/').attach('package', packageFilePath)

    assert.property(files, 'package')
    assert.isFalse(files!.package.isValid)
    assert.equal(files!.package.state, 'consumed')
    assert.deepEqual(files!.package.errors, [
      {
        type: 'extname',
        clientName: 'package.json',
        fieldName: 'package',
        message: 'Invalid file extension json. Only jpg is allowed',
      },
    ])
  })

  test('do not run validations when deferValidations is set to true', async ({ assert }) => {
    let files: null | { [key: string]: File } = null

    const server = createServer(async (req, res) => {
      const ctx = app.container.use('Adonis/Core/HttpContext').create('/', {}, req, res)
      const multipart = new Multipart(
        ctx,
        { maxFields: 1000, limit: 8000 },
        app.container.use('Adonis/Core/Drive')
      )

      multipart.onFile(
        '*',
        {
          size: 10,
          deferValidations: true,
        },
        (part, reporter) => {
          return new Promise((resolve, reject) => {
            part.on('data', reporter)
            part.on('end', resolve)
            part.on('error', reject)
          })
        }
      )

      await multipart.process()
      files = ctx.request['__raw_files'] || null
      res.end()
    })

    await supertest(server).post('/').attach('package', packageFilePath)

    assert.property(files, 'package')
    assert.isTrue(files!.package.isValid)
    assert.isFalse(files!.package.validated)
    assert.equal(files!.package.state, 'consumed')
    assert.equal(files!.package.extname, 'json')
    assert.deepEqual(files!.package.errors, [])
  })

  test('work fine when stream is errored without reading', async ({ assert }) => {
    let files: null | { [key: string]: File } = null

    const server = createServer(async (req, res) => {
      const ctx = app.container.use('Adonis/Core/HttpContext').create('/', {}, req, res)
      const multipart = new Multipart(
        ctx,
        { maxFields: 1000, limit: 8000 },
        app.container.use('Adonis/Core/Drive')
      )

      multipart.onFile('package', {}, (part) => {
        return new Promise((resolve) => {
          part.on('error', () => {
            /**
             * Node.js doesn't emit the "close" event when stream is not flowing
             */
            part.emit('close')

            /**
             * We resolve, to reproduce the above defined behavior. If we reject
             * the promise, then the part handler will emit "end" instead
             */
            resolve()
          })

          part.on('end', () => {
            resolve()
          })

          part.emit('error', new Error('abort'))
        })
      })

      await multipart.process()
      files = ctx.request['__raw_files']
      res.end()
    })

    await supertest(server).post('/').attach('package', packageFilePath)
    assert.property(files, 'package')
    assert.isTrue(files!.package.isValid)
    assert.equal(files!.package.size, 0)
    assert.equal(files!.package.state, 'consumed')
  })

  test('end request when abort is called without ending the part', async ({ assert }) => {
    let files: null | { [key: string]: File } = null

    const server = createServer(async (req, res) => {
      const ctx = app.container.use('Adonis/Core/HttpContext').create('/', {}, req, res)
      const multipart = new Multipart(
        ctx,
        { maxFields: 1000, limit: 8000 },
        app.container.use('Adonis/Core/Drive')
      )

      multipart.onFile('package', {}, (part) => {
        return new Promise((resolve) => {
          part.on('error', (error) => {
            setTimeout(() => multipart.abort(error))

            /**
             * We resolve, to reproduce the above defined behavior. If we reject
             * the promise, then the part handler will emit "end" instead
             */
            resolve()
          })

          part.on('end', () => {
            resolve()
          })

          part.emit('error', new Error('abort'))
        })
      })

      try {
        await multipart.process()
      } catch {}

      files = ctx.request['__raw_files']
      res.end()
    })

    await supertest(server).post('/').attach('package', packageFilePath)
    assert.property(files, 'package')
    assert.isTrue(files!.package.isValid)
    assert.equal(files!.package.size, 0)
    assert.equal(files!.package.state, 'consumed')
  }).retry(3)

  test('report extension validation errors when unable to detect extension till completion', async ({
    assert,
  }) => {
    assert.plan(4)

    let files: null | { [key: string]: File } = null

    const server = createServer(async (req, res) => {
      const ctx = app.container.use('Adonis/Core/HttpContext').create('/', {}, req, res)
      const multipart = new Multipart(
        ctx,
        { maxFields: 1000, limit: 8000 },
        app.container.use('Adonis/Core/Drive')
      )

      multipart.onFile(
        '*',
        {
          extnames: ['jpg'],
        },
        (part, reporter) => {
          return new Promise((resolve, reject) => {
            part.on('error', reject)
            part.on('end', resolve)
            part.on('data', reporter)
          })
        }
      )

      await multipart.process()
      files = ctx.request['__raw_files'] || null
      res.end()
    })

    await supertest(server).post('/').attach('package', packageFilePath)

    assert.property(files, 'package')
    assert.isFalse(files!.package.isValid)
    assert.equal(files!.package.state, 'consumed')
    assert.deepEqual(files!.package.errors, [
      {
        type: 'extname',
        clientName: 'package.json',
        fieldName: 'package',
        message: 'Invalid file extension json. Only jpg is allowed',
      },
    ])
  })

  test('correctly retrieve file extension from magic number', async ({ assert }) => {
    let files: null | { [key: string]: File } = null

    const server = createServer(async (req, res) => {
      const ctx = app.container.use('Adonis/Core/HttpContext').create('/', {}, req, res)
      const multipart = new Multipart(
        ctx,
        { maxFields: 1000 },
        app.container.use('Adonis/Core/Drive')
      )

      multipart.onFile('*', {}, (part, reporter) => {
        return new Promise((resolve, reject) => {
          part.on('error', reject)
          part.on('end', resolve)
          part.on('data', reporter)
        })
      })

      await multipart.process()
      files = ctx.request['__raw_files'] || null
      res.end()
    })

    await supertest(server)
      .post('/')
      .attach('picture', join(__dirname, '..', 'unicorn-wo-ext'), { contentType: 'image/png' })

    assert.property(files, 'picture')
    assert.isTrue(files!.picture.isValid)
    assert.equal(files!.picture.state, 'consumed')
    assert.equal(files!.picture.extname, 'png')
    assert.lengthOf(files!.picture.errors, 0)
  })

  test('validate xlsx extension', async ({ assert }) => {
    let files: null | { [key: string]: File } = null

    const server = createServer(async (req, res) => {
      const ctx = app.container.use('Adonis/Core/HttpContext').create('/', {}, req, res)
      const multipart = new Multipart(
        ctx,
        { maxFields: 1000, limit: 8000 },
        app.container.use('Adonis/Core/Drive')
      )

      multipart.onFile(
        '*',
        {
          extnames: ['xlsx'],
        },
        (part, reporter) => {
          return new Promise((resolve, reject) => {
            part.on('error', reject)
            part.on('end', resolve)
            part.on('data', reporter)
          })
        }
      )

      await multipart.process()
      files = ctx.request['__raw_files'] || null
      res.end()
    })

    await supertest(server).post('/').attach('report', xlsxFilePath)

    assert.property(files, 'report')
    assert.isTrue(files!.report.isValid)
    assert.equal(files!.report.state, 'consumed')
    assert.equal(files!.report.extname, 'xlsx')
    assert.lengthOf(files!.report.errors, 0)
  })

  test('validate xls extension', async ({ assert }) => {
    let files: null | { [key: string]: File } = null

    const server = createServer(async (req, res) => {
      const ctx = app.container.use('Adonis/Core/HttpContext').create('/', {}, req, res)
      const multipart = new Multipart(
        ctx,
        { maxFields: 1000, limit: 10000 },
        app.container.use('Adonis/Core/Drive')
      )

      multipart.onFile(
        '*',
        {
          extnames: ['xls'],
        },
        (part, reporter) => {
          return new Promise((resolve, reject) => {
            part.on('error', reject)
            part.on('end', resolve)
            part.on('data', reporter)
          })
        }
      )

      try {
        await multipart.process()
      } catch (error) {
        console.log(error)
      }
      files = ctx.request['__raw_files'] || null
      res.end()
    })

    await supertest(server).post('/').attach('report', xlsFilePath)

    assert.property(files, 'report')
    assert.isTrue(files!.report.isValid)
    assert.equal(files!.report.state, 'consumed')
    assert.equal(files!.report.extname, 'xls')
    assert.lengthOf(files!.report.errors, 0)
  })
})
