/*
 * @adonisjs/bodyparser
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { Multipart } from './src/multipart/main.js'
import { MultipartFile } from './src/multipart/file.js'
import type { FileValidationOptions } from './src/types.js'

export { defineConfig } from './src/define_config.js'
export { MultipartFile, Multipart }

/**
 * Extending request class with custom properties.
 */
declare module '@adonisjs/http-server' {
  export interface Request {
    multipart: Multipart
    __raw_files: Record<string, MultipartFile | MultipartFile[]>
    allFiles(): Record<string, MultipartFile | MultipartFile[]>
    file(key: string, options?: Partial<FileValidationOptions>): MultipartFile | null
    files(key: string, options?: Partial<FileValidationOptions>): MultipartFile[]
  }
}
