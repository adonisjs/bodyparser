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
import { FileValidationOptions } from '@ioc:Adonis/Core/BodyParser'
import { RequestConstructorContract } from '@ioc:Adonis/Core/Request'
import { File } from '../Multipart/File'

/**
 * Updates the validation options on the file instance
 */
function setFileOptions (file: File, options?: Partial<FileValidationOptions>) {
  if (file.sizeLimit === undefined && options && options.size) {
    file.sizeLimit = options.size
  }

  if (file.allowedExtensions === undefined && options && options.extnames) {
    file.allowedExtensions = options.extnames
  }
}

/**
 * A boolean to know if file is an instance of multipart
 * file class
 */
function isInstanceOfFile (file: any): file is File {
  return file && file instanceof File
}

/**
 * Extend the Request class by adding `file` and `files` macro to read processed
 * files
 */
export default function extendRequest (Request: RequestConstructorContract) {
  /**
   * Fetch a single file
   */
  Request.macro('file', function getFile (key: string, options?: Partial<FileValidationOptions>) {
    let file: unknown = get(this['__raw_files'], key)
    file = Array.isArray(file) ? file[0] : file

    if (!isInstanceOfFile(file)) {
      return null
    }

    setFileOptions(file, options)
    file.validate()
    return file
  })

  /**
   * Fetch an array of files
   */
  Request.macro('files', function getFiles (key: string, options?: Partial<FileValidationOptions>) {
    let files: unknown[] = get(this['__raw_files'], key)
    files = Array.isArray(files) ? files : (files ? [files] : [])

    return files.filter(isInstanceOfFile).map((file) => {
      setFileOptions(file, options)
      file.validate()
      return file
    })
  })

  /**
   * Fetch all files
   */
  Request.macro('allFiles', function allFiles () {
    return this['__raw_files'] || {}
  })
}
