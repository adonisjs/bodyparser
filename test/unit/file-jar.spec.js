'use strict'

/*
 * adonis-bodyparser
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const FileJar = require('../../src/Multipart/FileJar')
const test = require('japa')

class FakeFile {
  toJSON () {
    return {
      error: this._error,
      status: this._status
    }
  }
}

test.group('File Jar', () => {
  test('return array of errors for files that were not moved successfully', (assert) => {
    const fakeFile1 = new FakeFile()
    const fakeFile2 = new FakeFile()
    fakeFile1._error = { message: 'some error' }
    const fileJar = new FileJar([fakeFile1, fakeFile2])
    assert.deepEqual(fileJar.errors(), [{ message: 'some error' }])
  })

  test('return array of files moved successfully', (assert) => {
    const fakeFile1 = new FakeFile()
    const fakeFile2 = new FakeFile()
    fakeFile1._status = 'moved'
    const fileJar = new FileJar([fakeFile1, fakeFile2])
    assert.deepEqual(fileJar.movedList(), [fakeFile1.toJSON()])
  })

  test('move all files when calling moveAll', async (assert) => {
    const fakeFile1 = new FakeFile()
    const fakeFile2 = new FakeFile()
    const stack = []

    fakeFile1.move = function () {
      this._status = 'moved'
      stack.push('moved')
    }

    fakeFile2.move = function () {
      this._status = 'moved'
      stack.push('moved')
    }

    const fileJar = new FileJar([fakeFile1, fakeFile2])
    await fileJar.moveAll()
    assert.deepEqual(fileJar.movedList(), [fakeFile1.toJSON(), fakeFile2.toJSON()])
    assert.deepEqual(stack, ['moved', 'moved'])
  })

  test('return true when all files have been made', async (assert) => {
    const fakeFile1 = new FakeFile()
    const fakeFile2 = new FakeFile()

    fakeFile1.move = function () {
      this._status = 'moved'
    }

    fakeFile2.move = function () {
      this._status = 'moved'
    }

    const fileJar = new FileJar([fakeFile1, fakeFile2])
    await fileJar.moveAll()
    assert.isTrue(fileJar.movedAll())
  })

  test('return true when all files have been made', async (assert) => {
    const fakeFile1 = new FakeFile()
    const fakeFile2 = new FakeFile()

    fakeFile1.move = function () {
      this._status = 'moved'
    }

    fakeFile2.move = function () {
      this._status = 'moved'
    }

    const fileJar = new FileJar([fakeFile1, fakeFile2])
    await fileJar.moveAll()
    assert.isTrue(fileJar.movedAll())
  })
})
