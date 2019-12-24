/*
 * @adonisjs/bodyparser
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/// <reference path="../../adonis-typings/bodyparser.ts" />

import get from 'lodash.get'
import { RequestConstructorContract } from '@ioc:Adonis/Core/Request'
import { FileValidationOptions } from '@ioc:Adonis/Core/BodyParser'
import { File } from '../Multipart/File'

/**
 * Extend the Request class by adding `file` and `files` macro to read processed
 * files
 */
export default function extendRequest (Request: RequestConstructorContract) {
  /**
   * Fetch a single file
   */
  Request.macro('file', function getFile (key: string, options?: Partial<FileValidationOptions>) {
    let file: File | File[] = get(this['__raw_files'], key)
    file = Array.isArray(file) ? file[0] : file

    if (!file || file instanceof File === false) {
      return null
    }

    if (!file.validated) {
      file.validationOptions = options || file.validationOptions
      file.validate()
    }

    return file
  })

  /**
   * Fetch an array of files
   */
  Request.macro('files', function getFiles (key: string, options?: Partial<FileValidationOptions>) {
    let files: File | File[] = get(this['__raw_files'], key)
    files = Array.isArray(files) ? files: files ? [files] : []

    return files.map((file) => {
      if (!file.validated) {
        file.validationOptions = options || file.validationOptions
        file.validate()
      }
      return file
    })
  })
}
