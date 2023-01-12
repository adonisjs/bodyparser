/*
 * @adonisjs/bodyparser
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { extname } from 'node:path'
import mediaTyper from 'media-typer'
import { fileTypeFromBuffer, supportedExtensions } from 'file-type'

/**
 * We can detect file types for these files using the magic
 * number
 */
export const supportMagicFileTypes = supportedExtensions

/**
 * Attempts to parse the file mime type using the file magic number
 */
function parseMimeType(mime: string): { type: string; subtype: string } | null {
  try {
    const { type, subtype } = mediaTyper.parse(mime)
    return { type, subtype }
  } catch (error) {
    return null
  }
}

/**
 * Returns the file `type`, `subtype` and `extension`.
 */
export async function getFileType(
  fileContents: Buffer
): Promise<null | { ext: string; type?: string; subtype?: string }> {
  /**
   * Attempt to detect file type from it's content
   */
  const magicType = await fileTypeFromBuffer(fileContents)
  if (magicType) {
    return Object.assign({ ext: magicType.ext }, parseMimeType(magicType.mime))
  }

  return null
}

/**
 * Computes file name from the file type
 */
export function computeFileTypeFromName(
  clientName: string,
  headers: { [key: string]: string }
): { ext: string; type?: string; subtype?: string } {
  /**
   * Otherwise fallback to file extension from it's client name
   * and pull type/subtype from the headers content type.
   */
  return Object.assign(
    { ext: extname(clientName).replace(/^\./, '') },
    parseMimeType(headers['content-type'])
  )
}
