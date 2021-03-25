/*
 * @adonisjs/bodyparser
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * Extending the `request` interface on the core module
 */
declare module '@ioc:Adonis/Core/Request' {
  import {
    MultipartContract,
    FileValidationOptions,
    MultipartFileContract,
  } from '@ioc:Adonis/Core/BodyParser'

  interface RequestContract {
    file(key: string, options?: Partial<FileValidationOptions>): MultipartFileContract | null
    files(key: string, options?: Partial<FileValidationOptions>): MultipartFileContract[]
    allFiles(): { [field: string]: MultipartFileContract | MultipartFileContract[] }
    multipart: MultipartContract
  }
}
