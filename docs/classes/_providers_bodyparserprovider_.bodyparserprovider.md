[@adonisjs/bodyparser](../README.md) > ["providers/BodyParserProvider"](../modules/_providers_bodyparserprovider_.md) > [BodyParserProvider](../classes/_providers_bodyparserprovider_.bodyparserprovider.md)

# Class: BodyParserProvider

## Hierarchy

**BodyParserProvider**

## Index

### Constructors

* [constructor](_providers_bodyparserprovider_.bodyparserprovider.md#constructor)

### Properties

* [$container](_providers_bodyparserprovider_.bodyparserprovider.md#_container)

### Methods

* [boot](_providers_bodyparserprovider_.bodyparserprovider.md#boot)
* [register](_providers_bodyparserprovider_.bodyparserprovider.md#register)

---

## Constructors

<a id="constructor"></a>

###  constructor

⊕ **new BodyParserProvider**($container: *`any`*): [BodyParserProvider](_providers_bodyparserprovider_.bodyparserprovider.md)

**Parameters:**

| Name | Type |
| ------ | ------ |
| $container | `any` |

**Returns:** [BodyParserProvider](_providers_bodyparserprovider_.bodyparserprovider.md)

___

## Properties

<a id="_container"></a>

### `<Protected>` $container

**● $container**: *`any`*

___

## Methods

<a id="boot"></a>

###  boot

▸ **boot**(): `void`

Adding the `file` macro to add support for reading request files.

**Returns:** `void`

___
<a id="register"></a>

###  register

▸ **register**(): `void`

Registers the bodyparser middleware namespace to the container.

**Returns:** `void`

___

