/*
 * @adonisjs/bodyparser
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import fs from 'fs-extra'
import { join } from 'node:path'
import { test } from '@japa/runner'
import { fileURLToPath } from 'node:url'

import { streamFile } from '../src/multipart/stream_file.js'
import { retry } from '../test_helpers/main.js'

const BASE_URL = new URL('./tmp/', import.meta.url)
const BASE_PATH = fileURLToPath(BASE_URL)

const SAMPLE_FILE = join(BASE_PATH, 'hello-out.txt')
const MAIN_FILE = join(BASE_PATH, 'hello-in.txt')

test.group('streamFile', (group) => {
  group.each.teardown(async () => {
    await retry(() => fs.remove(BASE_PATH), 3)()
  })

  test('write readable stream to the destination', async ({ assert }) => {
    await fs.outputFile(MAIN_FILE, 'hello')

    const file = fs.createReadStream(MAIN_FILE)
    await streamFile(file, SAMPLE_FILE)

    const hasFile = await fs.pathExists(SAMPLE_FILE)
    assert.isTrue(hasFile)
  })

  test('raise error when stream gets interuppted', async ({ assert }) => {
    assert.plan(1)

    await fs.outputFile(MAIN_FILE, 'hello\nhi\nhow are you')

    const file = fs.createReadStream(MAIN_FILE)
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
  })
})
