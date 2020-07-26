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

import test from 'japa'
import { join } from 'path'
import { tmpdir } from 'os'
import supertest from 'supertest'
import { createServer } from 'http'
import { lodash } from '@poppinss/utils'
import { pathExists, remove, readFile, outputFile } from 'fs-extra'
import { RequestConstructorContract } from '@ioc:Adonis/Core/Request'
import { Request as BaseRequest } from '@adonisjs/http-server/build/src/Request'

import { Multipart } from '../src/Multipart'
import extendRequest from '../src/Bindings/Request'
import { BodyParserMiddleware } from '../src/BodyParser'
import { packageFilePath, packageFileSize, bodyParserConfig, getContext } from '../test-helpers'
import { MultipartFileContract } from '@ioc:Adonis/Core/BodyParser'

const Request = (BaseRequest as unknown) as RequestConstructorContract

test.group('BodyParser Middleware | generic', (group) => {
	group.before(() => {
		extendRequest(Request)
	})

	test('do not parse get requests', async (assert) => {
		const server = createServer(async (req, res) => {
			const ctx = getContext('/', {}, req, res)
			const middleware = new BodyParserMiddleware(bodyParserConfig)

			await middleware.handle(ctx, async () => {
				res.writeHead(200, { 'content-type': 'application/json' })
				res.end(JSON.stringify(ctx.request.all()))
			})
		})

		const { body } = await supertest(server).get('/').type('json').send({ username: 'virk' })

		assert.deepEqual(body, {})
	})

	test('by pass when body is empty', async (assert) => {
		const server = createServer(async (req, res) => {
			const ctx = getContext('/', {}, req, res)
			const middleware = new BodyParserMiddleware(bodyParserConfig)

			await middleware.handle(ctx, async () => {
				res.writeHead(200, { 'content-type': 'application/json' })
				res.end(JSON.stringify(ctx.request.all()))
			})
		})

		const { body } = await supertest(server).post('/').type('json')

		assert.deepEqual(body, {})
	})

	test('by pass when content type is not supported', async (assert) => {
		const server = createServer(async (req, res) => {
			const ctx = getContext('/', {}, req, res)
			const middleware = new BodyParserMiddleware(bodyParserConfig)

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
			const ctx = getContext('/', {}, req, res)
			const middleware = new BodyParserMiddleware(bodyParserConfig)

			await middleware.handle(ctx, async () => {
				res.writeHead(200, { 'content-type': 'application/json' })
				res.end(JSON.stringify(ctx.request.all()))
			})
		})

		const { body } = await supertest(server).post('/').type('form').send({ username: 'virk' })

		assert.deepEqual(body, { username: 'virk' })
	})

	test('abort if request size is over limit', async (assert) => {
		const server = createServer(async (req, res) => {
			const ctx = getContext('/', {}, req, res)
			const middleware = new BodyParserMiddleware(
				lodash.merge({}, bodyParserConfig, {
					form: {
						limit: 2,
					},
				})
			)

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

		assert.deepEqual(text, 'E_REQUEST_ENTITY_TOO_LARGE: request entity too large')
	})

	test('abort if specified encoding is not supported', async (assert) => {
		const server = createServer(async (req, res) => {
			const ctx = getContext('/', {}, req, res)
			const middleware = new BodyParserMiddleware(
				lodash.merge({}, bodyParserConfig, {
					form: {
						encoding: 'foo',
					},
				})
			)

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

		assert.deepEqual(text, 'E_ENCODING_UNSUPPORTED: specified encoding unsupported')
	})

	test('ignore fields with empty name', async (assert) => {
		const server = createServer(async (req, res) => {
			const ctx = getContext('/', {}, req, res)
			const middleware = new BodyParserMiddleware(bodyParserConfig)

			await middleware.handle(ctx, async () => {
				res.writeHead(200, { 'content-type': 'application/json' })
				res.end(JSON.stringify(ctx.request.all()))
			})
		})

		const { body } = await supertest(server).post('/').type('form').send({ '': 'virk' })

		assert.deepEqual(body, {})
	})
})

test.group('BodyParser Middleware | json', () => {
	test('handle request with json body', async (assert) => {
		const server = createServer(async (req, res) => {
			const ctx = getContext('/', {}, req, res)
			const middleware = new BodyParserMiddleware(bodyParserConfig)

			await middleware.handle(ctx, async () => {
				res.writeHead(200, { 'content-type': 'application/json' })
				res.end(JSON.stringify(ctx.request.all()))
			})
		})

		const { body } = await supertest(server).post('/').type('json').send({ username: 'virk' })

		assert.deepEqual(body, { username: 'virk' })
	})

	test('abort if request size is over limit', async (assert) => {
		const server = createServer(async (req, res) => {
			const ctx = getContext('/', {}, req, res)
			const middleware = new BodyParserMiddleware(
				lodash.merge({}, bodyParserConfig, {
					json: {
						limit: 2,
					},
				})
			)

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

		assert.deepEqual(text, 'E_REQUEST_ENTITY_TOO_LARGE: request entity too large')
	})

	test('ignore fields with empty name', async (assert) => {
		const server = createServer(async (req, res) => {
			const ctx = getContext('/', {}, req, res)
			const middleware = new BodyParserMiddleware(bodyParserConfig)

			await middleware.handle(ctx, async () => {
				res.writeHead(200, { 'content-type': 'application/json' })
				res.end(JSON.stringify(ctx.request.all()))
			})
		})

		const { body } = await supertest(server).post('/').type('json').send({ '': 'virk' })

		assert.deepEqual(body, { '': 'virk' })
	})
})

test.group('BodyParser Middleware | raw body', () => {
	test('handle request with raw body', async (assert) => {
		const server = createServer(async (req, res) => {
			const ctx = getContext('/', {}, req, res)
			const middleware = new BodyParserMiddleware(bodyParserConfig)

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
			const ctx = getContext('/', {}, req, res)
			const middleware = new BodyParserMiddleware(
				lodash.merge({}, bodyParserConfig, {
					raw: {
						limit: 2,
					},
				})
			)

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

		assert.deepEqual(text, 'E_REQUEST_ENTITY_TOO_LARGE: request entity too large')
	})
})

test.group('BodyParser Middleware | multipart', () => {
	test('handle request with just files', async (assert) => {
		const server = createServer(async (req, res) => {
			const ctx = getContext('/', {}, req, res)
			const middleware = new BodyParserMiddleware(bodyParserConfig)

			await middleware.handle(ctx, async () => {
				res.writeHead(200, { 'content-type': 'application/json' })
				res.end(
					JSON.stringify({
						tmpPath: ctx.request['__raw_files'].package.tmpPath,
						size: ctx.request['__raw_files'].package.size,
						validated: ctx.request['__raw_files'].package.validated,
					})
				)
			})
		})

		const { body } = await supertest(server).post('/').attach('package', packageFilePath)

		assert.isAbove(body.size, 0)
		assert.exists(body.tmpPath)
		assert.isFalse(body.validated)
	})

	test('handle request with files and fields', async (assert) => {
		const server = createServer(async (req, res) => {
			const ctx = getContext('/', {}, req, res)
			const middleware = new BodyParserMiddleware(bodyParserConfig)

			await middleware.handle(ctx, async () => {
				res.writeHead(200, { 'content-type': 'application/json' })
				res.end(
					JSON.stringify({
						size: ctx.request['__raw_files'].package.size,
						validated: ctx.request['__raw_files'].package.validated,
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

	test('handle request array of files', async (assert) => {
		const server = createServer(async (req, res) => {
			const ctx = getContext('/', {}, req, res)
			const middleware = new BodyParserMiddleware(bodyParserConfig)

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

	test('abort request when total bytes are over limit', async (assert) => {
		let index = 0

		const server = createServer(async (req, res) => {
			const ctx = getContext('/', {}, req, res)
			const middleware = new BodyParserMiddleware(
				lodash.merge({}, bodyParserConfig, {
					multipart: {
						autoProcess: true,
						tmpFileName() {
							return `${index++}.tmp`
						},
						types: ['multipart/form-data'],
						limit: packageFileSize * 2 - 10,
					},
				})
			)

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
			const ctx = getContext('/', {}, req, res)
			const middleware = new BodyParserMiddleware(bodyParserConfig)

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
			const ctx = getContext('/', {}, req, res)
			const middleware = new BodyParserMiddleware(bodyParserConfig)

			await middleware.handle(ctx, async () => {
				res.writeHead(200)
				res.end(String(Object.keys(ctx.request['__raw_files']).length))
			})
		})

		const { text } = await supertest(server).post('/').attach('', packageFilePath)

		assert.deepEqual(text, '0')
	})

	test('do not process request when autoProcess is false', async (assert) => {
		assert.plan(2)

		const server = createServer(async (req, res) => {
			const ctx = getContext('/', {}, req, res)
			const middleware = new BodyParserMiddleware(
				lodash.merge({}, bodyParserConfig, {
					multipart: {
						autoProcess: false,
					},
				})
			)

			await middleware.handle(ctx, async () => {
				assert.deepEqual(ctx.request['__raw_files'], {})
				assert.instanceOf(ctx.request['multipart'], Multipart)
				res.end()
			})
		})

		await supertest(server).post('/').attach('package', packageFilePath).field('username', 'virk')
	})

	test('do not process request when processManually static route matches', async (assert) => {
		assert.plan(2)

		const server = createServer(async (req, res) => {
			const ctx = getContext('/', {}, req, res)
			const middleware = new BodyParserMiddleware(
				lodash.merge({}, bodyParserConfig, {
					multipart: {
						autoProcess: true,
						processManually: ['/'],
					},
				})
			)

			await middleware.handle(ctx, async () => {
				assert.deepEqual(ctx.request['__raw_files'], {})
				assert.instanceOf(ctx.request['multipart'], Multipart)
				res.end()
			})
		})

		await supertest(server).post('/').attach('package', packageFilePath).field('username', 'virk')
	})

	test('do not process request when processManually has dynamic route', async (assert) => {
		assert.plan(2)

		const server = createServer(async (req, res) => {
			const ctx = getContext('/project/:id/file', { id: 1 }, req, res)
			const middleware = new BodyParserMiddleware(
				lodash.merge({}, bodyParserConfig, {
					multipart: {
						autoProcess: true,
						processManually: ['/project/:id/file'],
					},
				})
			)

			await middleware.handle(ctx, async () => {
				assert.deepEqual(ctx.request['__raw_files'], {})
				assert.instanceOf(ctx.request['multipart'], Multipart)
				res.end()
			})
		})

		await supertest(server).post('/').attach('package', packageFilePath).field('username', 'virk')
	})

	test('detect file ext and mime type using magic number', async (assert) => {
		const server = createServer(async (req, res) => {
			const ctx = getContext('/', {}, req, res)
			const middleware = new BodyParserMiddleware(bodyParserConfig)

			await middleware.handle(ctx, async () => {
				res.writeHead(200, { 'content-type': 'application/json' })
				res.end(
					JSON.stringify({
						type: ctx.request['__raw_files'].avatar.type,
						subtype: ctx.request['__raw_files'].avatar.subtype,
						extname: ctx.request['__raw_files'].avatar.extname,
					})
				)
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
			const ctx = getContext('/', {}, req, res)
			const middleware = new BodyParserMiddleware(bodyParserConfig)

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

	test('validate array of files when access via request.file method', async (assert) => {
		const server = createServer(async (req, res) => {
			const ctx = getContext('/', {}, req, res)
			const middleware = new BodyParserMiddleware(bodyParserConfig)

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

	test('pull first file even when source is an array', async (assert) => {
		const server = createServer(async (req, res) => {
			const ctx = getContext('/', {}, req, res)
			const middleware = new BodyParserMiddleware(bodyParserConfig)

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

	test("return null when file doesn't exists", async (assert) => {
		const server = createServer(async (req, res) => {
			const ctx = getContext('/', {}, req, res)
			const middleware = new BodyParserMiddleware(bodyParserConfig)

			await middleware.handle(ctx, async () => {
				res.writeHead(200, { 'content-type': 'application/json' })
				const pkgFile = ctx.request.file('package', { size: 10 })
				res.end(JSON.stringify(pkgFile))
			})
		})

		const { body } = await supertest(server).post('/')
		assert.isNull(body)
	})

	test("return empty array file doesn't exists", async (assert) => {
		const server = createServer(async (req, res) => {
			const ctx = getContext('/', {}, req, res)
			const middleware = new BodyParserMiddleware(bodyParserConfig)

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
			const ctx = getContext('/', {}, req, res)
			const middleware = new BodyParserMiddleware(bodyParserConfig)

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

	test('move file to a given location', async (assert) => {
		const uploadsDir = join(__dirname, 'uploads')

		const server = createServer(async (req, res) => {
			const ctx = getContext('/', {}, req, res)
			const middleware = new BodyParserMiddleware(bodyParserConfig)

			await middleware.handle(ctx, async () => {
				const pkgFile = ctx.request.file('package')!

				try {
					await pkgFile.move(uploadsDir)
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

		const uploadedFileContents = await readFile(join(uploadsDir, 'package.json'), 'utf-8')
		const originalFileContents = await readFile(packageFilePath, 'utf-8')
		assert.equal(uploadedFileContents, originalFileContents)

		await remove(uploadsDir)
	})

	test('move file with custom name', async (assert) => {
		const uploadsDir = join(__dirname, 'uploads')

		const server = createServer(async (req, res) => {
			const ctx = getContext('/', {}, req, res)
			const middleware = new BodyParserMiddleware(bodyParserConfig)

			await middleware.handle(ctx, async () => {
				const pkgFile = ctx.request.file('package')!

				try {
					await pkgFile.move(uploadsDir, {
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

		const uploadedFileContents = await readFile(join(uploadsDir, 'myapp.json'), 'utf-8')
		const originalFileContents = await readFile(packageFilePath, 'utf-8')
		assert.equal(uploadedFileContents, originalFileContents)

		await remove(uploadsDir)
	})

	test('raise error when destination file already exists', async (assert) => {
		const uploadsDir = join(__dirname, 'uploads')

		const server = createServer(async (req, res) => {
			const ctx = getContext('/', {}, req, res)
			const middleware = new BodyParserMiddleware(bodyParserConfig)

			await middleware.handle(ctx, async () => {
				const pkgFile = ctx.request.file('package')!

				try {
					await pkgFile.move(uploadsDir, { overwrite: false })
				} catch (error) {
					assert.equal(
						error.message,
						`"package.json" already exists at "${uploadsDir}". Set "overwrite = true" to overwrite it`
					)
					assert.equal(pkgFile.state, 'consumed')
					res.writeHead(200, { 'content-type': 'application/json' })
					res.end()
				}
			})
		})

		await outputFile(join(uploadsDir, 'package.json'), JSON.stringify({}))

		await supertest(server).post('/').attach('package', packageFilePath).expect(200)

		await remove(uploadsDir)
	})

	test('validate file extension and file size seperately', async (assert) => {
		const server = createServer(async (req, res) => {
			const ctx = getContext('/', {}, req, res)
			const middleware = new BodyParserMiddleware(bodyParserConfig)

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

	test('calling validate multiple times must be a noop', async (assert) => {
		const server = createServer(async (req, res) => {
			const ctx = getContext('/', {}, req, res)
			const middleware = new BodyParserMiddleware(bodyParserConfig)

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

	test('validate file size using request.file method and extension manually', async (assert) => {
		const server = createServer(async (req, res) => {
			const ctx = getContext('/', {}, req, res)
			const middleware = new BodyParserMiddleware(bodyParserConfig)

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

	test('updating sizeLimit multiple times must not be allowed', async (assert) => {
		const server = createServer(async (req, res) => {
			const ctx = getContext('/', {}, req, res)
			const middleware = new BodyParserMiddleware(bodyParserConfig)

			await middleware.handle(ctx, async () => {
				res.writeHead(200, { 'content-type': 'application/json' })
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

	test('updating allowedExtensions multiple times must not be allowed', async (assert) => {
		const server = createServer(async (req, res) => {
			const ctx = getContext('/', {}, req, res)
			const middleware = new BodyParserMiddleware(bodyParserConfig)

			await middleware.handle(ctx, async () => {
				res.writeHead(200, { 'content-type': 'application/json' })
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

	test('get all files as an object', async (assert) => {
		const server = createServer(async (req, res) => {
			const ctx = getContext('/', {}, req, res)
			const middleware = new BodyParserMiddleware(bodyParserConfig)

			await middleware.handle(ctx, async () => {
				res.writeHead(200, { 'content-type': 'application/json' })
				const allFiles = ctx.request.allFiles()
				const files = Object.keys(allFiles).map((field) => {
					const file = allFiles[field] as MultipartFileContract
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
})
