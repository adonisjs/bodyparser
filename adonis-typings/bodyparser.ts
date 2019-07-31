/*
* @adonisjs/bodyparser
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

declare module '@ioc:Adonis/Addons/BodyParser' {
  import { Readable } from 'stream'
  import { FileTypeResult } from 'file-type'

  /**
   * Readable stream along with some extra data. This is what
   * is passed to `onFile` handlers.
   */
  export type MultipartStream = Readable & {
    headers: any,
    name: string,
    filename: string,
    bytes: number,
  }

  /**
   * The options that can be used to validate a given
   * file
   */
  export type FileValidationOptions = {
    size: string | number,
    types: string[],
    extnames: string[],
  }

  /**
   * The callback handler for a given file part
   */
  export type PartHandlerContract = (
    part: MultipartStream,
    reportChunk: (chunk: Buffer) => void,
  ) => Promise<({ filePath?: string, tmpPath?: string } & { [key: string]: any }) | void>

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
  export type BodyParserJSONConfigContract = BodyParserBaseConfig & {
    strict: boolean,
  }

  /**
   * Parser config for parsing form data
   */
  export type BodyParserFormConfigContract = BodyParserBaseConfig & {
    queryString: QueryStringConfig,
  }

  /**
   * Parser config for parsing raw body (untouched)
   */
  export type BodyParserRawConfigContract = BodyParserBaseConfig & {
    queryString: QueryStringConfig,
  }

  /**
   * Parser config for parsing multipart requests
   */
  export type BodyParserMultipartConfigContract = BodyParserBaseConfig & {
    autoProcess: boolean,
    maxFields: number,
    processManually: string[],
    tmpFileName? (): string,
  }

  /**
   * Body parser config for all different types
   */
  export type BodyParserConfigContract = {
    whitelistedMethods: string[],
    json: BodyParserJSONConfigContract,
    form: BodyParserFormConfigContract,
    raw: BodyParserRawConfigContract,
    multipart: BodyParserMultipartConfigContract,
  }

  /**
   * Multipart class contract, since it is exposed on the
   * request object, we need the interface to extend
   * typings
   */
  export interface MultipartContract {
    consumed: boolean,
    onFile (
      name: string,
      options: Partial<FileValidationOptions & { deferValidations: boolean }>,
      callback: PartHandlerContract,
    ): this,
    process (config?: Partial<{ limit: string | number, maxFields: number }>): Promise<void>,
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
   * New file constructor options shape
   */
  export type FileInputNode = {
    fieldName: string,
    clientName: string,
    bytes: number,
    headers: {
      [key: string]: string,
    },
    filePath?: string,
    tmpPath?: string,
    meta: any,
    fileType: {
      ext: string,
      type: string,
      subtype: string,
    },
  }

  /**
   * Multipart file interface
   */
  export interface MultipartFileContract {
    fieldName: string,
    clientName: string,
    tmpPath?: string,
    filePath?: string,
    size: number,
    type: string,
    subtype: string,
    isValid: boolean,
    status: 'pending' | 'moved' | 'error',
    extname: string,
    validated: boolean,
    errors: FileUploadError[],
  }
}
