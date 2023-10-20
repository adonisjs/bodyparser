/*
 * @adonisjs/bodyparser
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import lodash from '@poppinss/utils/lodash'
import { Request } from '@adonisjs/http-server'
import { RuntimeException } from '@poppinss/utils'

import debug from '../debug.js'
import { MultipartFile } from '../multipart/file.js'
import type { FileValidationOptions } from '../types.js'

/**
 * Updates the validation options on the file instance
 */
function setFileOptions(file: MultipartFile, options?: Partial<FileValidationOptions>) {
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
function isInstanceOfFile(file: any): file is MultipartFile {
  return file && file instanceof MultipartFile
}

debug('extending request class with "file", "files" and "allFiles" macros')

/**
 * Serialize files alongside rest of the request files
 */
Request.macro('toJSON', function (this: Request) {
  return {
    ...this.serialize(),
    files: this['__raw_files'] || {},
  }
})

/**
 * Fetch a single file
 */
Request.macro(
  'file',
  function getFile(this: Request, key: string, options?: Partial<FileValidationOptions>) {
    let file: unknown = lodash.get(this.allFiles(), key)
    file = Array.isArray(file) ? file[0] : file

    if (!isInstanceOfFile(file)) {
      return null
    }

    setFileOptions(file, options)
    file.validate()
    return file
  }
)

/**
 * Fetch an array of files
 */
Request.macro(
  'files',
  function getFiles(this: Request, key: string, options?: Partial<FileValidationOptions>) {
    let files: unknown[] = lodash.get(this.allFiles(), key)
    files = Array.isArray(files) ? files : files ? [files] : []

    return files.filter(isInstanceOfFile).map((file) => {
      setFileOptions(file, options)
      file.validate()
      return file
    })
  }
)

/**
 * Fetch all files
 */
Request.macro('allFiles', function allFiles(this: Request) {
  if (!this.__raw_files) {
    throw new RuntimeException(
      'Cannot read files. Make sure the bodyparser middleware is registered'
    )
  }

  return this['__raw_files']
})
