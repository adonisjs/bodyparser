/*
 * @adonisjs/bodyparser
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

// @ts-expect-error
import coBody from '@poppinss/co-body'

import { tmpdir } from 'node:os'
import { Exception } from '@poppinss/utils'
import { join, isAbsolute } from 'node:path'
import { createId } from '@paralleldrive/cuid2'
import type { NextFn } from '@adonisjs/http-server/types'
import type { HttpContext } from '@adonisjs/http-server'

import debug from './debug.js'
import { parseForm } from './parsers/form.js'
import { Multipart } from './multipart/main.js'
import type { BodyParserConfig } from './types.js'
import { streamFile } from './multipart/stream_file.js'

/**
 * Bindings to extend request
 */
import './bindings/request.js'

/**
 * BodyParser middleware parses the incoming request body and set it as
 * request body to be read later in the request lifecycle.
 */
export class BodyParserMiddleware {
  /**
   * Bodyparser config
   */
  #config: BodyParserConfig

  constructor(config: BodyParserConfig) {
    this.#config = config
    debug('using config %O', this.#config)
  }

  /**
   * Returns config for a given type
   */
  #getConfigFor<K extends keyof BodyParserConfig>(type: K): BodyParserConfig[K] {
    const config = this.#config[type]
    return config
  }

  /**
   * Ensures that types exists and have length
   */
  #ensureTypes(types: string[]): boolean {
    return !!(types && types.length)
  }

  /**
   * Returns a boolean telling if request `content-type` header
   * matches the expected types or not
   */
  #isType(request: HttpContext['request'], types: string[]): boolean {
    return !!(this.#ensureTypes(types) && request.is(types))
  }

  /**
   * Returns a proper Adonis style exception for popular error codes
   * returned by https://github.com/stream-utils/raw-body#readme.
   */
  #getExceptionFor(error: { type: string; status: number; message: string }) {
    switch (error.type) {
      case 'encoding.unsupported':
        return new Exception(error.message, {
          status: error.status,
          code: 'E_ENCODING_UNSUPPORTED',
        })
      case 'entity.too.large':
        return new Exception(error.message, {
          status: error.status,
          code: 'E_REQUEST_ENTITY_TOO_LARGE',
        })
      case 'request.aborted':
        return new Exception(error.message, { status: error.status, code: 'E_REQUEST_ABORTED' })
      default:
        return error
    }
  }

  /**
   * Returns the tmp path for storing the files temporarly
   */
  #getTmpPath(config: BodyParserConfig['multipart']) {
    if (typeof config.tmpFileName === 'function') {
      const tmpPath = config.tmpFileName()
      return isAbsolute(tmpPath) ? tmpPath : join(tmpdir(), tmpPath)
    }

    return join(tmpdir(), createId())
  }

  /**
   * Handle HTTP request body by parsing it as per the user
   * config
   */
  async handle(ctx: HttpContext, next: NextFn) {
    /**
     * Initiating the `__raw_files` property as an object
     */
    ctx.request['__raw_files'] = {}
    const requestUrl = ctx.request.url()
    const requestMethod = ctx.request.method()

    /**
     * Only process for whitelisted nodes
     */
    if (!this.#config.whitelistedMethods.includes(requestMethod)) {
      debug('skipping HTTP request method "%s", URI: "%s"', requestMethod, requestUrl)
      return next()
    }

    /**
     * Return early when request body is empty. Many clients set the `Content-length = 0`
     * when request doesn't have any body, which is not handled by the below method.
     *
     * The main point of `hasBody` is to early return requests with empty body created by
     * clients with missing headers.
     */
    if (!ctx.request.hasBody()) {
      debug('skipping as request has no body, URI: "%s"', requestUrl)
      return next()
    }

    /**
     * Handle multipart form
     */
    const multipartConfig = this.#getConfigFor('multipart')

    if (this.#isType(ctx.request, multipartConfig.types)) {
      debug('parsing multipart body, URI: "%s"', requestUrl)

      ctx.request.multipart = new Multipart(ctx, {
        maxFields: multipartConfig.maxFields,
        limit: multipartConfig.limit,
        fieldsLimit: multipartConfig.fieldsLimit,
        convertEmptyStringsToNull: multipartConfig.convertEmptyStringsToNull,
      })

      /**
       * Skip parsing when `autoProcess` is disabled or route matches one
       * of the defined processManually route patterns.
       */
      if (
        !multipartConfig.autoProcess ||
        (ctx.route && multipartConfig.processManually.indexOf(ctx.route.pattern) > -1)
      ) {
        return next()
      }

      /**
       * Make sure we are not running any validations on the uploaded files. They are
       * deferred for the end user when they will access file using `request.file`
       * method.
       */
      ctx.request.multipart.onFile('*', { deferValidations: true }, async (part, reporter) => {
        /**
         * We need to abort the main request when we are unable to process any
         * file. Otherwise the error will endup on the file object, which
         * is incorrect.
         */
        try {
          const tmpPath = this.#getTmpPath(multipartConfig)
          await streamFile(part, tmpPath, reporter)
          return { tmpPath }
        } catch (error) {
          ctx.request.multipart.abort(error)
        }
      })

      try {
        await ctx.request.multipart.process()
        return next()
      } catch (error) {
        throw error
      }
    }

    /**
     * Handle url-encoded form data
     */
    const formConfig = this.#getConfigFor('form')
    if (this.#isType(ctx.request, formConfig.types)) {
      debug('parsing urlencoded form, URI: "%s"', requestUrl)

      try {
        const { parsed, raw } = await parseForm(ctx.request.request, formConfig)
        ctx.request.setInitialBody(parsed)
        ctx.request.updateRawBody(raw)
        return next()
      } catch (error) {
        throw this.#getExceptionFor(error)
      }
    }

    /**
     * Handle content with JSON types
     */
    const jsonConfig = this.#getConfigFor('json')
    if (this.#isType(ctx.request, jsonConfig.types)) {
      debug('parsing JSON body, URI: "%s"', requestUrl)

      try {
        const { parsed, raw } = await coBody.json(ctx.request.request, {
          ...jsonConfig,
          returnRawBody: true,
        })
        ctx.request.setInitialBody(parsed)
        ctx.request.updateRawBody(raw)
        return next()
      } catch (error) {
        throw this.#getExceptionFor(error)
      }
    }

    /**
     * Handles raw request body
     */
    const rawConfig = this.#getConfigFor('raw')
    if (this.#isType(ctx.request, rawConfig.types)) {
      debug('parsing raw body, URI: "%s"', requestUrl)

      try {
        const { raw } = await coBody.text(ctx.request.request, {
          ...rawConfig,
          returnRawBody: true,
        })
        ctx.request.setInitialBody({})
        ctx.request.updateRawBody(raw)
        return next()
      } catch (error) {
        throw this.#getExceptionFor(error)
      }
    }

    await next()
  }
}
