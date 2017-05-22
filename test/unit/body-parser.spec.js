'use strict'

const test = require('japa')
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
      await parser.handle({ request })
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
      await parser.handle({ request })
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
      await parser.handle({ request })
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
      await parser.handle({ request })
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
      await parser.handle({ request })
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
      await parser.handle({ request })
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
      await parser.handle({ request })
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
      await parser.handle({ request })
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
      await parser.handle({ request })
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
})
