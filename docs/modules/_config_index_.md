> **[@adonisjs/bodyparser](../README.md)**

[Globals](../globals.md) / ["config/index"](_config_index_.md) /

# External module: "config/index"

## Index

### Object literals

* [config](_config_index_.md#const-config)

## Object literals

### `Const` config

### ▪ **config**: *object*

Default config to be used. It will be deep merged
with the user config

###  whitelistedMethods

• **whitelistedMethods**: *string[]* =  ['POST', 'PUT', 'PATCH', 'DELETE']

▪ **form**: *object*

* **encoding**: *string* = "utf-8"

* **limit**: *string* = "1mb"

* **queryString**(): *object*

* **types**: *string[]* =  [
      'application/x-www-form-urlencoded',
    ]

▪ **json**: *object*

* **encoding**: *string* = "utf-8"

* **limit**: *string* = "1mb"

* **strict**: *true* = true

* **types**: *string[]* =  [
      'application/json',
      'application/json-patch+json',
      'application/vnd.api+json',
      'application/csp-report',
    ]

▪ **multipart**: *object*

* **autoProcess**: *true* = true

* **encoding**: *string* = "utf-8"

* **limit**: *string* = "20mb"

* **maxFields**: *number* = 1000

* **processManually**: *never[]* =  []

* **types**: *string[]* =  [
      'multipart/form-data',
    ]

* **tmpFileName**(): *string*

▪ **raw**: *object*

* **encoding**: *string* = "utf-8"

* **limit**: *string* = "1mb"

* **queryString**(): *object*

* **types**: *string[]* =  [
      'text/*',
    ]