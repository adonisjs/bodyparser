/*
 * @adonisjs/bodyparser
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/// <reference path="../../adonis-typings/bodyparser.ts" />

import { get } from 'lodash'
import { RequestConstructorContract } from '@ioc:Adonis/Core/Request'
import { FileValidationOptions, MultipartFileContract } from '@ioc:Adonis/Addons/BodyParser'

import { validateExtension, validateSize } from '../utils'

/**
 * Validating a given file.
 */
function validateFile (file: MultipartFileContract, options?: Partial<FileValidationOptions>) {
  if (file.validated) {
    return
  }

  file.validated = true
  if (!options) {
    return
  }

  const sizeError = validateSize(file.fieldName, file.clientName, file.size, options.size)
  if (sizeError) {
    file.errors.push(sizeError)
  }

  const extError = validateExtension(file.fieldName, file.clientName, file.extname, options.extnames)
  if (extError) {
    file.errors.push(extError)
  }
}

/**
 * Validates and returns a file for a given key
 */
function getFile (
  files: { [key: string]: MultipartFileContract | MultipartFileContract[] },
  key: string,
  getOne: boolean,
  options?: Partial<FileValidationOptions>,
) {
  const file = get(files, key)

  /**
   * Return null when there is no file
   */
  if (!file) {
    return null
  }

  if (Array.isArray(file) && getOne) {
    validateFile(file[0], options)
    return file[0]
  } else if (Array.isArray(file)) {
    file.forEach((one) => validateFile(one, options))
    return file
  } else {
    validateFile(file, options)
    return file
  }
}

/**
 * Extend the Request class by adding `file` and `files` macro to read processed
 * files
 */
export default function extendRequest (Request: RequestConstructorContract) {
  Request.macro('file', function file (key: string, options?: Partial<FileValidationOptions>) {
    return getFile(this._files, key, true, options)
  })

  Request.macro('files', function files (key: string, options?: Partial<FileValidationOptions>) {
    const files = getFile(this._files, key, false, options)
    if (!files) {
      return []
    }
    return Array.isArray(files) ? files : [files]
  })
}
