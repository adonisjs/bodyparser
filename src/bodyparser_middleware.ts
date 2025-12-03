/*
 * @adonisjs/bodyparser
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { tmpdir } from 'node:os'
import { join, isAbsolute } from 'node:path'
import { Exception } from '@poppinss/utils/exception'
import type { HttpContext } from '@adonisjs/http-server'
import type { NextFn } from '@poppinss/middleware/types'
import type { FeatureFlags } from '@adonisjs/application'
import type { ExperimentalFlagsList } from '@adonisjs/application/types'

import debug from './debug.ts'
import { Multipart } from './multipart/main.ts'
import type { BodyParserConfig } from './types.ts'
import { streamFile } from './multipart/stream_file.ts'
import { parseText, prepareTextParserOptions } from './parsers/text.ts'
import { parseJSON, prepareJSONParserOptions } from './parsers/json.ts'
import { parseForm, prepareFormParserOptions } from './parsers/form.ts'

/**
 * Bindings to extend request
 */
import './bindings/request.ts'
import { prepareMultipartConfig } from './parsers/multipart.ts'

/**
 * BodyParser middleware parses the incoming request body and sets it as
 * request body to be read later in the request lifecycle.
 */
export class BodyParserMiddleware {
  /**
   * Body parser configuration
   */
  #config: BodyParserConfig

  #parsersConfig: {
    raw: ReturnType<typeof prepareTextParserOptions>
    form: ReturnType<typeof prepareFormParserOptions>
    json: ReturnType<typeof prepareJSONParserOptions>
    multipart: ReturnType<typeof prepareMultipartConfig>
  }

  /**
   * Creates a new BodyParserMiddleware instance
   *
   * @param config - The body parser configuration
   * @param _featureFlags - Feature flags (unused)
   */
  constructor(config: BodyParserConfig, _featureFlags?: FeatureFlags<ExperimentalFlagsList>) {
    this.#config = config
    this.#parsersConfig = {
      raw: prepareTextParserOptions(this.#config.raw),
      form: prepareFormParserOptions(this.#config.form),
      json: prepareJSONParserOptions(this.#config.json),
      multipart: prepareMultipartConfig(this.#config.multipart),
    }
    debug('using config %O', this.#config)
  }

  /**
   * Checks if the request content-type header matches any of the expected types.
   *
   * @param request - The HTTP request object
   * @param types - Array of MIME types to check against
   */
  #isType(request: HttpContext['request'], types: string[]): boolean {
    return !!(types && types.length && request.is(types))
  }

  /**
   * Converts raw-body errors into AdonisJS exceptions with appropriate
   * status codes and error codes.
   *
   * @param error - The raw-body error object
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
   * Generates a temporary file path for storing uploaded files. Uses the
   * configured tmpFileName function if provided, otherwise generates a UUID.
   *
   * @param config - The multipart configuration
   */
  #getTmpPath(config: BodyParserConfig['multipart']) {
    if (typeof config.tmpFileName === 'function') {
      const tmpPath = config.tmpFileName()
      return isAbsolute(tmpPath) ? tmpPath : join(tmpdir(), tmpPath)
    }

    return join(tmpdir(), crypto.randomUUID())
  }

  /**
   * Handle HTTP request body by parsing it according to the user
   * configuration
   *
   * @param ctx - The HTTP context
   * @param next - The next middleware function
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
    if (!this.#config.allowedMethods.includes(requestMethod)) {
      debug('skipping HTTP request "%s:%s"', requestMethod, requestUrl)
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
      debug('skipping as request has no body "%s:%s"', requestMethod, requestUrl)
      return next()
    }

    /**
     * Handle multipart form
     */
    const multipartConfig = this.#config['multipart']
    if (this.#isType(ctx.request, multipartConfig.types)) {
      debug('detected multipart request "%s:%s"', requestMethod, requestUrl)

      ctx.request.multipart = new Multipart(ctx, this.#parsersConfig.multipart, {})
      ctx.request.bodyType = 'multipart'

      /**
       * Skip parsing when `autoProcess` is disabled
       */
      if (multipartConfig.autoProcess === false) {
        debug('skipping auto processing of multipart request "%s:%s"', requestMethod, requestUrl)
        return next()
      }

      /**
       * Skip parsing when the current route matches one of the defined
       * processManually route patterns.
       */
      if (ctx.route && multipartConfig.processManually.includes(ctx.route.pattern)) {
        debug('skipping auto processing of multipart request "%s:%s"', requestMethod, requestUrl)
        return next()
      }

      /**
       * Skip parsing when the current route matches one of the "autoProcess"
       * patterns
       */
      if (
        ctx.route &&
        Array.isArray(multipartConfig.autoProcess) &&
        !multipartConfig.autoProcess.includes(ctx.route.pattern)
      ) {
        debug('skipping auto processing of multipart request "%s:%s"', requestMethod, requestUrl)
        return next()
      }

      /**
       * Make sure we are not running any validations on the uploaded files. They are
       * deferred for the end user when they will access file using `request.file`
       * method.
       */
      debug('auto processing multipart request "%s:%s"', requestMethod, requestUrl)
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
    const formConfig = this.#config['form']
    if (this.#isType(ctx.request, formConfig.types)) {
      debug('detected urlencoded request "%s:%s"', requestMethod, requestUrl)

      try {
        const { parsed, raw } = await parseForm(ctx.request.request, this.#parsersConfig.form)
        ctx.request.setInitialBody(parsed)
        ctx.request.updateRawBody(raw)
        ctx.request.bodyType = 'urlencoded'
        return next()
      } catch (error) {
        throw this.#getExceptionFor(error)
      }
    }

    /**
     * Handle content with JSON types
     */
    const jsonConfig = this.#config['json']
    if (this.#isType(ctx.request, jsonConfig.types)) {
      debug('detected JSON request "%s:%s"', requestMethod, requestUrl)

      try {
        const { parsed, raw } = await parseJSON(ctx.request.request, this.#parsersConfig.json)
        ctx.request.setInitialBody(parsed)
        ctx.request.updateRawBody(raw)
        ctx.request.bodyType = 'json'
        return next()
      } catch (error) {
        throw this.#getExceptionFor(error)
      }
    }

    /**
     * Handles raw request body
     */
    const rawConfig = this.#config['raw']
    if (this.#isType(ctx.request, rawConfig.types)) {
      debug('parsing raw body "%s:%s"', requestMethod, requestUrl)

      try {
        ctx.request.setInitialBody({})
        ctx.request.updateRawBody(await parseText(ctx.request.request, this.#parsersConfig.raw))
        ctx.request.bodyType = 'raw'
        return next()
      } catch (error) {
        throw this.#getExceptionFor(error)
      }
    }

    ctx.request.bodyType = 'unknown'
    await next()
  }
}
