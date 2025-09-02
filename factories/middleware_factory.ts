/*
 * @adonisjs/bodyparser
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import lodash from '@poppinss/utils/lodash'
import type { FeatureFlags } from '@adonisjs/application'
import type { ExperimentalFlagsList } from '@adonisjs/application/types'

import { defineConfig } from '../src/define_config.ts'
import { BodyParserMiddleware } from '../src/bodyparser_middleware.ts'
import type { BodyParserConfig, BodyParserOptionalConfig } from '../src/types.ts'

/**
 * Factory to create bodyparser middleware instance
 */
export class BodyParserMiddlewareFactory {
  #config: BodyParserConfig = defineConfig({})
  #featureFlags?: FeatureFlags<ExperimentalFlagsList>

  #getConfig(): BodyParserConfig {
    return this.#config
  }

  merge(config: BodyParserOptionalConfig) {
    this.#config = lodash.merge(this.#config, config)
    return this
  }

  /**
   * Specify the feature flags to share with the bodyparser
   */
  withFeatureFlags(featureFlags: FeatureFlags<ExperimentalFlagsList>) {
    this.#featureFlags = featureFlags
    return this
  }

  create() {
    return new BodyParserMiddleware(this.#getConfig(), this.#featureFlags)
  }
}
