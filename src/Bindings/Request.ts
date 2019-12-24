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
    file[0].validationOptions = options || {}
    file[0].validate()
    return file[0]
  } else if (Array.isArray(file)) {
    file.forEach((one) => {
      one.validationOptions = options || {}
      one.validate()
    })
    return file
  } else {
    file.validationOptions = options || {}
    file.validate()
    return file
  }
}

/**
 * Extend the Request class by adding `file` and `files` macro to read processed
 * files
 */
export default function extendRequest (Request: RequestConstructorContract) {
  Request.macro('file', function file (key: string, options?: Partial<FileValidationOptions>) {
    return getFile(this['__raw_files'], key, true, options)
  })

  Request.macro('files', function filesList (key: string, options?: Partial<FileValidationOptions>) {
    const files = getFile(this['__raw_files'], key, false, options)
    if (!files) {
      return []
    }
    return Array.isArray(files) ? files : [files]
  })
}
