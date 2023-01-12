/*
 * @adonisjs/bodyparser
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { BodyParserConfig, BodyParserOptionalConfig } from './types.js'

/**
 * Define config for the bodyparser middleware. Your defined config will be
 * merged with the default config
 */
export function defineConfig(config: BodyParserOptionalConfig): BodyParserConfig {
  return {
    whitelistedMethods: config.whitelistedMethods || ['POST', 'PUT', 'PATCH', 'DELETE'],

    form: {
      encoding: 'utf-8',
      limit: '1mb',
      queryString: {},
      types: ['application/x-www-form-urlencoded'],
      convertEmptyStringsToNull: true,
      ...config.form,
    },

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
      ...config.json,
    },

    raw: {
      encoding: 'utf-8',
      limit: '1mb',
      queryString: {},
      types: ['text/*'],
      ...config.raw,
    },

    multipart: {
      autoProcess: true,
      processManually: [],
      encoding: 'utf-8',
      maxFields: 1000,
      limit: '20mb',
      types: ['multipart/form-data'],
      convertEmptyStringsToNull: true,
      ...config.multipart,
    },
  }
}
