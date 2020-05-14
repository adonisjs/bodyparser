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
import { IncomingMessage, ServerResponse } from 'http'
import { RequestConfig } from '@ioc:Adonis/Core/Request'
import { Logger } from '@adonisjs/logger/build/standalone'
import { Profiler } from '@adonisjs/profiler/build/standalone'
import { BodyParserConfig } from '@ioc:Adonis/Core/BodyParser'
import { Encryption } from '@adonisjs/encryption/build/standalone'
import { HttpContext, Router } from '@adonisjs/http-server/build/standalone'

const contents = JSON.stringify(require('../package.json'), null, 2).split('\n').join(EOL)

export const packageFilePath = join(__dirname, '../package.json')
export const packageFileSize = Buffer.from(contents, 'utf-8').length + EOL.length
export const sleep = (time: number) => new Promise((resolve) => setTimeout(resolve, time))

export const requestConfig: RequestConfig = {
  allowMethodSpoofing: false,
  trustProxy: () => true,
  subdomainOffset: 2,
  generateRequestId: false,
}

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
    types: [
      'application/x-www-form-urlencoded',
    ],
  },
  raw: {
    encoding: 'utf-8',
    limit: '1mb',
    queryString: {},
    types: [
      'text/*',
    ],
  },
  multipart: {
    autoProcess: true,
    processManually: [],
    encoding: 'utf-8',
    maxFields: 1000,
    limit: '20mb',
    types: [
      'multipart/form-data',
    ],
  },
}

export function getContext (
  url: string,
  params: any,
  req?: IncomingMessage,
  res?: ServerResponse,
) {
  const logger = getLogger()
  const profiler = new Profiler(__dirname, logger, {}).create('')
  const encryption = new Encryption({ secret: 'verylongandrandom32charsecretkey' })
  const router = new Router(encryption)
  return HttpContext.create(url, params, logger, profiler, encryption, router, req, res)
}

export function getLogger () {
  return new Logger({ enabled: false, level: 'trace', name: 'adonis' })
}
