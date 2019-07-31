> **[@adonisjs/bodyparser](../README.md)**

[Globals](../globals.md) / ["test-helpers/index"](_test_helpers_index_.md) /

# External module: "test-helpers/index"

## Index

### Variables

* [packageFilePath](_test_helpers_index_.md#const-packagefilepath)
* [packageFileSize](_test_helpers_index_.md#const-packagefilesize)

### Functions

* [sleep](_test_helpers_index_.md#const-sleep)

### Object literals

* [requestConfig](_test_helpers_index_.md#const-requestconfig)

## Variables

### `Const` packageFilePath

• **packageFilePath**: *string* =  join(__dirname, '../package.json')

___

### `Const` packageFileSize

• **packageFileSize**: *number* =  Buffer.from(contents, 'utf-8').length + 1

## Functions

### `Const` sleep

▸ **sleep**(`time`: number): *`Promise<unknown>`*

**Parameters:**

Name | Type |
------ | ------ |
`time` | number |

**Returns:** *`Promise<unknown>`*

## Object literals

### `Const` requestConfig

### ▪ **requestConfig**: *object*

###  allowMethodSpoofing

• **allowMethodSpoofing**: *boolean* = false

###  generateRequestId

• **generateRequestId**: *boolean* = false

###  subdomainOffset

• **subdomainOffset**: *number* = 2

###  trustProxy

▸ **trustProxy**(): *boolean*

**Returns:** *boolean*