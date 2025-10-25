/*
 * @adonisjs/bodyparser
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { Mode } from 'node:fs'
import mediaTyper from 'media-typer'
import { dirname, extname } from 'node:path'
import { RuntimeException } from '@poppinss/utils/exception'
import { fileTypeFromBuffer, supportedExtensions } from 'file-type'
import { access, mkdir, copyFile, unlink, rename } from 'node:fs/promises'

/**
 * We can detect file types for these files using the magic
 * number
 */
export const supportMagicFileTypes = supportedExtensions

/**
 * Attempts to parse the file MIME type into its type and subtype components.
 * Returns null if the MIME type cannot be parsed.
 *
 * @param mime - The MIME type string to parse (e.g., "image/png")
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
 * Detects the file type, extension, and MIME type/subtype by analyzing
 * the file's magic number (binary signature).
 *
 * @param fileContents - Buffer containing the file contents to analyze
 *
 * @example
 * ```ts
 * const buffer = await fs.readFile('image.png')
 * const fileType = await getFileType(buffer)
 * // { ext: 'png', type: 'image', subtype: 'png' }
 * ```
 */
export async function getFileType(
  fileContents: Buffer
): Promise<null | { ext: string; type?: string; subtype?: string }> {
  /**
   * Attempt to detect file type from it's content
   */
  const magicType = await fileTypeFromBuffer(fileContents)
  if (magicType) {
    return Object.assign({ ext: magicType.ext.toLowerCase() }, parseMimeType(magicType.mime))
  }

  return null
}

/**
 * Computes the file extension and MIME type from the filename and headers
 * when magic number detection is not available or applicable.
 *
 * @param clientName - The original filename provided by the client
 * @param headers - Headers object containing the content-type
 *
 * @example
 * ```ts
 * const fileType = computeFileTypeFromName('document.pdf', {
 *   'content-type': 'application/pdf'
 * })
 * // { ext: 'pdf', type: 'application', subtype: 'pdf' }
 * ```
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
    { ext: extname(clientName).replace(/^\./, '').toLowerCase() },
    parseMimeType(headers['content-type'])
  )
}

/**
 * Checks if a file or directory exists at the specified path.
 *
 * @param filePath - The path to check for existence
 *
 * @example
 * ```ts
 * if (await pathExists('/tmp/upload.jpg')) {
 *   console.log('File exists')
 * }
 * ```
 */
export async function pathExists(filePath: string) {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

/**
 * Moves a file from source to destination, automatically handling cross-device
 * moves by falling back to copy+delete. Creates the destination directory if
 * it doesn't exist.
 *
 * @param sourcePath - The current path of the file
 * @param destinationPath - The target path for the file
 * @param options - Move options including overwrite flag and directory permissions
 *
 * @example
 * ```ts
 * await moveFile('/tmp/upload.jpg', '/app/public/images/photo.jpg', {
 *   overwrite: true
 * })
 * ```
 */
export async function moveFile(
  sourcePath: string,
  destinationPath: string,
  options: { overwrite: boolean; directoryMode?: Mode } = { overwrite: true }
) {
  if (!sourcePath || !destinationPath) {
    throw new RuntimeException('"sourcePath" and "destinationPath" required')
  }

  if (!options.overwrite && (await pathExists(destinationPath))) {
    throw new RuntimeException(`The destination file already exists: "${destinationPath}"`)
  }

  await mkdir(dirname(destinationPath), {
    recursive: true,
    mode: options.directoryMode,
  })

  try {
    await rename(sourcePath, destinationPath)
  } catch (error) {
    if (error.code === 'EXDEV') {
      await copyFile(sourcePath, destinationPath)
      await unlink(sourcePath)
    } else {
      throw error
    }
  }
}

/**
 * Collection of normalizer functions for processing form body values.
 * These functions can trim whitespace and/or convert empty strings to null.
 */
export const formBodyNormalizers = {
  /**
   * Trims leading and trailing whitespace from a string value.
   *
   * @param value - The string to trim
   */
  trimWhitespaces(value: string) {
    return value.trim()
  },
  /**
   * Trims whitespace and converts empty strings to null.
   *
   * @param value - The string to process
   */
  trimWhitespacesAndConvertToNull(value: string) {
    value = value.trim()
    return value === '' ? null : value
  },
  /**
   * Converts empty strings to null without trimming.
   *
   * @param value - The string to process
   */
  convertToNull(value: string) {
    return value === '' ? null : value
  },
}
