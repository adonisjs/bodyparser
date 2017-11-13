'use strict'

/*
 * adonis-bodyparser
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const path = require('path')
const test = require('japa')
const http = require('http')
const supertest = require('supertest')
const Multipart = require('../../src/Multipart')
const fs = require('fs-extra')
const sleep = function (time) {
  return new Promise((resolve) => {
    setTimeout(resolve, time)
  })
}

const exists = async function (location) {
  const fileExists = await fs.exists(location)
  if (!fileExists) {
    throw new Error('File does not exists')
  }
}

const notExists = async function (location) {
  const fileExists = await fs.exists(location)
  if (fileExists) {
    throw new Error('File exists')
  }
}

test.grep('@latest')

test.group('Multipart', () => {
  test('do not process files unless instructed', async (assert) => {
    const server = http.createServer((req, res) => {
      const multipart = new Multipart({ request: req })
      multipart
        .process()
        .then(() => {
          assert.deepEqual(multipart.jar._files, [])
          res.end()
        }).catch((error) => {
          console.log(error)
          res.writeHead(500)
          res.end()
        })
    })
    await supertest(server).get('/').attach('package', path.join(__dirname, '../../package.json')).expect(200)
  })

  test('process only selected files', async (assert) => {
    const server = http.createServer((req, res) => {
      const multipart = new Multipart({ request: req })
      multipart.file('package', {}, async () => {
      })

      multipart
        .process()
        .then(() => {
          assert.lengthOf(multipart.jar._files, 1)
          assert.equal(multipart.jar._files[0].stream.name, 'package')
          res.end()
        }).catch((error) => {
          console.log(error)
          res.writeHead(500)
          res.end()
        })
    })
    await supertest(server)
      .get('/')
      .attach('package', path.join(__dirname, '../../package.json'))
      .attach('package1', path.join(__dirname, '../../package.json'))
      .expect(200)
  })

  test('pass file instance to the file handler', async (assert) => {
    assert.plan(1)
    const server = http.createServer((req, res) => {
      const multipart = new Multipart({ request: req })
      multipart.file('package', {}, async (file) => {
        assert.equal(file.stream.name, 'package')
      })

      multipart
        .process()
        .then(() => {
          res.end()
        }).catch((error) => {
          console.log(error)
          res.writeHead(500)
          res.end()
        })
    })
    await supertest(server)
      .get('/')
      .attach('package', path.join(__dirname, '../../package.json'))
      .attach('package1', path.join(__dirname, '../../package.json'))
      .expect(200)
  })

  test('process all files when there is a wildcard handler', async (assert) => {
    assert.plan(3)
    const server = http.createServer((req, res) => {
      const multipart = new Multipart({ request: req })
      multipart.file('*', {}, async (file) => {
      })

      multipart
        .process()
        .then(() => {
          assert.lengthOf(multipart.jar._files, 2)
          assert.equal(multipart.jar._files[0].stream.name, 'package')
          assert.equal(multipart.jar._files[1].stream.name, 'package1')
          res.end()
        }).catch((error) => {
          console.log(error)
          res.writeHead(500)
          res.end()
        })
    })
    await supertest(server)
      .get('/')
      .attach('package', path.join(__dirname, '../../package.json'))
      .attach('package1', path.join(__dirname, '../../package.json'))
      .expect(200)
  })

  test('move file to tmp directory', async (assert) => {
    const server = http.createServer((req, res) => {
      const multipart = new Multipart({ request: req })
      multipart.file('*', {}, async (file) => {
        await file.moveToTmp()
      })

      multipart
        .process()
        .then(() => {
          assert.isTrue(multipart.jar._files[0].ended)
          assert.isAbove(multipart.jar._files[0].size, 0)
          return exists(multipart.jar._files[0]._tmpPath)
        }).then((s) => {
          res.end()
        }).catch((error) => {
          console.log(error)
          res.writeHead(500)
          res.end()
        })
    })
    await supertest(server)
      .get('/')
      .attach('package', path.join(__dirname, '../../package.json'))
      .expect(200)
  }).timeout(0)

  test('throw exception when try to move file multiple times to the tmp directory', async (assert) => {
    const server = http.createServer((req, res) => {
      const multipart = new Multipart({ request: req })
      multipart.file('*', {}, async (file) => {
        await file.moveToTmp()
      })

      multipart
        .process()
        .then(() => {
          return multipart.jar._files[0].moveToTmp()
        }).then((s) => {
          res.end()
        }).catch((error) => {
          res.writeHead(500)
          res.write(error.message)
          res.end()
        })
    })
    const { text } = await supertest(server)
      .get('/')
      .attach('package', path.join(__dirname, '../../package.json'))
      .expect(500)

    assert.equal(text, 'E_CANNOT_MOVE: Cannot move file package for multiple times')
  }).timeout(0)

  test('throw error when processing files for multiple times', async (assert) => {
    const server = http.createServer((req, res) => {
      const multipart = new Multipart({ request: req })
      multipart.file('*', {}, async (file) => {})

      multipart
        .process()
        .then(() => {
          return multipart.process()
        }).then(() => {
          res.end()
        }).catch((error) => {
          res.writeHead(500)
          res.write(error.message)
          res.end()
        })
    })
    const res = await supertest(server)
      .get('/')
      .attach('package', path.join(__dirname, '../../package.json'))
      .expect(500)

    assert.equal(res.text, 'E_CANNOT_PROCESS_STREAM: Cannot process multipart stream twice. Make sure to disable files {autoProcess} when manually calling multipart.process')
  }).timeout(0)

  test('move file from tmp directory', async (assert) => {
    const server = http.createServer((req, res) => {
      const multipart = new Multipart({ request: req })
      multipart.file('*', {}, async (file) => {
        await file.moveToTmp()
      })

      multipart
        .process()
        .then(() => {
          return multipart.jar._files[0].move(path.join(__dirname, './'))
        }).then(() => {
          return exists(path.join(__dirname, './package.json'))
        }).then(() => {
          return fs.remove(path.join(__dirname, './package.json'))
        }).then(() => {
          res.end()
        }).catch((error) => {
          console.log(error)
          res.writeHead(500)
          res.write(error.message)
          res.end()
        })
    })

    await supertest(server)
      .get('/')
      .attach('package', path.join(__dirname, '../../package.json'))
      .expect(200)
  }).timeout(0)

  test('move file from tmp directory with different name', async (assert) => {
    const server = http.createServer((req, res) => {
      const multipart = new Multipart({ request: req })
      multipart.file('*', {}, async (file) => {
        await file.moveToTmp()
      })

      multipart
        .process()
        .then(() => {
          return multipart.jar._files[0].move(path.join(__dirname, './'), {
            name: 'foo.json'
          })
        }).then(() => {
          return exists(path.join(__dirname, './foo.json'))
        }).then(() => {
          return fs.remove(path.join(__dirname, './foo.json'))
        }).then(() => {
          res.end()
        }).catch((error) => {
          console.log(error)
          res.writeHead(500)
          res.write(error.message)
          res.end()
        })
    })

    await supertest(server)
      .get('/')
      .attach('package', path.join(__dirname, '../../package.json'))
      .expect(200)
  }).timeout(0)

  test('throw exception when tmp file does not exists', async (assert) => {
    const server = http.createServer((req, res) => {
      const multipart = new Multipart({ request: req })
      multipart.file('*', {}, async () => {})

      multipart
        .process()
        .then(() => {
          return multipart.jar._files[0].move(path.join(__dirname, './'), {
            name: 'foo.json'
          })
        }).then(() => {
          res.end()
        }).catch((error) => {
          res.writeHead(500)
          res.write(error.message)
          res.end()
        })
    })

    const { text } = await supertest(server)
      .get('/')
      .attach('package', path.join(__dirname, '../../package.json'))
      .expect(500)

    assert.equal(text, 'E_CANNOT_MOVE: Cannot move file package since there is no tmp file and stream is already consumed')
  }).timeout(0)

  test('validate file size before moving', async (assert) => {
    const server = http.createServer((req, res) => {
      const multipart = new Multipart({ request: req })
      multipart.file('*', {
        size: '10B'
      }, async (file) => {
        await file.moveToTmp()
      })

      multipart
        .process()
        .then(() => {
          return multipart.jar._files[0].move(path.join(__dirname, './'), {
            name: 'foo.json'
          })
        }).then(() => {
          res.writeHead(200, { 'content-type': 'application/json' })
          res.write(JSON.stringify(multipart.jar._files[0].error()))
          res.end()
        }).catch((error) => {
          console.log(error)
          res.writeHead(500)
          res.write(error.message)
          res.end()
        })
    })

    const { body } = await supertest(server)
      .get('/')
      .attach('package', path.join(__dirname, '../../package.json'))
      .expect(200)

    assert.deepEqual(body, {
      clientName: 'package.json',
      fieldName: 'package',
      type: 'size',
      message: 'File size should be less than 10B'
    })
  }).timeout(0)

  test('validate file extensions before moving', async (assert) => {
    const server = http.createServer((req, res) => {
      const multipart = new Multipart({ request: req })
      multipart.file('*', {
        types: ['jpg', 'png']
      }, async (file) => {
        await file.moveToTmp()
      })

      multipart
        .process()
        .then(() => {
          return multipart.jar._files[0].move(path.join(__dirname, './'), {
            name: 'foo.json'
          })
        }).then(() => {
          res.writeHead(200, { 'content-type': 'application/json' })
          res.write(JSON.stringify(multipart.jar._files[0].error()))
          res.end()
        }).catch((error) => {
          console.log(error)
          res.writeHead(500)
          res.write(error.message)
          res.end()
        })
    })

    const { body } = await supertest(server)
      .get('/')
      .attach('package', path.join(__dirname, '../../package.json'))
      .expect(200)

    assert.deepEqual(body, {
      clientName: 'package.json',
      fieldName: 'package',
      type: 'type',
      message: 'Invalid file type json or application. Only jpg, png are allowed'
    })
  }).timeout(0)

  test('add custom validate fn', async (assert) => {
    const server = http.createServer((req, res) => {
      const multipart = new Multipart({ request: req })
      multipart.file('*', {
        size: '10B'
      }, async (file) => {
        file.validate(function () {
          if (this.size > this.validationOptions.size) {
            this.setError('Max size execedded', 'size')
          }
        })
        await file.moveToTmp()
      })

      multipart
        .process()
        .then(() => {
          return multipart.jar._files[0].move(path.join(__dirname, './'), {
            name: 'foo.json'
          })
        }).then(() => {
          res.writeHead(200, { 'content-type': 'application/json' })
          res.write(JSON.stringify(multipart.jar._files[0].error()))
          res.end()
        }).catch((error) => {
          console.log(error)
          res.writeHead(500)
          res.write(error.message)
          res.end()
        })
    })

    const { body } = await supertest(server)
      .get('/')
      .attach('package', path.join(__dirname, '../../package.json'))
      .expect(200)

    assert.deepEqual(body, {
      clientName: 'package.json',
      fieldName: 'package',
      type: 'size',
      message: 'Max size execedded'
    })
  }).timeout(0)

  test('set validation options at a later stage', async (assert) => {
    const server = http.createServer((req, res) => {
      const multipart = new Multipart({ request: req })
      multipart.file('*', {}, async (file) => {
        file.setOptions({ size: '10B' })
        await file.moveToTmp()
      })

      multipart
        .process()
        .then(() => {
          return multipart.jar._files[0].move(path.join(__dirname, './'), {
            name: 'foo.json'
          })
        }).then(() => {
          res.writeHead(200, { 'content-type': 'application/json' })
          res.write(JSON.stringify(multipart.jar._files[0].error()))
          res.end()
        }).catch((error) => {
          console.log(error)
          res.writeHead(500)
          res.write(error.message)
          res.end()
        })
    })

    const { body } = await supertest(server)
      .get('/')
      .attach('package', path.join(__dirname, '../../package.json'))
      .expect(200)

    assert.deepEqual(body, {
      clientName: 'package.json',
      fieldName: 'package',
      type: 'size',
      message: 'File size should be less than 10B'
    })
  }).timeout(0)

  test('move file if validation passes', async (assert) => {
    const server = http.createServer((req, res) => {
      const multipart = new Multipart({ request: req })
      multipart.file('*', {
        maxSize: '2mb',
        allowedExtensions: ['json']
      }, async (file) => {
        await file.moveToTmp()
      })

      multipart
        .process()
        .then(() => {
          return multipart.jar._files[0].move(path.join(__dirname, './'), {
            name: 'foo.json'
          })
        }).then(() => {
          return exists(path.join(__dirname, './foo.json'))
        }).then(() => {
          return fs.remove(path.join(__dirname, './foo.json'))
        }).then(() => {
          res.end()
        }).catch((error) => {
          console.log(error)
          res.writeHead(500)
          res.write(error.message)
          res.end()
        })
    })

    await supertest(server)
      .get('/')
      .attach('package', path.join(__dirname, '../../package.json'))
      .expect(200)
  }).timeout(0)

  test('move file directly without moving it to tmp folder', async (assert) => {
    const server = http.createServer((req, res) => {
      const multipart = new Multipart({ request: req })
      multipart.file('*', {
        maxSize: '2mb',
        allowedExtensions: ['json']
      }, async (file) => {
        await file.move(path.join(__dirname), { name: 'foo.json' })
      })

      multipart
        .process()
        .then(() => {
          return exists(path.join(__dirname, './foo.json'))
        }).then(() => {
          return fs.remove(path.join(__dirname, './foo.json'))
        }).then(() => {
          res.end()
        }).catch((error) => {
          console.log(error)
          res.writeHead(500)
          res.write(error.message)
          res.end()
        })
    })

    await supertest(server)
      .get('/')
      .attach('package', path.join(__dirname, '../../package.json'))
      .expect(200)
  }).timeout(0)

  test('limit file size when moving directly', async (assert) => {
    const server = http.createServer((req, res) => {
      const multipart = new Multipart({ request: req })
      multipart.file('*', {
        size: '10B',
        types: ['json']
      }, async (file) => {
        await file.move(path.join(__dirname), { name: 'foo.json' })
      })

      multipart
        .process()
        .then(() => {
          return notExists(path.join(__dirname, './foo.json'))
        })
        .then(() => {
          res.writeHead(200, { 'content-type': 'application/json' })
          res.write(JSON.stringify(multipart.jar._files[0].error()))
          res.end()
        }).catch((error) => {
          console.log(error)
          res.writeHead(500)
          res.write(error.message)
          res.end()
        })
    })

    const { body } = await supertest(server)
      .get('/')
      .attach('package', path.join(__dirname, '../../package.json'))
      .expect(200)

    assert.deepEqual(body, {
      clientName: 'package.json',
      fieldName: 'package',
      type: 'size',
      message: 'File size should be less than 10B'
    })
  }).timeout(0)

  test('limit file extensions when moving directly', async (assert) => {
    const server = http.createServer((req, res) => {
      const multipart = new Multipart({ request: req })
      multipart.file('*', {
        size: '10MB',
        types: ['jpg']
      }, async (file) => {
        await file.move(path.join(__dirname), { name: 'foo.json' })
      })

      multipart
        .process()
        .then(() => {
          return notExists(path.join(__dirname, './foo.json'))
        })
        .then(() => {
          res.writeHead(200, { 'content-type': 'application/json' })
          res.write(JSON.stringify(multipart.jar._files[0].error()))
          res.end()
        }).catch((error) => {
          console.log(error)
          res.writeHead(500)
          res.write(error.message)
          res.end()
        })
    })

    const { body } = await supertest(server)
      .get('/')
      .attach('package', path.join(__dirname, '../../package.json'))
      .expect(200)

    assert.deepEqual(body, {
      clientName: 'package.json',
      fieldName: 'package',
      type: 'type',
      message: 'Invalid file type json or application. Only jpg is allowed'
    })
  }).timeout(0)

  test('return false from movedAll when any of the file failed from moving', async (assert) => {
    const server = http.createServer((req, res) => {
      const multipart = new Multipart({ request: req })
      multipart.file('*', {
        size: '2mb',
        types: ['json']
      }, async (file) => {
        await file.move(path.join(__dirname))
      })

      multipart
        .process()
        .then(() => {
          return exists(path.join(__dirname, './package.json'))
        })
        .then(() => {
          return fs.remove(path.join(__dirname, './package.json'))
        })
        .then(() => {
          res.writeHead(200)
          res.write(String(multipart.jar.movedAll()))
          res.end()
        }).catch((error) => {
          console.log(error)
          res.writeHead(500)
          res.write(error.message)
          res.end()
        })
    })

    const { text } = await supertest(server)
      .get('/')
      .attach('package', path.join(__dirname, '../../package.json'))
      .attach('license', path.join(__dirname, '../../LICENSE.txt'))
      .expect(200)
    assert.equal(text, 'false')
  }).timeout(0)

  test('return true from movedAll when all of the files have been moved', async (assert) => {
    const server = http.createServer((req, res) => {
      const multipart = new Multipart({ request: req })
      multipart.file('*', {
        maxSize: '2mb',
        allowedExtensions: ['json', 'text']
      }, async (file) => {
        await file.move(path.join(__dirname))
      })

      multipart
        .process()
        .then(() => {
          return Promise.all([
            exists(path.join(__dirname, './package.json')),
            exists(path.join(__dirname, './LICENSE.txt'))
          ])
        })
        .then(() => {
          return Promise.all([
            fs.remove(path.join(__dirname, './package.json')),
            fs.remove(path.join(__dirname, './LICENSE.txt'))
          ])
        })
        .then(() => {
          res.writeHead(200)
          res.write(String(multipart.jar.movedAll()))
          res.end()
        }).catch((error) => {
          console.log(error)
          res.writeHead(500)
          res.write(error.message)
          res.end()
        })
    })

    const { text } = await supertest(server)
      .get('/')
      .attach('package', path.join(__dirname, '../../package.json'))
      .attach('license', path.join(__dirname, '../../LICENSE.txt'))
      .expect(200)
    assert.equal(text, 'true')
  }).timeout(0)

  test('return an array of files sucessfully moved', async (assert) => {
    const server = http.createServer((req, res) => {
      const multipart = new Multipart({ request: req })
      multipart.file('*', {
        size: '2mb',
        types: ['json']
      }, async (file) => {
        await file.move(path.join(__dirname))
      })

      multipart
        .process()
        .then(() => {
          return exists(path.join(__dirname, './package.json'))
        })
        .then(() => {
          return fs.remove(path.join(__dirname, './package.json'))
        })
        .then(() => {
          res.writeHead(200, { 'content-type': 'application/json' })
          res.write(JSON.stringify(multipart.jar.movedList()))
          res.end()
        }).catch((error) => {
          console.log(error)
          res.writeHead(500)
          res.write(error.message)
          res.end()
        })
    })

    const { body } = await supertest(server)
      .get('/')
      .attach('package', path.join(__dirname, '../../package.json'))
      .attach('license', path.join(__dirname, '../../LICENSE.txt'))
      .expect(200)

    assert.lengthOf(body, 1)
    assert.equal(body[0].fieldName, 'package')
    assert.equal(body[0].fileName, 'package.json')
    assert.isAbove(body[0].size, 0)
    assert.deepEqual(body[0].error, {})
  }).timeout(0)

  test('return all files', async (assert) => {
    const server = http.createServer((req, res) => {
      const multipart = new Multipart({ request: req })
      multipart.file('*', {
        size: '2mb',
        types: ['json']
      }, async (file) => {
        await file.move(path.join(__dirname))
      })

      multipart
        .process()
        .then(() => {
          return exists(path.join(__dirname, './package.json'))
        })
        .then(() => {
          return fs.remove(path.join(__dirname, './package.json'))
        })
        .then(() => {
          res.writeHead(200, { 'content-type': 'application/json' })
          res.write(JSON.stringify(multipart.jar.all()))
          res.end()
        }).catch((error) => {
          console.log(error)
          res.writeHead(500)
          res.write(error.message)
          res.end()
        })
    })

    const { body } = await supertest(server)
      .get('/')
      .attach('package', path.join(__dirname, '../../package.json'))
      .attach('license', path.join(__dirname, '../../LICENSE.txt'))
      .expect(200)

    assert.lengthOf(body, 2)
    assert.equal(body[0].fieldName, 'package')
    assert.equal(body[0].clientName, 'package.json')
    assert.equal(body[0].fileName, 'package.json')
    assert.equal(body[0].status, 'moved')
    assert.isAbove(body[0].size, 0)
    assert.deepEqual(body[0].error, {})

    assert.equal(body[1].fieldName, 'license')
    assert.equal(body[1].clientName, 'LICENSE.txt')
    assert.isNull(body[1].fileName)
    assert.equal(body[1].status, 'error')
    assert.equal(body[1].size, 0)
    assert.equal(body[1].error.type, 'type')
  }).timeout(0)

  test('return an array of errors', async (assert) => {
    const server = http.createServer((req, res) => {
      const multipart = new Multipart({ request: req })
      multipart.file('*', {
        size: '2mb',
        types: ['json']
      }, async (file) => {
        await file.move(path.join(__dirname))
      })

      multipart
        .process()
        .then(() => {
          return exists(path.join(__dirname, './package.json'))
        })
        .then(() => {
          return fs.remove(path.join(__dirname, './package.json'))
        })
        .then(() => {
          res.writeHead(200, { 'content-type': 'application/json' })
          res.write(JSON.stringify(multipart.jar.errors()))
          res.end()
        }).catch((error) => {
          console.log(error)
          res.writeHead(500)
          res.write(error.message)
          res.end()
        })
    })

    const { body } = await supertest(server)
      .get('/')
      .attach('package', path.join(__dirname, '../../package.json'))
      .attach('license', path.join(__dirname, '../../LICENSE.txt'))
      .expect(200)

    assert.deepEqual(body, [{
      clientName: 'LICENSE.txt',
      fieldName: 'license',
      type: 'type',
      message: 'Invalid file type plain or text. Only json is allowed'
    }])
  }).timeout(0)

  test('throw exception when no callback is passed to multipart.file', async (assert) => {
    const multipart = new Multipart({ request: {} })
    const fn = () => multipart.file('*')
    assert.throw(fn, 'E_INVALID_PARAMETER: multipart.file expects callback to be a function')
  })

  test('throw exception when multiple.file callback throws error', async (assert) => {
    const server = http.createServer((req, res) => {
      const multipart = new Multipart({ request: req })
      multipart.file('*', {}, async (file) => {
        throw new Error('Something bad happened')
      })

      multipart
        .process()
        .then(() => {
          res.end()
        }).catch((error) => {
          setTimeout(() => {
            res.writeHead(500)
            res.write(error.message)
            res.end()
          }, 10)
        })
    })

    const { text } = await supertest(server)
      .get('/')
      .attach('package', path.join(__dirname, '../../package.json'))
      .attach('license', path.join(__dirname, '../../LICENSE.txt'))
      .expect(500)

    assert.equal(text, 'Something bad happened')
  })

  test('throw exception when no callback is passed to file.validate', async (assert) => {
    const server = http.createServer((req, res) => {
      const multipart = new Multipart({ request: req })
      multipart.file('*', {}, async (file) => {
        file.validate()
      })

      multipart
        .process()
        .then(() => {
          res.end()
        }).catch((error) => {
          setTimeout(() => {
            res.writeHead(500)
            res.write(error.message)
            res.end()
          })
        })
    })

    const { text } = await supertest(server)
      .get('/')
      .attach('package', path.join(__dirname, '../../package.json'))
      .attach('license', path.join(__dirname, '../../LICENSE.txt'))
      .expect(500)

    assert.equal(text, 'E_INVALID_PARAMETER: file.validate expects a function')
  })

  test('reading stream as buffer should end the stream', async (assert) => {
    const server = http.createServer((req, res) => {
      const multipart = new Multipart({ request: req })
      multipart.file('*', {}, async (file) => {
        await file.read()
      })

      multipart
        .process()
        .then(() => {
          res.writeHead(200)
          res.write(String(multipart.jar._files[0].ended))
          res.end()
        }).catch((error) => {
          res.writeHead(500)
          res.write(error.message)
          res.end()
        })
    })

    const { text } = await supertest(server)
      .get('/')
      .attach('package', path.join(__dirname, '../../package.json'))
      .attach('license', path.join(__dirname, '../../LICENSE.txt'))
      .expect(200)

    assert.equal(text, 'true')
  })

  test('wait for file handler to finish before ending the request', async (assert) => {
    const server = http.createServer((req, res) => {
      const multipart = new Multipart({ request: req })
      let ended = false
      multipart.file('*', {}, async (file) => {
        await file.read()
        await sleep(10)
        ended = true
      })

      multipart
        .process()
        .then(() => {
          res.writeHead(200)
          res.write(String(ended))
          res.end()
        }).catch((error) => {
          res.writeHead(500)
          res.write(error.message)
          res.end()
        })
    })

    const { text } = await supertest(server)
      .get('/')
      .attach('package', path.join(__dirname, '../../package.json'))
      .expect(200)

    assert.equal(text, 'true')
  })

  test('access all file properties before moving the file @latest', async (assert) => {
    assert.plan(9)

    const server = http.createServer((req, res) => {
      const multipart = new Multipart({ request: req })
      multipart.file('package', {}, function (file) {
        assert.equal(file.clientName, 'package.json')
        assert.isNull(file.fileName)
        assert.equal(file.fieldName, 'package')
        assert.isNull(file.tmpPath)
        assert.deepEqual(file.headers, {
          'content-disposition': 'form-data; name="package"; filename="package.json"',
          'content-type': 'application/json'
        })
        assert.equal(file.size, 0)
        assert.equal(file.type, 'application')
        assert.equal(file.subtype, 'json')
        assert.equal(file.status, 'pending')
      })

      multipart
        .process()
        .then(() => {
          res.writeHead(200)
          res.end()
        }).catch((error) => {
          console.log(error)
          res.writeHead(500)
          res.write(error.message)
          res.end()
        })
    })

    await supertest(server)
      .get('/')
      .attach('package', path.join(__dirname, '../../package.json'))
  })

  test('access all file properties after moveToTmp @latest', async (assert) => {
    assert.plan(10)

    const server = http.createServer((req, res) => {
      const multipart = new Multipart({ request: req })
      multipart.file('package', {}, async function (file) {
        await file.moveToTmp()

        assert.equal(file.clientName, 'package.json')
        assert.isNull(file.fileName)
        assert.equal(file.fieldName, 'package')
        assert.isDefined(file.tmpPath)
        assert.isTrue(file.tmpPath.endsWith('.tmp'))

        assert.deepEqual(file.headers, {
          'content-disposition': 'form-data; name="package"; filename="package.json"',
          'content-type': 'application/json'
        })
        assert.isAbove(file.size, 0)
        assert.equal(file.type, 'application')
        assert.equal(file.subtype, 'json')
        assert.equal(file.status, 'consumed')
      })

      multipart
        .process()
        .then(() => {
          res.writeHead(200)
          res.end()
        }).catch((error) => {
          res.writeHead(500)
          res.write(error.message)
          res.end()
        })
    })

    await supertest(server)
      .get('/')
      .attach('package', path.join(__dirname, '../../package.json'))
  })

  test('access all file properties after moving the file @latest', async (assert) => {
    assert.plan(10)

    const server = http.createServer((req, res) => {
      const multipart = new Multipart({ request: req })
      multipart.file('package', {}, async function (file) {
        await file.moveToTmp()
        await file.move(path.join(__dirname, './'))

        assert.equal(file.clientName, 'package.json')
        assert.equal(file.fileName, 'package.json')
        assert.equal(file.fieldName, 'package')
        assert.isDefined(file.tmpPath)
        assert.isTrue(file.tmpPath.endsWith('.tmp'))

        assert.deepEqual(file.headers, {
          'content-disposition': 'form-data; name="package"; filename="package.json"',
          'content-type': 'application/json'
        })
        assert.isAbove(file.size, 0)
        assert.equal(file.type, 'application')
        assert.equal(file.subtype, 'json')
        assert.equal(file.status, 'moved')
      })

      multipart
        .process()
        .then(() => {
          return fs.remove(path.join(__dirname, './package.json'))
        })
        .then(() => {
          res.writeHead(200)
          res.end()
        }).catch((error) => {
          console.log(error)
          res.writeHead(500)
          res.write(error.message)
          res.end()
        })
    })

    await supertest(server)
      .get('/')
      .attach('package', path.join(__dirname, '../../package.json'))
  })
})
