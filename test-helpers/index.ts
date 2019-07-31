/*
* @adonisjs/bodyparser
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

import { join } from 'path'

const contents = JSON.stringify(require('../package.json'), null, 2)

export const packageFilePath = join(__dirname, '../package.json')
export const packageFileSize = Buffer.from(contents, 'utf-8').length + 1
export const sleep = (time: number) => new Promise((resolve) => setTimeout(resolve, time))
export const requestConfig = {
  allowMethodSpoofing: false,
  trustProxy: () => true,
  subdomainOffset: 2,
  generateRequestId: false,
}
