/*
* @adonisjs/bodyparser
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

/// <reference path="../adonis-typings/bodyparser.ts" />

import bytes from 'bytes'
import { extname } from 'path'
import fileType from 'file-type'
import mediaTyper from 'media-typer'
import { FileUploadError, DetectedFileType } from '@ioc:Adonis/Addons/BodyParser'

/**
 * Attempts to parse the file mime type using the file magic number
 */
function parseMimeType (mime: string): { type: string, subtype: string } | null {
  try {
    const { type, subtype } = mediaTyper.parse(mime)
    return { type, subtype }
  } catch (error) {
    return null
  }
}

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
  extension: string,
  allowedExtensions?: string[],
): FileUploadError | null {
  if (!Array.isArray(allowedExtensions) || allowedExtensions.length === 0) {
    return null
  }

  if (allowedExtensions.includes(extension)) {
    return null
  }

  const suffix = allowedExtensions.length === 1 ? 'is' : 'are'
  const message = [
    `Invalid file extension ${extension}.`,
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
): null | DetectedFileType {
  /**
   * Attempt to detect file type from it's content
   */
  const magicType = fileType(fileContents)
  if (magicType) {
    return Object.assign({ ext: magicType.ext }, parseMimeType(magicType.mime))
  }

  /**
   * If we are unable to pull the file magicType and the current
   * bytes of the content is under the minimumBytes required,
   * then we should return `null` and force the consumer
   * to re-call this method after receiving more content
   * from the stream
   */
  if (fileContents.length < fileType.minimumBytes && !force) {
    return null
  }

  /**
   * Otherwise fallback to file extension from it's client name
   * and pull type/subtype from the headers content type.
   */
  return Object.assign(
    { ext: extname(clientName).replace(/^\./, '') },
    parseMimeType(headers['content-type']),
  )
}
