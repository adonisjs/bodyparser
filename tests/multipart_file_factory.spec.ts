/*
 * @adonisjs/bodyparser
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { MultipartFile } from '../src/multipart/file.js'
import { MultipartFileFactory } from '../factories/file_factory.js'

test.group('Multipart file factory', () => {
  test('create file instance', ({ assert }) => {
    const file = new MultipartFileFactory().create()
    assert.instanceOf(file, MultipartFile)
    assert.isTrue(file.isValid)
  })

  test('validate file size', ({ assert }) => {
    const file = new MultipartFileFactory().merge({ size: 1024 * 1024 }).create({ size: '1kb' })
    assert.isFalse(file.isValid)

    const file1 = new MultipartFileFactory().merge({ size: 1024 * 1024 }).create({ size: '1mb' })
    assert.isTrue(file1.isValid)
  })

  test('validate file extension', ({ assert }) => {
    const file = new MultipartFileFactory().create({ extnames: ['jpg'] })
    assert.isFalse(file.isValid)

    const file1 = new MultipartFileFactory().merge({ extname: 'jpg' }).create({ extnames: ['jpg'] })
    assert.isTrue(file1.isValid)
  })
})
