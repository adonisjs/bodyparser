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
import { RuntimeException } from '@poppinss/utils/exception'

import debug from '../debug.ts'
import { MultipartFile } from '../multipart/file.ts'
import type { FileValidationOptions } from '../types.ts'

/**
 * Updates the validation options on a file instance if they haven't been set already.
 *
 * @param file - The multipart file instance to update
 * @param options - Validation options including size limit and allowed extensions
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
 * Type guard to check if a value is an instance of MultipartFile.
 *
 * @param file - The value to check
 */
function isInstanceOfFile(file: any): file is MultipartFile {
  return file && file instanceof MultipartFile
}

debug('extending request class with "file", "files" and "allFiles" macros')

/**
 * Extends the Request class toJSON method to serialize files alongside
 * the rest of the request data.
 */
Request.macro('toJSON', function (this: Request) {
  return {
    ...this.serialize(),
    files: this['__raw_files'] || {},
  }
})

/**
 * Extends the Request class with a method to fetch a single uploaded file.
 * When an array of files exists for the key, returns the first file.
 *
 * @example
 * ```ts
 * const avatar = request.file('avatar', {
 *   size: '2mb',
 *   extnames: ['jpg', 'png', 'jpeg']
 * })
 *
 * if (avatar && avatar.isValid) {
 *   await avatar.move(app.publicPath('uploads'))
 * }
 * ```
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
 * Extends the Request class with a method to fetch all uploaded files for
 * a given field name. Always returns an array, even if a single file was uploaded.
 *
 * @example
 * ```ts
 * const documents = request.files('documents', {
 *   size: '5mb',
 *   extnames: ['pdf', 'doc', 'docx']
 * })
 *
 * for (const doc of documents) {
 *   if (doc.isValid) {
 *     await doc.move(app.publicPath('uploads'))
 *   }
 * }
 * ```
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
 * Extends the Request class with a method to fetch all uploaded files
 * from the request. Throws an error if the bodyparser middleware is not registered.
 *
 * @example
 * ```ts
 * const allFiles = request.allFiles()
 * // { avatar: MultipartFile, documents: [MultipartFile, MultipartFile] }
 * ```
 */
Request.macro('allFiles', function allFiles(this: Request) {
  if (!this.__raw_files) {
    throw new RuntimeException(
      'Cannot read files. Make sure the bodyparser middleware is registered'
    )
  }

  return this['__raw_files']
})
