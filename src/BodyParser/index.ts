/*
* @adonisjs/bodyparser
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

/// <reference path="../../adonis-typings/bodyparser.ts" />

import { tmpdir } from 'os'
import { v1 as uuidV1 } from 'uuid'
import coBody from 'co-body'
import { join, isAbsolute } from 'path'
import { Exception } from '@poppinss/utils'

import { RequestContract } from '@ioc:Adonis/Core/Request'
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { BodyParserConfigContract } from '@ioc:Adonis/Core/BodyParser'

import { Multipart } from '../Multipart'
import { streamFile } from '../Multipart/streamFile'

/**
 * BodyParser middleware parses the incoming request body and set it as
 * request body to be read later in the request lifecycle.
 */
export class BodyParserMiddleware {
  constructor (private config: BodyParserConfigContract) {
  }

  /**
   * Returns config for a given type
   */
  private getConfigFor<K extends keyof BodyParserConfigContract> (type: K): BodyParserConfigContract[K] {
    const config = this.config[type]
    config['returnRawBody'] = true
    return config
  }

  /**
   * Ensures that types exists and have length
   */
  private ensureTypes (types: string[]): boolean {
    return !!(types && types.length)
  }

  /**
   * Returns a boolean telling if request `content-type` header
   * matches the expected types or not
   */
  private isType (request: RequestContract, types: string[]): boolean {
    return !!(this.ensureTypes(types) && request.is(types))
  }

  /**
   * Returns a proper Adonis style exception for popular error codes
   * returned by https://github.com/stream-utils/raw-body#readme.
   */
  private getExceptionFor (error) {
    switch (error.type) {
      case 'encoding.unsupported':
        return new Exception(error.message, error.status, 'E_ENCODING_UNSUPPORTED')
      case 'entity.too.large':
        return new Exception(error.message, error.status, 'E_REQUEST_ENTITY_TOO_LARGE')
      case 'request.aborted':
        return new Exception(error.message, error.status, 'E_REQUEST_ABORTED')
      default:
        return error
    }
  }

  /**
   * Returns the tmp path for storing the files temporarly
   */
  private getTmpPath (config: BodyParserConfigContract['multipart']) {
    if (typeof (config.tmpFileName) === 'function') {
      const tmpPath = config.tmpFileName()
      return isAbsolute(tmpPath) ? tmpPath : join(tmpdir(), tmpPath)
    }

    return join(tmpdir(), uuidV1())
  }

  /**
   * Handle HTTP request body by parsing it as per the user
   * config
   */
  public async handle (
    { request, route, profiler, logger }: HttpContextContract,
    next: () => Promise<void>,
  ): Promise<void> {
    /**
     * Initiating the `__raw_files` private property as an object
     */
    request['__raw_files'] = {}

    /**
     * Only process for whitelisted nodes
     */
    if (!this.config.whitelistedMethods.includes(request.method())) {
      return next()
    }

    /**
     * Return early when request body is empty. Many clients set the `Content-length = 0`
     * when request doesn't have any body, which is not handled by the below method.
     *
     * The main point of `hasBody` is to early return requests with empty body created by
     * clients with missing headers.
     */
    if (!request.hasBody()) {
      return next()
    }

    /**
     * Handle multipart form
     */
    const multipartConfig = this.getConfigFor('multipart')

    if (this.isType(request, multipartConfig.types)) {
      request.multipart = new Multipart(request, logger, {
        maxFields: multipartConfig.maxFields,
        limit: multipartConfig.limit,
      })

      /**
       * Skip parsing when `autoProcess` is disabled or route matches one
       * of the defined processManually route patterns.
       */
      if (!multipartConfig.autoProcess || multipartConfig.processManually.indexOf(route!.pattern) > -1) {
        return next()
      }

      /**
       * Make sure we are not running any validations on the uploaded files. They are
       * deferred for the end user when they will access file using `request.file`
       * method.
       */
      request.multipart.onFile('*', { deferValidations: true }, async (part, reporter) => {
        /**
         * We need to abort the main request when we are unable to process any
         * file. Otherwise the error will endup on the file object, which
         * is incorrect.
         */
        try {
          const tmpPath = this.getTmpPath(multipartConfig)
          await streamFile(part, tmpPath, reporter)
          return { tmpPath }
        } catch (error) {
          request.multipart.abort(error)
        }
      })

      const action = profiler.profile('bodyparser:multipart')

      try {
        await request.multipart.process()
        action.end()
        return next()
      } catch (error) {
        action.end({ error })
        throw error
      }
    }

    /**
     * Handle url-encoded form data
     */
    const formConfig = this.getConfigFor('form')
    if (this.isType(request, formConfig.types)) {
      const action = profiler.profile('bodyparser:urlencoded')

      try {
        const { parsed, raw } = await coBody.form(request.request, formConfig)
        request.setInitialBody(parsed)
        request.updateRawBody(raw)
        action.end()
        return next()
      } catch (error) {
        action.end({ error })
        throw this.getExceptionFor(error)
      }
    }

    /**
     * Handle content with JSON types
     */
    const jsonConfig = this.getConfigFor('json')
    if (this.isType(request, jsonConfig.types)) {
      const action = profiler.profile('bodyparser:json')

      try {
        const { parsed, raw } = await coBody.json(request.request, jsonConfig)
        request.setInitialBody(parsed)
        request.updateRawBody(raw)
        action.end()
        return next()
      } catch (error) {
        action.end({ error })
        throw this.getExceptionFor(error)
      }
    }

    /**
     * Handles raw request body
     */
    const rawConfig = this.getConfigFor('raw')
    if (this.isType(request, rawConfig.types)) {
      const action = profiler.profile('bodyparser:raw')

      try {
        const { raw } = await coBody.text(request.request, rawConfig)
        request.setInitialBody({})
        request.updateRawBody(raw)
        action.end()
        return next()
      } catch (error) {
        action.end({ error })
        throw this.getExceptionFor(error)
      }
    }

    await next()
  }
}
