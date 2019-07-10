> **[@adonisjs/bodyparser](../README.md)**

[Globals](../globals.md) / ["providers/BodyParserProvider"](../modules/_providers_bodyparserprovider_.md) / [BodyParserProvider](_providers_bodyparserprovider_.bodyparserprovider.md) /

# Class: BodyParserProvider

## Hierarchy

* **BodyParserProvider**

### Index

#### Constructors

* [constructor](_providers_bodyparserprovider_.bodyparserprovider.md#constructor)

#### Properties

* [$container](_providers_bodyparserprovider_.bodyparserprovider.md#protected-$container)

#### Methods

* [boot](_providers_bodyparserprovider_.bodyparserprovider.md#boot)
* [register](_providers_bodyparserprovider_.bodyparserprovider.md#register)

## Constructors

###  constructor

\+ **new BodyParserProvider**(`$container`: any): *[BodyParserProvider](_providers_bodyparserprovider_.bodyparserprovider.md)*

**Parameters:**

Name | Type |
------ | ------ |
`$container` | any |

**Returns:** *[BodyParserProvider](_providers_bodyparserprovider_.bodyparserprovider.md)*

## Properties

### `Protected` $container

• **$container**: *any*

## Methods

###  boot

▸ **boot**(): *void*

Adding the `file` macro to add support for reading request files.

**Returns:** *void*

___

###  register

▸ **register**(): *void*

Registers the bodyparser middleware namespace to the container.

**Returns:** *void*