/*
 * @adonisjs/bodyparser
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { FormFields } from '../src/form_fields.js'

test.group('Form Fields Parser', () => {
  test('add a plain key value pair to form fields', ({ assert }) => {
    const formFields = new FormFields({ convertEmptyStringsToNull: false })
    formFields.add('name', 'foo')
    assert.deepEqual(formFields.get(), { name: 'foo' })
  })

  test('add an array of key value pair to form fields', ({ assert }) => {
    const formFields = new FormFields({ convertEmptyStringsToNull: false })
    formFields.add('name[]', 'foo')
    assert.deepEqual(formFields.get(), { name: ['foo'] })
  })

  test('add an array of key value pair to form fields multiple times', ({ assert }) => {
    const formFields = new FormFields({ convertEmptyStringsToNull: false })
    formFields.add('name[]', 'foo')
    formFields.add('name[]', 'bar')
    assert.deepEqual(formFields.get(), { name: ['foo', 'bar'] })
  })

  test('add a key with nested arrays', ({ assert }) => {
    const formFields = new FormFields({ convertEmptyStringsToNull: false })
    formFields.add('user[email]', 'foo@bar.com')
    formFields.add('user[age]', 22)
    assert.deepEqual(formFields.get(), { user: { email: 'foo@bar.com', age: 22 } })
  })

  test('add a key with deep nested arrays', ({ assert }) => {
    const formFields = new FormFields({ convertEmptyStringsToNull: false })
    formFields.add('user[email[]]', 'foo@bar.com')
    formFields.add('user[email[]]', 'foo@baz.com')
    formFields.add('user[age]', 22)
    assert.deepEqual(formFields.get(), { user: { email: ['foo@bar.com', 'foo@baz.com'], age: 22 } })
  })

  test('add arrays with indexes', ({ assert }) => {
    const formFields = new FormFields({ convertEmptyStringsToNull: false })
    formFields.add('user[1]', 'bar@baz.com')
    formFields.add('user[0]', 'foo@baz.com')
    assert.deepEqual(formFields.get(), { user: ['foo@baz.com', 'bar@baz.com'] })
  })

  test('convert empty string to null', ({ assert }) => {
    const formFields = new FormFields({ convertEmptyStringsToNull: true })
    formFields.add('username', '')
    assert.deepEqual(formFields.get(), { username: null })
  })

  test('convert empty string to null inside an object', ({ assert }) => {
    const formFields = new FormFields({ convertEmptyStringsToNull: true })
    formFields.add('user.username', '')
    assert.deepEqual(formFields.get(), { user: { username: null } })
  })

  test('convert empty string to null inside an array', ({ assert }) => {
    const formFields = new FormFields({ convertEmptyStringsToNull: true })
    formFields.add('user[]', '')
    assert.deepEqual(formFields.get(), { user: [null] })
  })

  test('convert empty string to null inside an index array', ({ assert }) => {
    const formFields = new FormFields({ convertEmptyStringsToNull: true })
    formFields.add('user[2]', '')
    assert.deepEqual(formFields.get(), { user: [undefined, undefined, null] })
  })

  test('convert empty string to null inside an array of objects', ({ assert }) => {
    const formFields = new FormFields({ convertEmptyStringsToNull: true })
    formFields.add('user[0].username', '')
    assert.deepEqual(formFields.get(), { user: [{ username: null }] })
  })

  test('should not pollute Object.prototype via __proto__', ({ assert }) => {
    const formFields = new FormFields({ convertEmptyStringsToNull: false })
    formFields.add('__proto__.polluted', 'yes')

    const clean: Record<string, any> = {}
    assert.isUndefined(clean['polluted'])
  })

  test('should not pollute Object.prototype with nested __proto__ property', ({ assert }) => {
    const formFields = new FormFields({ convertEmptyStringsToNull: false })
    formFields.add('user.__proto__.polluted', 'yes')

    const clean: Record<string, any> = {}
    assert.isUndefined(clean['polluted'])
    assert.deepEqual(formFields.get(), {})
  })

  test('should not pollute Object.prototype with nested __proto__ property in bracket notation', ({
    assert,
  }) => {
    const formFields = new FormFields({ convertEmptyStringsToNull: false })
    formFields.add('user[__proto__][polluted]', 'yes')

    const clean: Record<string, any> = {}
    assert.isUndefined(clean['polluted'])
    assert.deepEqual(formFields.get(), {})
  })

  test('should not pollute Object.prototype via constructor.prototype', ({ assert }) => {
    const formFields = new FormFields({ convertEmptyStringsToNull: false })
    formFields.add('constructor.prototype.polluted2', 'yes')

    const clean: Record<string, any> = {}
    assert.isUndefined(clean['polluted2'])
  })

  test('should not pollute Object.prototype with nested constructor.prototype', ({ assert }) => {
    const formFields = new FormFields({ convertEmptyStringsToNull: false })
    formFields.add('user.constructor.prototype.polluted2', 'yes')

    const clean: Record<string, any> = {}
    assert.isUndefined(clean['polluted2'])
    assert.deepEqual(formFields.get(), {})
  })
})
