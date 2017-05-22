'use strict'

module.exports = {
  /*
  |--------------------------------------------------------------------------
  | JSON Parser
  |--------------------------------------------------------------------------
  |
  | Below settings are applied when request body contains JSON payload. If
  | you want body parser to ignore JSON payload, then simply set `types`
  | to an empty array.
  */
  json: {
    /*
    |--------------------------------------------------------------------------
    | limit
    |--------------------------------------------------------------------------
    |
    | Defines the limit of JSON that can be sent by the client. If payload
    | is over 1mb it will not be processed.
    |
    */
    limit: '1mb',

    /*
    |--------------------------------------------------------------------------
    | strict
    |--------------------------------------------------------------------------
    |
    | When `scrict` is set to true, body parser will only parse Arrays and
    | Object. Otherwise everything parseable by `JSON.parse` is parsed.
    |
    */
    strict: true,

    /*
    |--------------------------------------------------------------------------
    | types
    |--------------------------------------------------------------------------
    |
    | Which content types are processed as JSON payloads. You are free to
    | add your own types here, but the request body should be parseable
    | by `JSON.parse` method.
    |
    */
    types: [
      'application/json',
      'application/json-patch+json',
      'application/vnd.api+json',
      'application/csp-report'
    ]
  },

  /*
  |--------------------------------------------------------------------------
  | raw
  |--------------------------------------------------------------------------
  |
  |
  |
  */
  raw: {
    types: [
      'text/*'
    ]
  },

  /*
  |--------------------------------------------------------------------------
  | form x-www-form-urlencoded
  |--------------------------------------------------------------------------
  |
  |
  |
  */
  form: {
    types: [
      'application/x-www-form-urlencoded'
    ]
  },

  /*
  |--------------------------------------------------------------------------
  | files multipart/form-data
  |--------------------------------------------------------------------------
  |
  |
  |
  */
  files: {
  }
}
