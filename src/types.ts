/*
 * @adonisjs/bodyparser
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { type Readable } from 'node:stream'
import type { MultipartFile } from './multipart/file.ts'

/**
 * Configuration options for parsing query strings using the qs module
 */
type QueryStringConfig = {
  /** Maximum depth for nested objects */
  depth?: number
  /** Whether to allow prototype properties */
  allowPrototypes?: boolean
  /** Whether to create plain objects */
  plainObjects?: boolean
  /** Maximum number of parameters to parse */
  parameterLimit?: number
  /** Maximum number of array elements to parse */
  arrayLimit?: number
  /** Whether to ignore the leading ? in query strings */
  ignoreQueryPrefix?: boolean
  /** Delimiter to use for parsing */
  delimiter?: RegExp | string
  /** Whether to allow dots in object keys */
  allowDots?: boolean
  /** Character encoding to use */
  charset?: 'utf-8' | 'iso-8859-1' | undefined
  /** Whether to use charset sentinel */
  charsetSentinel?: boolean
  /** Whether to interpret numeric entities */
  interpretNumericEntities?: boolean
  /** Whether to parse arrays */
  parseArrays?: boolean
  /** Whether to parse comma-separated values as arrays */
  comma?: boolean
}

/**
 * Base configuration options shared by all body parser types
 */
type BodyParserBaseConfig = {
  /** Character encoding for parsing the body */
  encoding: string
  /** Maximum size limit for the request body */
  limit: string | number
  /** Array of supported MIME types */
  types: string[]
}

/**
 * Configuration options for parsing JSON request bodies
 */
export type BodyParserJSONConfig = BodyParserBaseConfig & {
  /** Whether to only accept arrays and objects as valid JSON */
  strict: boolean
  /** Whether to convert empty strings to null values */
  convertEmptyStringsToNull: boolean
}

/**
 * Configuration options for parsing URL-encoded form data
 */
export type BodyParserFormConfig = BodyParserBaseConfig & {
  /** Query string parsing configuration */
  queryString: QueryStringConfig
  /** Whether to convert empty strings to null values */
  convertEmptyStringsToNull: boolean
}

/**
 * Configuration options for parsing raw request bodies (untouched)
 */
export type BodyParserRawConfig = BodyParserBaseConfig

/**
 * Configuration options for parsing multipart form data requests
 */
export type BodyParserMultipartConfig = BodyParserBaseConfig & {
  /** Whether to auto-process files or array of route patterns to auto-process */
  autoProcess: boolean | string[]
  /** Maximum number of form fields allowed */
  maxFields: number
  /** Array of route patterns to process manually */
  processManually: string[]
  /** Whether to convert empty strings to null values */
  convertEmptyStringsToNull: boolean
  /** Maximum size for all form fields combined */
  fieldsLimit?: number | string
  /** Function to generate temporary file names */
  tmpFileName?(): string
}

/**
 * Complete body parser configuration for all supported content types
 */
export type BodyParserConfig = {
  /** HTTP methods that should have their bodies parsed */
  allowedMethods: string[]
  /** Configuration for JSON body parsing */
  json: BodyParserJSONConfig
  /** Configuration for form data body parsing */
  form: BodyParserFormConfig
  /** Configuration for raw body parsing */
  raw: BodyParserRawConfig
  /** Configuration for multipart body parsing */
  multipart: BodyParserMultipartConfig
}

/**
 * Optional body parser configuration with all properties being optional
 */
export type BodyParserOptionalConfig = {
  /** HTTP methods that should have their bodies parsed */
  allowedMethods?: string[]
  /** Partial configuration for JSON body parsing */
  json?: Partial<BodyParserJSONConfig>
  /** Partial configuration for form data body parsing */
  form?: Partial<BodyParserFormConfig>
  /** Partial configuration for raw body parsing */
  raw?: Partial<BodyParserRawConfig>
  /** Partial configuration for multipart body parsing */
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
  /** Headers associated with the multipart stream */
  headers: {
    [key: string]: string
  }
  /** The form field name */
  name: string
  /** The original filename from the client */
  filename: string
  /** The number of bytes in the stream */
  bytes: number
  /** The MultipartFile instance associated with this stream */
  file: MultipartFile
}

/**
 * The callback handler function for processing a multipart file part
 */
export type PartHandler = (
  /** The multipart stream to process */
  part: MultipartStream,
  /** Function to report each chunk of data */
  reportChunk: (chunk: Buffer) => void
) => Promise<({ filePath?: string; tmpPath?: string } & { [key: string]: any }) | void>

/**
 * ------------------------------------
 * Multipart file related options
 * ------------------------------------
 */

/**
 * Options that can be used to validate an uploaded file
 */
export type FileValidationOptions = {
  /** Maximum allowed file size (as string with unit or number in bytes) */
  size: string | number
  /** Array of allowed file extensions */
  extnames: string[]
}

/**
 * Structure representing a file upload error
 */
export type FileUploadError = {
  /** The form field name where the error occurred */
  fieldName: string
  /** The original filename from the client */
  clientName: string
  /** Error message describing what went wrong */
  message: string
  /** Type of error that occurred */
  type: 'size' | 'extname' | 'fatal'
}

/**
 * JSON representation of a MultipartFile instance
 */
export type FileJSON = {
  /** The form field name */
  fieldName: string
  /** The original filename from the client */
  clientName: string
  /** Size of the file in bytes */
  size: number
  /** Full path where the file was moved (if moved) */
  filePath?: string
  /** Relative filename after moving (if moved) */
  fileName?: string
  /** MIME type of the file */
  type?: string
  /** File extension */
  extname?: string
  /** MIME subtype */
  subtype?: string
  /** Current state of the file processing */
  state: 'idle' | 'streaming' | 'consumed' | 'moved'
  /** Whether the file passed all validations */
  isValid: boolean
  /** Whether validations have been run */
  validated: boolean
  /** Array of validation errors, if any */
  errors: FileUploadError[]
  /** Additional metadata associated with the file */
  meta: any
}

export { MultipartFile }
