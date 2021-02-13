/*
 * @adonisjs/bodyparser
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../adonis-typings/index.ts" />

import { EOL } from 'os'
import { join } from 'path'
import { Filesystem } from '@poppinss/dev-utils'
import { Application } from '@adonisjs/application'
import { BodyParserConfig } from '@ioc:Adonis/Core/BodyParser'

const contents = JSON.stringify(require('../package.json'), null, 2).split('\n').join(EOL)

export const packageFilePath = join(__dirname, '../package.json')
export const packageFileSize = Buffer.from(contents, 'utf-8').length + EOL.length
export const sleep = (time: number) => new Promise((resolve) => setTimeout(resolve, time))
export const fs = new Filesystem(join(__dirname, 'app'))

export const bodyParserConfig: BodyParserConfig = {
	whitelistedMethods: ['POST', 'PUT', 'PATCH', 'DELETE'],
	json: {
		encoding: 'utf-8',
		limit: '1mb',
		strict: true,
		types: [
			'application/json',
			'application/json-patch+json',
			'application/vnd.api+json',
			'application/csp-report',
		],
	},
	form: {
		encoding: 'utf-8',
		limit: '1mb',
		queryString: {},
		types: ['application/x-www-form-urlencoded'],
	},
	raw: {
		encoding: 'utf-8',
		limit: '1mb',
		queryString: {},
		types: ['text/*'],
	},
	multipart: {
		autoProcess: true,
		processManually: [],
		encoding: 'utf-8',
		maxFields: 1000,
		limit: '20mb',
		types: ['multipart/form-data'],
	},
}

/**
 * Setup application
 */
export async function setupApp(providers?: string[]) {
	const app = new Application(fs.basePath, 'web', {
		providers: ['@adonisjs/encryption', '@adonisjs/http-server'].concat(providers || []),
	})
	await fs.add('.env', '')
	await fs.add(
		'config/app.ts',
		`
		export const appKey = 'verylongandrandom32charsecretkey'
		export const http = {
			trustProxy: () => true,
			cookie: {},
		}
	`
	)

	await app.setup()
	await app.registerProviders()
	await app.bootProviders()

	return app
}
