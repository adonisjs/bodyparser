/*
 * @adonisjs/bodyparser
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import stringHelpers from '@poppinss/utils/string'
import { type BodyParserMultipartConfig } from '../types.ts'
import { formBodyNormalizers } from '../utils.ts'

/**
 * Prepares configuration for multipart form data parsing by converting
 * size limits from strings to bytes and configuring value normalization.
 *
 * @param config - Multipart body parser configuration
 */
export function prepareMultipartConfig(config: Partial<BodyParserMultipartConfig>): {
  limit?: number
  fieldsLimit?: number
  maxFields?: number
  normalizer?: undefined | ((value: string) => string | null)
} {
  let normalizer: undefined | ((value: string) => string | null)
  if (config.convertEmptyStringsToNull && config.trimWhitespaces) {
    normalizer = formBodyNormalizers.trimWhitespacesAndConvertToNull
  } else if (config.convertEmptyStringsToNull) {
    normalizer = formBodyNormalizers.convertToNull
  } else if (config.trimWhitespaces) {
    normalizer = formBodyNormalizers.trimWhitespaces
  }

  return {
    limit: config.limit ? stringHelpers.bytes.parse(config.limit)! : undefined,
    fieldsLimit: config.fieldsLimit ? stringHelpers.bytes.parse(config.fieldsLimit)! : undefined,
    maxFields: config.maxFields,
    normalizer,
  }
}
