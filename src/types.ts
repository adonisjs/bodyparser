/*
 * @adonisjs/bodyparser
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Readable } from 'node:stream'
import type { MultipartFile } from './multipart/file.js'

/**
 * Qs module config
 */
type QueryStringConfig = {
  depth?: number
  allowPrototypes?: boolean
  plainObjects?: boolean
  parameterLimit?: number
  arrayLimit?: number
  ignoreQueryPrefix?: boolean
  delimiter?: RegExp | string
  allowDots?: boolean
  charset?: 'utf-8' | 'iso-8859-1' | undefined
  charsetSentinel?: boolean
  interpretNumericEntities?: boolean
  parseArrays?: boolean
  comma?: boolean
}

/**
 * Base config used by all types
 */
type BodyParserBaseConfig = {
  encoding: string
  limit: string | number
  types: string[]
}

/**
 * Body parser config for parsing JSON requests
 */
export type BodyParserJSONConfig = BodyParserBaseConfig & {
  strict: boolean
  convertEmptyStringsToNull: boolean
}

/**
 * Parser config for parsing form data
 */
export type BodyParserFormConfig = BodyParserBaseConfig & {
  queryString: QueryStringConfig
  convertEmptyStringsToNull: boolean
}

/**
 * Parser config for parsing raw body (untouched)
 */
export type BodyParserRawConfig = BodyParserBaseConfig

/**
 * Parser config for parsing multipart requests
 */
export type BodyParserMultipartConfig = BodyParserBaseConfig & {
  autoProcess: boolean | string[]
  maxFields: number
  processManually: string[]
  convertEmptyStringsToNull: boolean
  fieldsLimit?: number | string
  tmpFileName?(): string
}

/**
 * Body parser config for all supported form types
 */
export type BodyParserConfig = {
  allowedMethods: string[]
  json: BodyParserJSONConfig
  form: BodyParserFormConfig
  raw: BodyParserRawConfig
  multipart: BodyParserMultipartConfig
}

/**
 * Body parser config with partial config
 */
export type BodyParserOptionalConfig = {
  allowedMethods?: string[]
  json?: Partial<BodyParserJSONConfig>
  form?: Partial<BodyParserFormConfig>
  raw?: Partial<BodyParserRawConfig>
  multipart?: Partial<BodyParserMultipartConfig>
}

/**
 * ------------------------------------
 * Multipart related options
 * ------------------------------------
 */

/**
 * Readable stream along with some extra data. This is what
 * is passed to `onFile` handlers.
 */
export type MultipartStream = Readable & {
  headers: {
    [key: string]: string
  }
  name: string
  filename: string
  bytes: number
  file: MultipartFile
}

/**
 * The callback handler for a given file part
 */
export type PartHandler = (
  part: MultipartStream,
  reportChunk: (chunk: Buffer) => void
) => Promise<({ filePath?: string; tmpPath?: string } & { [key: string]: any }) | void>

/**
 * ------------------------------------
 * Multipart file related options
 * ------------------------------------
 */

/**
 * The options that can be used to validate a given
 * file
 */
export type FileValidationOptions = {
  size: string | number
  extnames: string[]
}

/**
 * Error shape for file upload errors
 */
export type FileUploadError = {
  fieldName: string
  clientName: string
  message: string
  type: 'size' | 'extname' | 'fatal'
}

/**
 * Shape of file.toJSON return value
 */
export type FileJSON = {
  fieldName: string
  clientName: string
  size: number
  filePath?: string
  fileName?: string
  type?: string
  extname?: string
  subtype?: string
  state: 'idle' | 'streaming' | 'consumed' | 'moved'
  isValid: boolean
  validated: boolean
  errors: FileUploadError[]
  meta: any
}

export { MultipartFile }
