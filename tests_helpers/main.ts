/*
 * @adonisjs/bodyparser
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import fsExtra from 'fs-extra'
import { fileURLToPath } from 'node:url'

const pkgFileContents = await fsExtra.readFile(new URL('../package.json', import.meta.url))

export const largePdfFile = fileURLToPath(
  new URL('../resources/sample-pdf-download-10-mb.pdf', import.meta.url)
)
export const xlsFilePath = fileURLToPath(new URL('../resources/sample.xls', import.meta.url))
export const xlsxFilePath = fileURLToPath(new URL('../resources/sample.xlsx', import.meta.url))
export const unicornFilePath = fileURLToPath(new URL('../resources/unicorn.png', import.meta.url))
export const unicornNoExtFilePath = fileURLToPath(
  new URL('../resources/unicorn-wo-ext', import.meta.url)
)
export const packageFilePath = fileURLToPath(new URL('../package.json', import.meta.url))
export const packageFileSize = pkgFileContents.length

export const sleep = (time: number) => new Promise((resolve) => setTimeout(resolve, time))
export const retry = (callback: () => Promise<void>, maxCounts: number) => {
  let counts = 0
  async function run() {
    try {
      await callback()
    } catch (error) {
      counts++
      if (counts === maxCounts) {
        throw error
      }

      await run()
    }
  }

  return run
}
