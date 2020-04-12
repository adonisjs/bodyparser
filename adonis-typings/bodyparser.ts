/*
* @adonisjs/bodyparser
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

declare module '@ioc:Adonis/Core/BodyParser' {
  import { Readable } from 'stream'

  /**
   * Qs module config
   */
  type QueryStringConfig = {
    depth?: number,
    allowPrototypes?: boolean,
    plainObjects?: boolean,
    parameterLimit?: number,
    arrayLimit?: number,
    ignoreQueryPrefix?: boolean,
    delimiter?: RegExp | string,
    allowDots?: boolean,
    charset?: string,
    charsetSentinel?: boolean,
    interpretNumericEntities?: boolean,
    parseArrays?: boolean,
    comma?: boolean,
  }

  /**
   * Base config used by all types
   */
  type BodyParserBaseConfig = {
    encoding: string,
    limit: string | number,
    types: string[],
  }

  /**
   * Body parser config for parsing JSON requests
   */
  export type BodyParserJSONConfig = BodyParserBaseConfig & {
    strict: boolean,
  }

  /**
   * Parser config for parsing form data
   */
  export type BodyParserFormConfig = BodyParserBaseConfig & {
    queryString: QueryStringConfig,
  }

  /**
   * Parser config for parsing raw body (untouched)
   */
  export type BodyParserRawConfig = BodyParserBaseConfig & {
    queryString: QueryStringConfig,
  }

  /**
   * Parser config for parsing multipart requests
   */
  export type BodyParserMultipartConfig = BodyParserBaseConfig & {
    autoProcess: boolean,
    maxFields: number,
    processManually: string[],
    tmpFileName? (): string,
  }

  /**
   * Body parser config for all different types
   */
  export type BodyParserConfig = {
    whitelistedMethods: string[],
    json: BodyParserJSONConfig,
    form: BodyParserFormConfig,
    raw: BodyParserRawConfig,
    multipart: BodyParserMultipartConfig,
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
      [key: string]: string,
    },
    name: string,
    filename: string,
    bytes: number,
  }

  /**
   * The callback handler for a given file part
   */
  export type PartHandler = (
    part: MultipartStream,
    reportChunk: (chunk: Buffer) => void,
  ) => Promise<({ filePath?: string, tmpPath?: string } & { [key: string]: any }) | void>

  /**
   * Multipart class contract, since it is exposed on the request object,
   * we need the interface to extend typings.
   */
  export interface MultipartContract {
    state: 'idle' | 'processing' | 'error' | 'success',
    abort (error: any): void,
    onFile (
      name: string,
      options: Partial<FileValidationOptions & { deferValidations: boolean }>,
      callback: PartHandler,
    ): this,
    process (config?: Partial<{ limit: string | number, maxFields: number }>): Promise<void>,
  }

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
    size: string | number,
    extnames: string[],
  }

  /**
   * Error shape for file upload errors
   */
  export type FileUploadError = {
    fieldName: string,
    clientName: string,
    message: string,
    type: 'size' | 'extname' | 'fatal',
  }

  /**
   * Shape of file.toJSON return value
   */
  export type FileJSON = {
    fieldName: string,
    clientName: string,
    size: number,
    filePath?: string,
    type?: string,
    extname?: string,
    subtype?: string,
    state: 'idle' | 'streaming' | 'consumed' | 'moved',
    isValid: boolean,
    validated: boolean,
  }

  /**
   * Multipart file interface
   */
  export interface MultipartFileContract {
    isMultipartFile: true,
    fieldName: string,
    clientName: string,
    size: number,
    headers: { [key: string]: string },
    tmpPath?: string,
    filePath?: string,
    fileName?: string,
    type?: string,
    extname?: string,
    subtype?: string,
    state: 'idle' | 'streaming' | 'consumed' | 'moved',
    isValid: boolean,
    hasErrors: boolean,
    validated: boolean,
    errors: FileUploadError[],
    sizeLimit?: number | string
    allowedExtensions?: string[]

    /**
     * Run validations on the file
     */
    validate (): void

    /**
     * Move file from temporary path to a different location. Self consumed
     * streams cannot be moved unless `tmpPath` is defined explicitly.
     */
    move (location: string, options?: { name?: string, overwrite?: boolean }): Promise<void>

    /**
     * Get JSON representation of file
     */
    toJSON (): FileJSON
  }
}
