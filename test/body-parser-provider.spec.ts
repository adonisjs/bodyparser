/*
 * @adonisjs/bodyparser
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import test from 'japa'
import { BodyParserMiddleware } from '../src/BodyParser'
import { setupApp, fs } from '../test-helpers'

test.group('BodyParser Provider', (group) => {
  group.afterEach(async () => {
    await fs.cleanup()
  })

  test('register bodyparser provider', async (assert) => {
    const app = await setupApp(['../../providers/BodyParserProvider'])
    assert.deepEqual(app.container.use('Adonis/Core/BodyParser'), BodyParserMiddleware)
    assert.instanceOf(
      app.container.make(app.container.use('Adonis/Core/BodyParser')),
      BodyParserMiddleware
    )
  })

  test('extend request class by adding the file methods', async (assert) => {
    const app = await setupApp(['../../providers/BodyParserProvider'])
    assert.deepEqual(app.container.use('Adonis/Core/BodyParser'), BodyParserMiddleware)
    assert.property(app.container.use('Adonis/Core/Request').prototype, 'file')
    assert.property(app.container.use('Adonis/Core/Request').prototype, 'files')
    assert.property(app.container.use('Adonis/Core/Request').prototype, 'allFiles')
  })
})
