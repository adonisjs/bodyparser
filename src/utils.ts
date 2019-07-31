/*
* @adonisjs/bodyparser
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

/// <reference path="../adonis-typings/bodyparser.ts" />

import * as bytes from 'bytes'
import { extname } from 'path'
import * as fileType from 'file-type'
import * as mediaTyper from 'media-typer'
import { FileUploadError } from '@ioc:Adonis/Addons/BodyParser'

/**
 * Returns an error when file size is over the expected
 * bytes.
 */
export function validateSize (
  fieldName: string,
  clientName: string,
  actualBytes: number,
  expectedBytes?: string | number,
): FileUploadError | null {
  if (expectedBytes === undefined) {
    return null
  }

  expectedBytes = typeof (expectedBytes) === 'string'
    ? bytes(expectedBytes)
    : expectedBytes

  if (actualBytes > expectedBytes!) {
    return {
      fieldName,
      clientName,
      message: `File size should be less than ${bytes(expectedBytes)}`,
      type: 'size',
    }
  }

  return null
}

/**
 * Returns an error when file extension isn't one of the allowed file
 * extensions.
 */
export function validateExtension (
  fieldName: string,
  clientName: string,
  extname: string,
  allowedExtensions?: string[],
): FileUploadError | null {
  if (!Array.isArray(allowedExtensions) || allowedExtensions.length === 0) {
    return null
  }

  if (allowedExtensions.includes(extname)) {
    return null
  }

  const suffix = allowedExtensions.length === 1 ? 'is' : 'are'
  const message = [
    `Invalid file extension ${extname}.`,
    `Only ${allowedExtensions.join(', ')} ${suffix} allowed`,
  ].join(' ')

  return {
    fieldName,
    clientName,
    message: message,
    type: 'extname',
  }
}

/**
 * Returns the file `type`, `subtype` and `extension`.
 */
export function getFileType (
  fileContents: Buffer,
  clientName: string,
  headers: { [key: string]: string },
  force: boolean = false,
): null | { ext: string, subtype: string, type: string } {
  /**
   * Attempt to detect file type from it's content
   */
  const magicType = fileType(fileContents)
  if (magicType) {
    return Object.assign(mediaTyper.parse(magicType.mime), {
      ext: magicType.ext,
    })
  }

  /**
   * If we are unable to pull the file magicType and the current
   * bytes of the content is under the minimumBytes required,
   * then we should return `null` and force the consumer
   * to re-call this method after new content
   */
  if (fileContents.length < fileType.minimumBytes && !force) {
    return null
  }

  /**
   * Otherwise fallback to file extension from it's client name
   * and pull type/subtype from the headers content type.
   */
  return Object.assign(mediaTyper.parse(headers['content-type']), {
    ext: extname(clientName).replace(/^\./, ''),
  })
}
