/*
 * @adonisjs/bodyparser
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import lodash from '@poppinss/utils/lodash'

import { defineConfig } from '../src/define_config.js'
import { BodyParserMiddleware } from '../src/body_parser.js'
import type { BodyParserConfig, BodyParserOptionalConfig } from '../src/types.js'

/**
 * Factory to create bodyparser middleware instance
 */
export class BodyParserMiddlewareFactory {
  #config: BodyParserConfig = defineConfig({})

  #getConfig(): BodyParserConfig {
    return this.#config
  }

  merge(config: BodyParserOptionalConfig) {
    this.#config = lodash.merge(this.#config, config)
    return this
  }

  create() {
    return new BodyParserMiddleware(this.#getConfig())
  }
}
