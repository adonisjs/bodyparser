/*
 * @adonisjs/bodyparser
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { type BodyParserConfig, type BodyParserOptionalConfig } from './types.ts'

/**
 * Defines configuration for the bodyparser middleware. The provided configuration
 * is merged with sensible defaults for parsing JSON, form data, raw text, and
 * multipart requests.
 *
 * @param config - Optional configuration overrides for body parsing
 *
 * @example
 * ```ts
 * export default defineConfig({
 *   allowedMethods: ['POST', 'PUT', 'PATCH'],
 *   json: {
 *     limit: '2mb'
 *   },
 *   multipart: {
 *     autoProcess: true,
 *     limit: '50mb'
 *   }
 * })
 * ```
 */
export function defineConfig(config: BodyParserOptionalConfig): BodyParserConfig {
  return {
    allowedMethods: config.allowedMethods || ['POST', 'PUT', 'PATCH', 'DELETE'],

    form: {
      encoding: 'utf-8',
      limit: '1mb',
      queryString: {},
      types: ['application/x-www-form-urlencoded'],
      convertEmptyStringsToNull: true,
      trimWhitespaces: true,
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
      convertEmptyStringsToNull: true,
      trimWhitespaces: true,
      ...config.json,
    },

    raw: {
      encoding: 'utf-8',
      limit: '1mb',
      types: ['text/*'],
      ...config.raw,
    },

    multipart: {
      autoProcess: true,
      processManually: [],
      maxFields: 1000,
      limit: '20mb',
      types: ['multipart/form-data'],
      convertEmptyStringsToNull: true,
      trimWhitespaces: true,
      ...config.multipart,
    },
  }
}
