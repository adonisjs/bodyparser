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
import { RuntimeException } from '@poppinss/utils'
import { fileTypeFromBuffer, supportedExtensions } from 'file-type'
import { access, mkdir, copyFile, unlink, rename } from 'node:fs/promises'

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

/**
 * Check if a file already exists
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
 * Move file from source to destination with a fallback to move file across
 * paritions and devices.
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
