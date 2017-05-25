'use strict'

/*
 * adonis-bodyparser
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const test = require('japa')
const path = require('path')
const Browser = require('zombie')
const { Config } = require('adonis-sink')
const app = require('./app')
const BodyParser = require('../../src/BodyParser')
const supertest = require('supertest')

Browser.localhost('localhost', 4000)

test.group('Body Parser', (group) => {
  group.before(() => {
    app.start()
  })

  test('parse form data', async (assert) => {
    /**
     * Get method to render the form
     */
    app.get = function (req, res) {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.write(`
      <form method='POST' action='/'>
        <input type='text' name='name' />
        <input type='email' name='email' />
        <button type='submit'> Submit </button>
      </form>
      `)
      res.end()
    }

    /**
     * Post method to handle the form submission
     */
    app.post = async function (request, res) {
      const parser = new BodyParser(new Config())
      await parser.handle({ request }, function () {})
      res.writeHead(200, { 'content-type': 'application/json' })
      res.write(JSON.stringify(request._body))
      res.end()
    }

    const browser = new Browser()
    await browser.visit('/')

    await browser
      .fill('name', 'virk')
      .fill('email', 'foo@bar.com')
      .pressButton('Submit')

    assert.deepEqual(JSON.parse(browser.text()), { name: 'virk', email: 'foo@bar.com' })
  })

  test('parse form data with array fields', async (assert) => {
    /**
     * Get method to render the form
     */
    app.get = function (req, res) {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.write(`
      <form method='POST' action='/'>
        <input type='text' name='name[]' id="name1" />
        <input type='email' name='email[]' id="email1" />

        <input type='text' name='name[]' id="name2" />
        <input type='email' name='email[]' id="email2" />
        <button type='submit'> Submit </button>
      </form>
      `)
      res.end()
    }

    /**
     * Post method to handle the form submission
     */
    app.post = async function (request, res) {
      const parser = new BodyParser(new Config())
      await parser.handle({ request }, function () {})
      res.writeHead(200, { 'content-type': 'application/json' })
      res.write(JSON.stringify(request._body))
      res.end()
    }

    const browser = new Browser()
    await browser.visit('/')

    await browser
      .fill('#name1', 'virk')
      .fill('#email1', 'foo@bar.com')
      .fill('#name2', 'nikk')
      .fill('#email2', 'nikk@bar.com')
      .pressButton('Submit')

    assert.deepEqual(JSON.parse(browser.text()), { name: ['virk', 'nikk'], email: ['foo@bar.com', 'nikk@bar.com'] })
  })

  test('do not mess up order when previous fields are empty', async (assert) => {
    /**
     * Get method to render the form
     */
    app.get = function (req, res) {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.write(`
      <form method='POST' action='/'>
        <input type='text' name='name[]' id="name1" />
        <input type='email' name='email[]' id="email1" />

        <input type='text' name='name[]' id="name2" />
        <input type='email' name='email[]' id="email2" />
        <button type='submit'> Submit </button>
      </form>
      `)
      res.end()
    }

    /**
     * Post method to handle the form submission
     */
    app.post = async function (request, res) {
      const parser = new BodyParser(new Config())
      await parser.handle({ request }, function () {})
      res.writeHead(200, { 'content-type': 'application/json' })
      res.write(JSON.stringify(request._body))
      res.end()
    }

    const browser = new Browser()
    await browser.visit('/')

    await browser
      .fill('#name2', 'nikk')
      .fill('#email2', 'nikk@bar.com')
      .pressButton('Submit')

    assert.deepEqual(JSON.parse(browser.text()), { name: ['', 'nikk'], email: ['', 'nikk@bar.com'] })
  })

  test('parse JSON when request has json data', async (assert) => {
    app.post = async function (request, res) {
      const parser = new BodyParser(new Config())
      await parser.handle({ request }, function () {})
      res.writeHead(200, { 'content-type': 'application/json' })
      res.write(JSON.stringify(request._body))
      res.end()
    }
    const { body } = await supertest(app.server).post('/').send({ name: 'virk', isJSON: true })
    assert.deepEqual(body, { name: 'virk', isJSON: true })
  })

  test('process arrays inside json properly', async (assert) => {
    app.post = async function (request, res) {
      const parser = new BodyParser(new Config())
      await parser.handle({ request }, function () {})
      res.writeHead(200, { 'content-type': 'application/json' })
      res.write(JSON.stringify(request._body))
      res.end()
    }
    const { body } = await supertest(app.server).post('/').send({ names: ['virk', 'foo@bar.com'], isJSON: true })
    assert.deepEqual(body, { names: ['virk', 'foo@bar.com'], isJSON: true })
  })

  test('do not parse json when json types are set to an empty array', async (assert) => {
    app.post = async function (request, res) {
      const config = new Config()
      config.set('bodyParser.json.types', [])
      const parser = new BodyParser(config)
      await parser.handle({ request }, function () {})
      res.writeHead(200, { 'content-type': 'application/json' })
      res.write(JSON.stringify(request._body))
      res.end()
    }
    const { body } = await supertest(app.server).post('/').send({ name: 'virk', isJSON: true })
    assert.deepEqual(body, {})
  })

  test('parse form data when JSON types are set to empty', async (assert) => {
    /**
     * Get method to render the form
     */
    app.get = function (req, res) {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.write(`
      <form method='POST' action='/'>
        <input type='text' name='name' />
        <input type='email' name='email' />
        <button type='submit'> Submit </button>
      </form>
      `)
      res.end()
    }

    /**
     * Post method to handle the form submission
     */
    app.post = async function (request, res) {
      const config = new Config()
      config.set('bodyParser.json.types', [])
      const parser = new BodyParser(config)
      await parser.handle({ request }, function () {})
      res.writeHead(200, { 'content-type': 'application/json' })
      res.write(JSON.stringify(request._body))
      res.end()
    }

    const browser = new Browser()
    await browser.visit('/')

    await browser
      .fill('name', 'virk')
      .fill('email', 'foo@bar.com')
      .pressButton('Submit')

    assert.deepEqual(JSON.parse(browser.text()), { name: 'virk', email: 'foo@bar.com' })
  })

  test('parse raw body', async (assert) => {
    app.post = async function (request, res) {
      const parser = new BodyParser(new Config())
      await parser.handle({ request }, function () {})
      res.writeHead(200, { 'content-type': 'application/json' })
      res.write(request._raw)
      res.end()
    }

    const { body } = await supertest(app.server)
      .post('/')
      .set('content-type', 'text/plain')
      .send(JSON.stringify({ name: 'virk', isJSON: true }))

    assert.deepEqual(body, { name: 'virk', isJSON: true })
  })

  test('parse raw body when payload is buffer', async (assert) => {
    app.post = async function (request, res) {
      const parser = new BodyParser(new Config())
      await parser.handle({ request }, function () {})
      res.writeHead(200, { 'content-type': 'text/plain' })
      res.write(request._raw)
      res.end()
    }

    const { text } = await supertest(app.server)
      .post('/')
      .set('content-type', 'text/plain')
      .send(Buffer.from('Hello world'))
    assert.equal(text, 'Hello world')
  })

  test('parse multipart/form-data', async (assert) => {
    /**
     * Get method to render the form
     */
    app.get = function (req, res) {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.write(`
      <form method='POST' action='/' enctype="multipart/form-data">
        <input type="file" name="package" />
        <button type='submit'> Submit </button>
      </form>
      `)
      res.end()
    }

    /**
     * Post method to handle the form submission
     */
    app.post = async function (request, res) {
      const parser = new BodyParser(new Config())
      await parser.handle({ request }, function () {})
      res.writeHead(200, { 'content-type': 'application/json' })
      res.write(JSON.stringify(request._files.package))
      res.end()
    }

    const browser = new Browser()
    await browser.visit('/')

    await browser
      .attach('package', path.join(__dirname, '../../package.json'))
      .pressButton('Submit')

    const file = JSON.parse(browser.text())
    assert.equal(file.clientName, 'package.json')
    assert.equal(file.fieldName, 'package')
    assert.isAbove(file.size, 0)
    assert.isDefined(file.tmpPath)
  })

  test('upload multiple files', async (assert) => {
    /**
     * Post method to handle the form submission
     */
    app.post = async function (request, res) {
      const parser = new BodyParser(new Config())
      await parser.handle({ request }, function () {})
      res.writeHead(200, { 'content-type': 'application/json' })
      assert.lengthOf(request._files['ignore-files'], 2)
      res.write(JSON.stringify(request._files['ignore-files'].map((file) => file.toJSON())))
      res.end()
    }

    const { body } = await supertest(app.server)
      .post('/')
      .attach('ignore-files', path.join(__dirname, '../../.gitignore'))
      .attach('ignore-files', path.join(__dirname, '../../.npmignore'))

    assert.equal(body[0].clientName, '.gitignore')
    assert.equal(body[0].fieldName, 'ignore-files')
    assert.isAbove(body[0].size, 0)
    assert.isDefined(body[0].tmpPath)
    assert.equal(body[1].clientName, '.npmignore')
    assert.equal(body[1].fieldName, 'ignore-files')
    assert.isAbove(body[1].size, 0)
    assert.isDefined(body[1].tmpPath)
  })

  test('upload nested multiple files', async (assert) => {
    /**
     * Post method to handle the form submission
     */
    app.post = async function (request, res) {
      const parser = new BodyParser(new Config())
      await parser.handle({ request }, function () {})
      res.writeHead(200, { 'content-type': 'application/json' })
      res.write(JSON.stringify([request._files.user[0]['ignore-file'], request._files.user[1]['ignore-file']]))
      res.end()
    }

    const { body } = await supertest(app.server)
      .post('/')
      .attach('user[0][ignore-file]', path.join(__dirname, '../../.gitignore'))
      .attach('user[1][ignore-file]', path.join(__dirname, '../../.npmignore'))

    assert.equal(body[0].clientName, '.gitignore')
    assert.equal(body[0].fieldName, 'user[0][ignore-file]')
    assert.isAbove(body[0].size, 0)
    assert.isDefined(body[0].tmpPath)
    assert.equal(body[1].clientName, '.npmignore')
    assert.equal(body[1].fieldName, 'user[1][ignore-file]')
    assert.isAbove(body[1].size, 0)
    assert.isDefined(body[1].tmpPath)
  })

  test('process fields with files', async (assert) => {
    /**
     * Post method to handle the form submission
     */
    app.post = async function (request, res) {
      const parser = new BodyParser(new Config())
      await parser.handle({ request }, function () {})
      res.writeHead(200, { 'content-type': 'application/json' })
      res.write(JSON.stringify(request._body))
      res.end()
    }

    const { body } = await supertest(app.server)
      .post('/')
      .field('username', 'virk')
      .attach('package', path.join(__dirname, '../../package.json'))

    assert.deepEqual(body, { username: 'virk' })
  })

  test('process nested fields with files', async (assert) => {
    /**
     * Post method to handle the form submission
     */
    app.post = async function (request, res) {
      const parser = new BodyParser(new Config())
      await parser.handle({ request }, function () {})
      res.writeHead(200, { 'content-type': 'application/json' })
      res.write(JSON.stringify(request._body))
      res.end()
    }

    const { body } = await supertest(app.server)
      .post('/')
      .field('user[0][name]', 'virk')
      .attach('package', path.join(__dirname, '../../package.json'))

    assert.deepEqual(body, { user: [{ name: 'virk' }] })
  })

  test('process fields and files both', async (assert) => {
    /**
     * Post method to handle the form submission
     */
    app.post = async function (request, res) {
      const parser = new BodyParser(new Config())
      await parser.handle({ request }, function () {})
      res.writeHead(200, { 'content-type': 'application/json' })
      res.write(JSON.stringify({ fields: request._body, files: request._files.package }))
      res.end()
    }

    const { body } = await supertest(app.server)
      .post('/')
      .field('username', 'virk')
      .attach('package', path.join(__dirname, '../../package.json'))

    assert.deepEqual(body.fields, { username: 'virk' })
    assert.equal(body.files.clientName, 'package.json')
    assert.equal(body.files.fieldName, 'package')
    assert.isAbove(body.files.size, 0)
  })

  test('ignore multipart request when autoProcess is set to false', async (assert) => {
    /**
     * Post method to handle the form submission
     */
    app.post = async function (request, res) {
      const config = new Config()
      config.set('bodyParser.files.autoProcess', false)

      const parser = new BodyParser(config)
      await parser.handle({ request }, function () {})
      res.writeHead(200, { 'content-type': 'application/json' })
      res.write(JSON.stringify({ fields: request._body, files: request._files }))
      res.end()
    }

    const { body } = await supertest(app.server)
      .post('/')
      .field('username', 'virk')
      .attach('package', path.join(__dirname, '../../package.json'))

    assert.deepEqual(body.fields, {})
    assert.deepEqual(body.files, {})
  })

  test('ignore multipart request when autoProcess is true but url is defined to be processed', async (assert) => {
    /**
     * Post method to handle the form submission
     */
    app.post = async function (request, res) {
      const config = new Config()
      config.set('bodyParser.files.autoProcess', true)
      config.set('bodyParser.files.processManually', ['/'])

      const parser = new BodyParser(config)
      await parser.handle({ request }, function () {})
      res.writeHead(200, { 'content-type': 'application/json' })
      res.write(JSON.stringify({ fields: request._body, files: request._files }))
      res.end()
    }

    const { body } = await supertest(app.server)
      .post('/')
      .field('username', 'virk')
      .attach('package', path.join(__dirname, '../../package.json'))

    assert.deepEqual(body.fields, {})
    assert.deepEqual(body.files, {})
  })

  test('parse multipart request when url is defined in autoProcess', async (assert) => {
    /**
     * Post method to handle the form submission
     */
    app.post = async function (request, res) {
      const config = new Config()
      config.set('bodyParser.files.autoProcess', ['/'])

      const parser = new BodyParser(config)
      await parser.handle({ request }, function () {})
      res.writeHead(200, { 'content-type': 'application/json' })
      res.write(JSON.stringify({ fields: request._body, files: request._files.package }))
      res.end()
    }

    const { body } = await supertest(app.server)
      .post('/')
      .field('username', 'virk')
      .attach('package', path.join(__dirname, '../../package.json'))

    assert.deepEqual(body.fields, { username: 'virk' })
    assert.equal(body.files.clientName, 'package.json')
    assert.equal(body.files.fieldName, 'package')
    assert.isAbove(body.files.size, 0)
  })
})
