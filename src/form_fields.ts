/*
 * @adonisjs/bodyparser
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import lodash from '@poppinss/utils/lodash'

/**
 * A jar of form fields to store form data by handling
 * array gracefully
 */
export class FormFields {
  #fields: any = {}
  #config: { convertEmptyStringsToNull: boolean }

  constructor(config: { convertEmptyStringsToNull: boolean }) {
    this.#config = config
  }

  /**
   * Add a new key/value pair. The keys with array like
   * expressions are handled properly.
   *
   * @example
   * ```
   * formfields.add('username', 'virk')
   *
   * // array
   * formfields.add('username[]', 'virk')
   * formfields.add('username[]', 'nikk')
   *
   * // Indexed keys are orderd properly
   * formfields.add('username[1]', 'virk')
   * formfields.add('username[0]', 'nikk')
   * ```
   */
  add(key: string, value: any): void {
    let isArray = false

    /**
     * Convert empty strings to null
     */
    if (this.#config.convertEmptyStringsToNull && value === '') {
      value = null
    }

    /**
     * Drop `[]` without indexes, since lodash `_.set` and
     * `_.get` methods needs the index or plain key.
     */
    key = key.replace(/\[]$/, () => {
      isArray = true
      return ''
    })

    /**
     * Check to see if value exists or set it (if missing)
     */
    const existingValue = lodash.get(this.#fields, key)

    if (!existingValue) {
      lodash.set(this.#fields, key, isArray ? [value] : value)
      return
    }

    /**
     * Mutate existing value if it's an array
     */
    if (Array.isArray(existingValue)) {
      existingValue.push(value)
      return
    }

    /**
     * Set new value + existing value
     */
    lodash.set(this.#fields, key, [existingValue, value])
  }

  /**
   * Returns the copy of form fields
   */
  get() {
    return this.#fields
  }
}
