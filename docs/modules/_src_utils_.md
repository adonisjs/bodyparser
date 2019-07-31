> **[@adonisjs/bodyparser](../README.md)**

[Globals](../globals.md) / ["src/utils"](_src_utils_.md) /

# External module: "src/utils"

## Index

### Functions

* [getFileType](_src_utils_.md#getfiletype)
* [validateExtension](_src_utils_.md#validateextension)
* [validateSize](_src_utils_.md#validatesize)

## Functions

###  getFileType

▸ **getFileType**(`fileContents`: `Buffer`, `clientName`: string, `headers`: object, `force`: boolean): *null | object*

Returns the file `type`, `subtype` and `extension`.

**Parameters:**

Name | Type | Default |
------ | ------ | ------ |
`fileContents` | `Buffer` | - |
`clientName` | string | - |
`headers` | object | - |
`force` | boolean | false |

**Returns:** *null | object*

___

###  validateExtension

▸ **validateExtension**(`fieldName`: string, `clientName`: string, `extname`: string, `allowedExtensions?`: string[]): *`FileUploadError` | null*

Returns an error when file extension isn't one of the allowed file
extensions.

**Parameters:**

Name | Type |
------ | ------ |
`fieldName` | string |
`clientName` | string |
`extname` | string |
`allowedExtensions?` | string[] |

**Returns:** *`FileUploadError` | null*

___

###  validateSize

▸ **validateSize**(`fieldName`: string, `clientName`: string, `actualBytes`: number, `expectedBytes?`: string | number): *`FileUploadError` | null*

Returns an error when file size is over the expected
bytes.

**Parameters:**

Name | Type |
------ | ------ |
`fieldName` | string |
`clientName` | string |
`actualBytes` | number |
`expectedBytes?` | string \| number |

**Returns:** *`FileUploadError` | null*