> **[@adonisjs/bodyparser](../README.md)**

[Globals](../globals.md) / ["src/Multipart/index"](../modules/_src_multipart_index_.md) / [Multipart](_src_multipart_index_.multipart.md) /

# Class: Multipart

Multipart class offers a low level API to interact the incoming
HTTP request data as a stream. This makes it super easy to
write files to s3 without saving them to the disk first.

## Hierarchy

* **Multipart**

## Implements

* `MultipartContract`

## Index

### Constructors

* [constructor](_src_multipart_index_.multipart.md#constructor)

### Properties

* [consumed](_src_multipart_index_.multipart.md#consumed)

### Methods

* [onFile](_src_multipart_index_.multipart.md#onfile)
* [process](_src_multipart_index_.multipart.md#process)

## Constructors

###  constructor

\+ **new Multipart**(`_request`: `RequestContract`, `_config`: undefined | object): *[Multipart](_src_multipart_index_.multipart.md)*

**Parameters:**

Name | Type | Default |
------ | ------ | ------ |
`_request` | `RequestContract` | - |
`_config` | undefined \| object |  {} |

**Returns:** *[Multipart](_src_multipart_index_.multipart.md)*

## Properties

###  consumed

• **consumed**: *boolean* = false

Consumed is set to true when `process` is called. Calling
process multiple times is not possible and hence this
boolean must be checked first

## Methods

###  onFile

▸ **onFile**(`name`: string, `options`: object, `handler`: `PartHandlerContract`): *this*

Attach handler for a given file. To handle all files, you
can attach a wildcard handler.

**`example`** 
```ts
multipart.onFile('package', {}, async (stream) => {
})

multipart.onFile('*', {}, async (stream) => {
})
```

**Parameters:**

Name | Type |
------ | ------ |
`name` | string |
`options` | object |
`handler` | `PartHandlerContract` |

**Returns:** *this*

___

###  process

▸ **process**(`config?`: undefined | object): *`Promise<void>`*

Process the request by going all the file and field
streams.

**Parameters:**

Name | Type |
------ | ------ |
`config?` | undefined \| object |

**Returns:** *`Promise<void>`*