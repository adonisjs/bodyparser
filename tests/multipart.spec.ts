/*
 * @adonisjs/bodyparser
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { join } from 'node:path'
import supertest from 'supertest'
import { test } from '@japa/runner'
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import fileGenerator from '@poppinss/file-generator'
import {
  RequestFactory,
  ResponseFactory,
  HttpContextFactory,
} from '@adonisjs/http-server/factories'
import { Multipart } from '../src/multipart/main.js'
import { MultipartFile } from '../src/multipart/file.js'
import {
  sleep,
  xlsFilePath,
  largePdfFile,
  xlsxFilePath,
  packageFilePath,
  packageFileSize,
  unicornFilePath,
  unicornNoExtFilePath,
} from '../test_helpers/main.js'
import string from '@poppinss/utils/string'
import { ensureDir, pathExists } from 'fs-extra'
import { createWriteStream } from 'node:fs'

const BASE_URL = new URL('./tmp/', import.meta.url)
const BASE_PATH = fileURLToPath(BASE_URL)

test.group('Multipart', () => {
  test('process file by attaching handler on field name', async ({ assert }) => {
    let files: null | Record<string, MultipartFile | MultipartFile[]> = null

    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const multipart = new Multipart(ctx, { maxFields: 1000, limit: 8000 })

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
    assert.isTrue(files!.package instanceof MultipartFile && files!.package.isValid)
    assert.equal(files!.package instanceof MultipartFile && files!.package.state, 'consumed')
    assert.equal(files!.package instanceof MultipartFile && files!.package.size, packageFileSize)
  })

  test('get file JSON representation', async ({ assert }) => {
    let files: null | Record<string, MultipartFile | MultipartFile[]> = null

    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const multipart = new Multipart(ctx, { maxFields: 1000, limit: 8000 })

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

    const pkgFile = files!.package as MultipartFile
    assert.deepEqual(pkgFile.toJSON(), {
      clientName: 'package.json',
      errors: [],
      extname: 'json',
      fieldName: 'package',
      fileName: undefined,
      filePath: undefined,
      isValid: true,
      meta: {},
      size: packageFileSize,
      state: 'consumed',
      subtype: 'json',
      type: 'application',
      validated: true,
    })
  })

  test('raise error when file.move method is called without a tmp path', async ({ assert }) => {
    let files: null | Record<string, MultipartFile | MultipartFile[]> = null

    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const multipart = new Multipart(ctx, { maxFields: 1000, limit: 8000 })

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
    const pkgFile = files!.package as MultipartFile

    await assert.rejects(
      () => pkgFile.move(join(BASE_PATH, './')),
      'property "tmpPath" must be set on the file before moving it'
    )
  })

  test('error inside onFile handler should propogate to file errors', async ({ assert }) => {
    let files: null | Record<string, MultipartFile | MultipartFile[]> = null

    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const multipart = new Multipart(ctx, { maxFields: 1000, limit: 8000 })

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
    assert.isFalse(files!.package instanceof MultipartFile && files!.package.isValid)
    assert.equal(files!.package instanceof MultipartFile && files!.package.state, 'consumed')
    assert.deepEqual(files!.package instanceof MultipartFile && files!.package.errors, [
      {
        fieldName: 'package',
        clientName: 'package.json',
        message: 'Cannot process',
        type: 'fatal',
      },
    ])
  })

  test('wait for promise to return even when part has been streamed', async ({ assert }) => {
    let files: null | Record<string, MultipartFile | MultipartFile[]> = null
    const stack: string[] = []

    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const multipart = new Multipart(ctx, { maxFields: 1000, limit: 8000 })

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
    assert.isTrue(files!.package instanceof MultipartFile && files!.package.isValid)
    assert.equal(files!.package instanceof MultipartFile && files!.package.state, 'consumed')
    assert.equal(files!.package instanceof MultipartFile && files!.package.size, packageFileSize)
  })

  test('work fine when stream is piped to a destination', async ({ assert, fs }) => {
    await ensureDir(fs.basePath)
    const SAMPLE_FILE_PATH = join(fs.basePath, './sample.json')

    let files: null | Record<string, MultipartFile | MultipartFile[]> = null

    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const multipart = new Multipart(ctx, { maxFields: 1000, limit: 8000 })

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
    assert.isTrue(files!.package instanceof MultipartFile && files!.package.isValid)
    assert.equal(files!.package instanceof MultipartFile && files!.package.size, packageFileSize)
    assert.equal(files!.package instanceof MultipartFile && files!.package.state, 'consumed')
    assert.equal(text, 'true')
  })

  test('process array of files', async ({ assert }) => {
    const stack: string[] = []
    let files: null | Record<string, MultipartFile | MultipartFile[]> = null

    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const multipart = new Multipart(ctx, { maxFields: 1000, limit: 8000 })

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
    assert.isTrue(Array.isArray(files!.package) && files!.package[0].isValid)
    assert.equal(Array.isArray(files!.package) && files!.package[0].state, 'consumed')
    assert.equal(Array.isArray(files!.package) && files!.package[0].size, packageFileSize)
  })

  test('work fine with indexed array of files', async ({ assert }) => {
    const stack: string[] = []

    let files: null | Record<string, MultipartFile | MultipartFile[]> = null
    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const multipart = new Multipart(ctx, { maxFields: 1000, limit: 8000 })

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
    assert.isTrue(Array.isArray(files!.package) && files!.package[0].isValid)
    assert.equal(Array.isArray(files!.package) && files!.package[0].state, 'consumed')
    assert.equal(Array.isArray(files!.package) && files!.package[0].size, packageFileSize)
  })

  test('pass file to wildcard handler when defined', async ({ assert }) => {
    const stack: string[] = []

    let files: null | Record<string, MultipartFile | MultipartFile[]> = null
    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const multipart = new Multipart(ctx, { maxFields: 1000, limit: 8000 })

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
    assert.isTrue(files!.package instanceof MultipartFile && files!.package.isValid)
    assert.equal(files!.package instanceof MultipartFile && files!.package.state, 'consumed')
    assert.equal(files!.package instanceof MultipartFile && files!.package.size, packageFileSize)
  })

  test('collect fields automatically', async ({ assert }) => {
    const stack: string[] = []

    let fields: null | { [key: string]: any } = null
    let files: null | Record<string, MultipartFile | MultipartFile[]> = null

    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const multipart = new Multipart(ctx, { maxFields: 1000, limit: 8000 })

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
    assert.isTrue(files!.package instanceof MultipartFile && files!.package.isValid)
    assert.equal(files!.package instanceof MultipartFile && files!.package.size, packageFileSize)
    assert.equal(files!.package instanceof MultipartFile && files!.package.state, 'consumed')
    assert.deepEqual(fields, { name: 'virk' })
  })

  test('FIELDS: raise error when process is invoked multiple times', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const multipart = new Multipart(ctx, { maxFields: 1000, limit: 8000 })

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

    assert.equal(text, 'multipart stream has already been consumed')
  })

  test('FIELDS: raise error when maxFields are crossed', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const multipart = new Multipart(ctx, { maxFields: 1, limit: 8000 })

      try {
        await multipart.process()
        res.end()
      } catch (error) {
        res.writeHead(500)
        res.end(error.message)
      }
    })

    const { text } = await supertest(server).post('/').field('name', 'virk').field('age', '22')

    assert.equal(text, 'Fields length limit exceeded')
  })

  test('FIELDS: raise error when bytes limit is crossed', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const multipart = new Multipart(ctx, { maxFields: 1000, fieldsLimit: 2 })

      try {
        await multipart.process()
        res.end()
      } catch (error) {
        res.writeHead(500)
        res.end(error.message)
      }
    })

    const { text } = await supertest(server).post('/').field('name', 'virk').field('age', '22')
    assert.equal(text, 'Fields size in bytes exceeded')
  })

  test('disrupt file uploads error when total bytes limit is crossed', async ({ assert }) => {
    assert.plan(2)

    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const multipart = new Multipart(ctx, { maxFields: 100, limit: 20 })

      multipart.onFile('package', {}, (part, report) => {
        return new Promise((resolve, reject) => {
          part.on('error', (error) => {
            assert.equal(error.message, 'request entity too large')
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

      assert.equal(text, 'request entity too large')
    } catch (error) {
      assert.oneOf(error.code, ['ECONNABORTED', 'ECONNRESET'])
    }
  })

  test('disrupt part streaming when validation fails', async ({ assert }) => {
    assert.plan(5)

    let files: null | Record<string, MultipartFile | MultipartFile[]> = null
    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const multipart = new Multipart(ctx, { maxFields: 1000, limit: 8000 })

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
    assert.isFalse(files!.package instanceof MultipartFile && files!.package.isValid)
    assert.equal(files!.package instanceof MultipartFile && files!.package.state, 'consumed')
    assert.deepEqual(files!.package instanceof MultipartFile && files!.package.errors, [
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

    let files: null | Record<string, MultipartFile | MultipartFile[]> = null
    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const multipart = new Multipart(ctx, { maxFields: 1000 })

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

    await supertest(server).post('/').attach('profile', unicornFilePath)

    assert.property(files, 'profile')
    assert.isFalse(files!.profile instanceof MultipartFile && files!.profile.isValid)
    assert.equal(files!.profile instanceof MultipartFile && files!.profile.state, 'consumed')
    assert.deepEqual(files!.profile instanceof MultipartFile && files!.profile.errors, [
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

    let files: null | Record<string, MultipartFile | MultipartFile[]> = null
    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const multipart = new Multipart(ctx, { maxFields: 1000, limit: 8000 })

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
    assert.isFalse(files!.package instanceof MultipartFile && files!.package.isValid)
    assert.equal(files!.package instanceof MultipartFile && files!.package.state, 'consumed')
    assert.deepEqual(files!.package instanceof MultipartFile && files!.package.errors, [
      {
        type: 'extname',
        clientName: 'package.json',
        fieldName: 'package',
        message: 'Invalid file extension json. Only jpg is allowed',
      },
    ])
  })

  test('do not run validations when deferValidations is set to true', async ({ assert }) => {
    let files: null | Record<string, MultipartFile | MultipartFile[]> = null
    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const multipart = new Multipart(ctx, { maxFields: 1000, limit: 8000 })

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
    assert.isTrue(files!.package instanceof MultipartFile && files!.package.isValid)
    assert.isFalse(files!.package instanceof MultipartFile && files!.package.validated)
    assert.equal(files!.package instanceof MultipartFile && files!.package.state, 'consumed')
    assert.equal(files!.package instanceof MultipartFile && files!.package.extname, 'json')
    assert.deepEqual(files!.package instanceof MultipartFile && files!.package.errors, [])
  })

  test('work fine when stream is errored without reading', async ({ assert }) => {
    let files: null | Record<string, MultipartFile | MultipartFile[]> = null
    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const multipart = new Multipart(ctx, { maxFields: 1000, limit: 8000 })

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
    assert.isTrue(files!.package instanceof MultipartFile && files!.package.isValid)
    assert.equal(files!.package instanceof MultipartFile && files!.package.size, 0)
    assert.equal(files!.package instanceof MultipartFile && files!.package.state, 'consumed')
  })

  test('end request when abort is called without ending the part', async ({ assert }) => {
    let files: null | Record<string, MultipartFile | MultipartFile[]> = null
    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const multipart = new Multipart(ctx, { maxFields: 1000, limit: 8000 })

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
    assert.isTrue(files!.package instanceof MultipartFile && files!.package.isValid)
    assert.equal(files!.package instanceof MultipartFile && files!.package.size, 0)
    assert.equal(files!.package instanceof MultipartFile && files!.package.state, 'consumed')
  }).retry(3)

  test('report extension validation errors when unable to detect extension till completion', async ({
    assert,
  }) => {
    assert.plan(4)

    let files: null | Record<string, MultipartFile | MultipartFile[]> = null
    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const multipart = new Multipart(ctx, { maxFields: 1000, limit: 8000 })

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
    assert.isFalse(files!.package instanceof MultipartFile && files!.package.isValid)
    assert.equal(files!.package instanceof MultipartFile && files!.package.state, 'consumed')
    assert.deepEqual(files!.package instanceof MultipartFile && files!.package.errors, [
      {
        type: 'extname',
        clientName: 'package.json',
        fieldName: 'package',
        message: 'Invalid file extension json. Only jpg is allowed',
      },
    ])
  })

  test('correctly retrieve file extension from magic number', async ({ assert }) => {
    let files: null | Record<string, MultipartFile | MultipartFile[]> = null
    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const multipart = new Multipart(ctx, { maxFields: 1000 })

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

    await supertest(server).post('/').attach('picture', unicornNoExtFilePath, {
      contentType: 'image/png',
    })

    assert.property(files, 'picture')
    assert.instanceOf(files!.picture, MultipartFile)

    const picture = files!.picture as MultipartFile
    assert.isTrue(picture.isValid)
    assert.equal(picture.state, 'consumed')
    assert.equal(picture.extname, 'png')
    assert.lengthOf(picture.errors, 0)
  })

  test('validate xlsx extension', async ({ assert }) => {
    let files: null | Record<string, MultipartFile | MultipartFile[]> = null
    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const multipart = new Multipart(ctx, { maxFields: 1000, limit: 8000 })

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
    assert.instanceOf(files!.report, MultipartFile)

    const report = files!.report as MultipartFile

    assert.isTrue(report.isValid)
    assert.equal(report.state, 'consumed')
    assert.equal(report.extname, 'xlsx')
    assert.lengthOf(report.errors, 0)
  })

  test('validate xls extension', async ({ assert }) => {
    let files: null | Record<string, MultipartFile | MultipartFile[]> = null
    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const multipart = new Multipart(ctx, { maxFields: 1000, limit: 10000 })

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
    assert.instanceOf(files!.report, MultipartFile)

    const report = files!.report as MultipartFile

    assert.isTrue(report.isValid)
    assert.equal(report.state, 'consumed')
    assert.equal(report.extname, 'xls')
    assert.lengthOf(report.errors, 0)
  })

  test('process medium sized files', async ({ assert }) => {
    let files: null | Record<string, MultipartFile | MultipartFile[]> = null

    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const multipart = new Multipart(ctx, { maxFields: 1000, limit: '20 mb' })

      multipart.onFile('report', {}, (part, reporter) => {
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

    await supertest(server).post('/').attach('report', largePdfFile)
    assert.property(files, 'report')

    const report = files!.report as MultipartFile

    assert.isTrue(report.isValid)
    assert.equal(report.state, 'consumed')
    assert.isAbove(report.size, string.bytes.parse('10mb'))
  })

  test('process large xlsx file', async ({ assert }) => {
    let files: null | Record<string, MultipartFile | MultipartFile[]> = null
    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const multipart = new Multipart(ctx, { maxFields: 1000, limit: '10 mb' })

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

      try {
        await multipart.process()
      } catch (error) {
        console.log(error)
      }
      files = ctx.request['__raw_files'] || null
      res.end()
    })

    const xlsFile = await fileGenerator.generateXlsx('8 mb')
    await supertest(server).post('/').attach('report', xlsFile.contents, {
      filename: xlsFile.name,
      contentType: xlsFile.mime,
    })

    assert.property(files, 'report')
    assert.instanceOf(files!.report, MultipartFile)

    const report = files!.report as MultipartFile

    assert.isTrue(report.isValid)
    assert.equal(report.state, 'consumed')
    assert.equal(report.extname, 'xlsx')
    assert.lengthOf(report.errors, 0)
  })
})
