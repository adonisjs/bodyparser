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
const FormFields = require('../../src/FormFields')

test.group('Form Fields Parser', function () {
  test('add a plain key value pair to form fields', function (assert) {
    const formFields = new FormFields()
    formFields.add('name', 'foo')
    assert.deepEqual(formFields.get(), { name: 'foo' })
  })

  test('add an array of key value pair to form fields', function (assert) {
    const formFields = new FormFields()
    formFields.add('name[]', 'foo')
    assert.deepEqual(formFields.get(), { name: ['foo'] })
  })

  test('add an array of key value pair to form fields multiple times', function (assert) {
    const formFields = new FormFields()
    formFields.add('name[]', 'foo')
    formFields.add('name[]', 'bar')
    assert.deepEqual(formFields.get(), { name: ['foo', 'bar'] })
  })

  test('add a key with nested arrays', function (assert) {
    const formFields = new FormFields()
    formFields.add('user[email]', 'foo@bar.com')
    formFields.add('user[age]', 22)
    assert.deepEqual(formFields.get(), { user: { email: 'foo@bar.com', age: 22 } })
  })

  test('add a key with deep nested arrays', function (assert) {
    const formFields = new FormFields()
    formFields.add('user[email[]]', 'foo@bar.com')
    formFields.add('user[email[]]', 'foo@baz.com')
    formFields.add('user[age]', 22)
    assert.deepEqual(formFields.get(), { user: { email: ['foo@bar.com', 'foo@baz.com'], age: 22 } })
  })

  test('add arrays with indexes', function (assert) {
    const formFields = new FormFields()
    formFields.add('user[0][email]', 'foo@baz.com')
    formFields.add('user[0][age]', 22)
    formFields.add('user[1][email]', 'bar@baz.com')
    assert.deepEqual(formFields.get(), { user: [{ email: 'foo@baz.com', age: 22 }, { email: 'bar@baz.com' }] })
  })
})
