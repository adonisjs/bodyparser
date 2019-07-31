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
import * as uuid from 'uuid/v1'
import * as coBody from 'co-body'
import { join, isAbsolute } from 'path'
import { Exception } from '@poppinss/utils'

import { RequestContract } from '@ioc:Adonis/Core/Request'
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { BodyParserConfigContract } from '@ioc:Adonis/Addons/BodyParser'

import { Multipart } from '../Multipart'
import { streamFile } from '../Multipart/streamFile'

/**
 * BodyParser middleware parses the incoming request body and set it as
 * request body to be read later in the request lifecycle.
 */
export class BodyParserMiddleware {
  constructor (private _config: BodyParserConfigContract) {
  }

  /**
   * Returns config for a given type
   */
  private _getConfigFor<K extends keyof BodyParserConfigContract> (type: K): BodyParserConfigContract[K] {
    const config = this._config[type]
    config['returnRawBody'] = true
    return config
  }

  /**
   * Ensures that types exists and have length
   */
  private _ensureTypes (types: string[]): boolean {
    return !!(types && types.length)
  }

  /**
   * Returns a boolean telling if request `content-type` header
   * matches the expected types or not
   */
  private _isType (request: RequestContract, types: string[]): boolean {
    return !!(this._ensureTypes(types) && request.is(types))
  }

  /**
   * Returns a proper Adonis style exception for popular error codes
   * returned by https://github.com/stream-utils/raw-body#readme.
   */
  private _getExceptionFor (error) {
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
  private _getTmpPath (config: BodyParserConfigContract['multipart']) {
    if (typeof (config.tmpFileName) === 'function') {
      const tmpPath = config.tmpFileName()
      return isAbsolute(tmpPath) ? tmpPath : join(tmpdir(), tmpPath)
    }

    return join(tmpdir(), uuid())
  }

  /**
   * Handle HTTP request body by parsing it as per the user
   * config
   */
  public async handle (
    { request, route }: HttpContextContract,
    next: () => Promise<void>,
  ): Promise<void> {
    /**
     * Initiating the `_files` private property as an object
     */
    request['_files'] = {}

    /**
     * Only process for whitelisted nodes
     */
    if (!this._config.whitelistedMethods.includes(request.method())) {
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
    const multipartConfig = this._getConfigFor('multipart')

    if (this._isType(request, multipartConfig.types)) {
      request.multipart = new Multipart(request, {
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
        const tmpPath = this._getTmpPath(multipartConfig)
        await streamFile(part, tmpPath, reporter)
        return { tmpPath }
      })

      await request.multipart.process()
      return next()
    }

    /**
     * Handle url-encoded form data
     */
    const formConfig = this._getConfigFor('form')
    if (this._isType(request, formConfig.types)) {
      try {
        const { parsed, raw } = await coBody.form(request.request, formConfig)
        request.setInitialBody(parsed)
        request.updateRawBody(raw)
        return next()
      } catch (error) {
        throw this._getExceptionFor(error)
      }
    }

    /**
     * Handle content with JSON types
     */
    const jsonConfig = this._getConfigFor('json')
    if (this._isType(request, jsonConfig.types)) {
      try {
        const { parsed, raw } = await coBody.json(request.request, jsonConfig)
        request.setInitialBody(parsed)
        request.updateRawBody(raw)
        return next()
      } catch (error) {
        throw this._getExceptionFor(error)
      }
    }

    /**
     * Handles raw request body
     */
    const rawConfig = this._getConfigFor('raw')
    if (this._isType(request, rawConfig.types)) {
      try {
        const { raw } = await coBody.text(request.request, rawConfig)
        request.setInitialBody({})
        request.updateRawBody(raw)
        return next()
      } catch (error) {
        throw this._getExceptionFor(error)
      }
    }

    await next()
  }
}
