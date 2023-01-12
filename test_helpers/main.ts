/*
 * @adonisjs/bodyparser
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import fsExtra from 'fs-extra'
import { fileURLToPath } from 'node:url'

const pkgFileContents = await fsExtra.readFile(new URL('../package.json', import.meta.url))

export const xlsFilePath = fileURLToPath(new URL('../sample.xls', import.meta.url))
export const xlsxFilePath = fileURLToPath(new URL('../sample.xlsx', import.meta.url))
export const packageFilePath = fileURLToPath(new URL('../package.json', import.meta.url))
export const packageFileSize = pkgFileContents.length

export const sleep = (time: number) => new Promise((resolve) => setTimeout(resolve, time))
