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
 * Factory to create bodyparser middleware instances with custom configuration
 */
export class BodyParserMiddlewareFactory {
  /**
   * The bodyparser configuration
   */
  #config: BodyParserConfig = defineConfig({})

  /**
   * Feature flags to pass to the middleware
   */
  #featureFlags?: FeatureFlags<ExperimentalFlagsList>

  /**
   * Get the current configuration
   */
  #getConfig(): BodyParserConfig {
    return this.#config
  }

  /**
   * Merge additional configuration options with the existing configuration
   *
   * @param config - Configuration options to merge
   */
  merge(config: BodyParserOptionalConfig) {
    this.#config = lodash.merge(this.#config, config)
    return this
  }

  /**
   * Specify the feature flags to share with the bodyparser middleware
   *
   * @param featureFlags - Feature flags to configure
   */
  withFeatureFlags(featureFlags: FeatureFlags<ExperimentalFlagsList>) {
    this.#featureFlags = featureFlags
    return this
  }

  /**
   * Create a new BodyParserMiddleware instance with the configured options
   */
  create() {
    return new BodyParserMiddleware(this.#getConfig(), this.#featureFlags)
  }
}
