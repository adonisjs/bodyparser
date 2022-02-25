/*
 * @adonisjs/bodyparser
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { join } from 'path'
import { Filesystem } from '@poppinss/dev-utils'
import { createReadStream, pathExists } from 'fs-extra'

import { streamFile } from '../src/Multipart/streamFile'

const fs = new Filesystem(join(__dirname, 'app'))
const SAMPLE_FILE = join(fs.basePath, 'hello-out.txt')
const MAIN_FILE = join(fs.basePath, 'hello-in.txt')

test.group('streamFile', (group) => {
  group.each.teardown(async () => {
    await fs.cleanup().catch(() => {})
  })

  test('write readable stream to the destination', async ({ assert }) => {
    await fs.add(MAIN_FILE, 'hello')

    const file = createReadStream(MAIN_FILE)
    await streamFile(file, SAMPLE_FILE)

    const hasFile = await pathExists(SAMPLE_FILE)
    assert.isTrue(hasFile)
  })

  test('raise error when stream gets interuppted', async ({ assert }) => {
    assert.plan(1)

    await fs.add(MAIN_FILE, 'hello\nhi\nhow are you')

    const file = createReadStream(MAIN_FILE)
    file.on('readable', () => {
      setTimeout(() => {
        if (!file.destroyed) {
          file.emit('error', 'blowup')
        }
      }, 0)
    })

    try {
      await streamFile(file, SAMPLE_FILE)
    } catch (error) {
      assert.equal(error, 'blowup')
    }
  }).retry(3)
})
