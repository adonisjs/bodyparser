[@adonisjs/bodyparser](../README.md) > ["config/index"](../modules/_config_index_.md)

# External module: "config/index"

## Index

### Object literals

* [config](_config_index_.md#config)

---

## Object literals

<a id="config"></a>

### `<Const>` config

**config**: *`object`*

Default config to be used. It will be deep merged with the user config

<a id="config.whitelistedmethods"></a>

####  whitelistedMethods

**● whitelistedMethods**: *`string`[]* =  ['POST', 'PUT', 'PATCH', 'DELETE']

___
<a id="config.form"></a>

####  form

**form**: *`object`*

<a id="config.form.encoding"></a>

####  encoding

**● encoding**: *`string`* = "utf-8"

___
<a id="config.form.limit"></a>

####  limit

**● limit**: *`string`* = "1mb"

___
<a id="config.form.querystring"></a>

####  queryString

**● queryString**: *`object`*

#### Type declaration

___
<a id="config.form.types"></a>

####  types

**● types**: *`string`[]* =  [
      'application/x-www-form-urlencoded',
    ]

___

___
<a id="config.json"></a>

####  json

**json**: *`object`*

<a id="config.json.encoding-1"></a>

####  encoding

**● encoding**: *`string`* = "utf-8"

___
<a id="config.json.limit-1"></a>

####  limit

**● limit**: *`string`* = "1mb"

___
<a id="config.json.strict"></a>

####  strict

**● strict**: *`true`* = true

___
<a id="config.json.types-1"></a>

####  types

**● types**: *`string`[]* =  [
      'application/json',
      'application/json-patch+json',
      'application/vnd.api+json',
      'application/csp-report',
    ]

___

___
<a id="config.multipart"></a>

####  multipart

**multipart**: *`object`*

<a id="config.multipart.autoprocess"></a>

####  autoProcess

**● autoProcess**: *`true`* = true

___
<a id="config.multipart.encoding-2"></a>

####  encoding

**● encoding**: *`string`* = "utf-8"

___
<a id="config.multipart.limit-2"></a>

####  limit

**● limit**: *`string`* = "20mb"

___
<a id="config.multipart.maxfields"></a>

####  maxFields

**● maxFields**: *`number`* = 1000

___
<a id="config.multipart.processmanually"></a>

####  processManually

**● processManually**: *`never`[]* =  []

___
<a id="config.multipart.types-2"></a>

####  types

**● types**: *`string`[]* =  [
      'multipart/form-data',
    ]

___
<a id="config.multipart.tmpfilename"></a>

####  tmpFileName

▸ **tmpFileName**(): `string`

**Returns:** `string`

___

___
<a id="config.raw"></a>

####  raw

**raw**: *`object`*

<a id="config.raw.encoding-3"></a>

####  encoding

**● encoding**: *`string`* = "utf-8"

___
<a id="config.raw.limit-3"></a>

####  limit

**● limit**: *`string`* = "1mb"

___
<a id="config.raw.querystring-1"></a>

####  queryString

**● queryString**: *`object`*

#### Type declaration

___
<a id="config.raw.types-3"></a>

####  types

**● types**: *`string`[]* =  [
      'text/*',
    ]

___

___

___

