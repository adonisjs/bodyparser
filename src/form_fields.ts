/*
 * @adonisjs/bodyparser
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import lodash from '@poppinss/utils/lodash'

/**
 * A collection of form fields that stores form data while handling
 * arrays gracefully
 */
export class FormFields {
  /**
   * Internal storage for form fields
   */
  #fields: any = Object.create(null)

  #normalizer?: (value: string) => string | null

  /**
   * Creates a new FormFields instance for collecting form data.
   *
   * @param normalizer - Optional normalizer function to process string values
   */
  constructor(normalizer?: (value: string) => string | null) {
    this.#normalizer = normalizer
  }

  /**
   * Add a new key/value pair. The keys with array-like
   * expressions are handled properly.
   *
   * @param key - The field name, can include array notation
   * @param value - The field value
   *
   * @example
   * ```
   * formfields.add('username', 'virk')
   *
   * // array
   * formfields.add('username[]', 'virk')
   * formfields.add('username[]', 'nikk')
   *
   * // Indexed keys are ordered properly
   * formfields.add('username[1]', 'virk')
   * formfields.add('username[0]', 'nikk')
   * ```
   */
  add(key: string, value: any): void {
    let isArray = false

    /**
     * Convert empty strings to null
     */
    if (this.#normalizer && typeof value === 'string') {
      value = this.#normalizer(value)
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
   * Returns the collected form fields as an object.
   *
   * @example
   * ```ts
   * const fields = new FormFields()
   * fields.add('username', 'virk')
   * fields.add('tags[]', 'node')
   * fields.add('tags[]', 'typescript')
   *
   * console.log(fields.get())
   * // { username: 'virk', tags: ['node', 'typescript'] }
   * ```
   */
  get() {
    return this.#fields
  }
}
