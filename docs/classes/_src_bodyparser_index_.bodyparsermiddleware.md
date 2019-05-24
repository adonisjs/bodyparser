[@adonisjs/bodyparser](../README.md) > ["src/BodyParser/index"](../modules/_src_bodyparser_index_.md) > [BodyParserMiddleware](../classes/_src_bodyparser_index_.bodyparsermiddleware.md)

# Class: BodyParserMiddleware

BodyParser middleware parses the incoming request body and set it as request body to be read later in the request lifecycle.

## Hierarchy

**BodyParserMiddleware**

## Index

### Constructors

* [constructor](_src_bodyparser_index_.bodyparsermiddleware.md#constructor)

### Methods

* [handle](_src_bodyparser_index_.bodyparsermiddleware.md#handle)

---

## Constructors

<a id="constructor"></a>

###  constructor

⊕ **new BodyParserMiddleware**(_config: *`BodyParserConfig`*): [BodyParserMiddleware](_src_bodyparser_index_.bodyparsermiddleware.md)

**Parameters:**

| Name | Type |
| ------ | ------ |
| _config | `BodyParserConfig` |

**Returns:** [BodyParserMiddleware](_src_bodyparser_index_.bodyparsermiddleware.md)

___

## Methods

<a id="handle"></a>

###  handle

▸ **handle**(__namedParameters: *`object`*, next: *`function`*): `Promise`<`void`>

Handle HTTP request body by parsing it as per the user config

**Parameters:**

| Name | Type |
| ------ | ------ |
| __namedParameters | `object` |
| next | `function` |

**Returns:** `Promise`<`void`>

___

