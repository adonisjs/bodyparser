/*
* @adonisjs/bodyparser
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

/// <reference path="../../adonis-typings/bodyparser.ts" />

import {
  MultipartFileContract,
  FileUploadError,
  FileInputNode,
} from '@ioc:Adonis/Addons/BodyParser'

/**
 * The file holds the meta/data for an uploaded file, along with
 * an errors occurred during the upload process.
 */
export class File implements MultipartFileContract {
  /**
   * Field name is the name of the field
   */
  public fieldName = this._data.fieldName

  /**
   * Client name is the file name on the user client
   */
  public clientName = this._data.clientName

  /**
   * File size in bytes
   */
  public size = this._data.bytes

  /**
   * The extname for the file.
   */
  public extname = this._data.fileType.ext

  /**
   * Upload errors
   */
  public errors: FileUploadError[] = []

  /**
   * Type and subtype are extracted from the `content-type`
   * header or from the file magic number
   */
  public type?: string = this._data.fileType.type
  public subtype?: string = this._data.fileType.subtype

  /**
   * Filename is only set after the move operation
   */
  public filePath?: string = this._data.filePath

  /**
   * Tmp path, only exists when file is uploaded using the
   * classic mode.
   */
  public tmpPath?: string = this._data.tmpPath

  /**
   * The file meta data
   */
  public meta: string = this._data.meta

  /**
   * Whether or not this file has been validated
   */
  public validated: boolean = false

  constructor (private _data: FileInputNode) {
  }

  /**
   * Returns a boolean telling if file is
   * valid or not
   */
  public get isValid (): boolean {
    return this.errors.length === 0
  }

  /**
   * Current status of the file
   */
  public get status (): 'pending' | 'moved' | 'error' {
    return this.errors.length ? 'error' : (this.filePath ? 'moved' : 'pending')
  }
}
