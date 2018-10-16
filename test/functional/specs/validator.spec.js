/*
 * adonis-bodyparser
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const test = require('japa')
const supertest = require('supertest')
const { ioc } = require('@adonisjs/fold')
const { join } = require('path')
const PORT = 3000
const URL = `http://localhost:${PORT}`

const setup = require('../setup')

test.group('Validator', (group) => {
  group.before(async () => {
    await setup.up(3000)
  })

  group.after(async () => {
    await setup.down()
  })

  test('return error when file isn\'t uploaded', async (assert) => {
    class Validator {
      get rules () {
        return {
          avatar: 'file'
        }
      }
    }

    ioc.bind('App/Validators/Sample', function () {
      return new Validator()
    })

    const { body } = await supertest(URL).post('/')
    assert.deepEqual(body, [{
      message: 'file validation failed on avatar',
      field: 'avatar',
      validation: 'file'
    }])
  })

  test('validate file extensions', async (assert) => {
    class Validator {
      get rules () {
        return {
          avatar: 'file|file_ext:png,gif'
        }
      }
    }

    ioc.bind('App/Validators/Sample', function () {
      return new Validator()
    })

    const { body } = await supertest(URL)
      .post('/')
      .attach('avatar', join(__dirname, '../../../package.json'))

    assert.deepEqual(body, [{
      message: 'Invalid file extension json. Only png, gif are allowed',
      field: 'avatar',
      validation: 'fileExt'
    }])
  })

  test('validate file size', async (assert) => {
    class Validator {
      get rules () {
        return {
          avatar: 'file|file_ext:json|file_size:1byte'
        }
      }
    }

    ioc.bind('App/Validators/Sample', function () {
      return new Validator()
    })

    const { body } = await supertest(URL)
      .post('/')
      .attach('avatar', join(__dirname, '../../../package.json'))

    assert.deepEqual(body, [{
      message: 'File size should be less than 1B',
      field: 'avatar',
      validation: 'fileSize'
    }])
  })

  test('validate file type', async (assert) => {
    class Validator {
      get rules () {
        return {
          avatar: 'file|file_types:image'
        }
      }
    }

    ioc.bind('App/Validators/Sample', function () {
      return new Validator()
    })

    const { body } = await supertest(URL)
      .post('/')
      .attach('avatar', join(__dirname, '../../../package.json'))

    assert.deepEqual(body, [{
      message: 'Invalid file type json or application. Only image is allowed',
      field: 'avatar',
      validation: 'fileTypes'
    }])
  })

  test('validate an array of files', async (assert) => {
    class Validator {
      get rules () {
        return {
          'avatar.*': 'file|file_types:image'
        }
      }

      get validateAll () {
        return true
      }
    }

    ioc.bind('App/Validators/Sample', function () {
      return new Validator()
    })

    const { body } = await supertest(URL)
      .post('/')
      .attach('avatar', join(__dirname, '../../../package.json'))
      .attach('avatar', join(__dirname, '../../../package.json'))

    assert.deepEqual(body, [
      {
        message: 'Invalid file type json or application. Only image is allowed',
        field: 'avatar.0',
        validation: 'fileTypes'
      },
      {
        message: 'Invalid file type json or application. Only image is allowed',
        field: 'avatar.1',
        validation: 'fileTypes'
      }
    ])
  })
})
