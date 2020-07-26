/*
 * @adonisjs/events
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import test from 'japa'
import { join } from 'path'
import { Registrar, Ioc } from '@adonisjs/fold'
import { Config } from '@adonisjs/config/build/standalone'

import { BodyParserMiddleware } from '../src/BodyParser'

test.group('BodyParser Provider', () => {
	test('register encryption provider', async (assert) => {
		const ioc = new Ioc()
		ioc.bind('Adonis/Core/Config', () => {
			return new Config()
		})

		const registrar = new Registrar(ioc, join(__dirname, '..'))
		await registrar
			.useProviders(['@adonisjs/http-server', './providers/BodyParserProvider'])
			.registerAndBoot()

		assert.instanceOf(ioc.use('Adonis/Core/BodyParserMiddleware'), BodyParserMiddleware)
	})

	test('extend request class by adding the file methods', async (assert) => {
		const ioc = new Ioc()
		ioc.bind('Adonis/Core/Config', () => {
			return new Config()
		})

		const registrar = new Registrar(ioc, join(__dirname, '..'))
		await registrar
			.useProviders(['@adonisjs/http-server', './providers/BodyParserProvider'])
			.registerAndBoot()

		assert.instanceOf(ioc.use('Adonis/Core/BodyParserMiddleware'), BodyParserMiddleware)
		assert.property(ioc.use('Adonis/Core/Request').prototype, 'file')
		assert.property(ioc.use('Adonis/Core/Request').prototype, 'files')
		assert.property(ioc.use('Adonis/Core/Request').prototype, 'allFiles')
	})
})
