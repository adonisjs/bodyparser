/*
 * @adonisjs/bodyparser
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import lodash from '@poppinss/utils/lodash'
import { Request } from '@adonisjs/http-server'

import { MultipartFile } from '../multipart/file.js'
import type { Multipart } from '../multipart/main.js'
import type { FileValidationOptions } from '../types.js'

/**
 * Extending request class with custom properties.
 */
declare module '@adonisjs/http-server' {
  export interface Request {
    multipart: Multipart
    __raw_files: Record<string, MultipartFile | MultipartFile[]>
    allFiles(): Record<string, MultipartFile | MultipartFile[]>
    file(key: string, options?: Partial<FileValidationOptions>): MultipartFile | null
    files(key: string, options?: Partial<FileValidationOptions>): MultipartFile[]
  }
}

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
  return this['__raw_files'] || {}
})
