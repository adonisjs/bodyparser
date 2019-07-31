> **[@adonisjs/bodyparser](../README.md)**

[Globals](../globals.md) / ["src/Multipart/File"](../modules/_src_multipart_file_.md) / [File](_src_multipart_file_.file.md) /

# Class: File

The file holds the meta/data for an uploaded file, along with
an errors occurred during the upload process.

## Hierarchy

* **File**

## Implements

* `MultipartFileContract`

## Index

### Constructors

* [constructor](_src_multipart_file_.file.md#constructor)

### Properties

* [clientName](_src_multipart_file_.file.md#clientname)
* [errors](_src_multipart_file_.file.md#errors)
* [extname](_src_multipart_file_.file.md#extname)
* [fieldName](_src_multipart_file_.file.md#fieldname)
* [filePath](_src_multipart_file_.file.md#optional-filepath)
* [meta](_src_multipart_file_.file.md#meta)
* [size](_src_multipart_file_.file.md#size)
* [subtype](_src_multipart_file_.file.md#subtype)
* [tmpPath](_src_multipart_file_.file.md#optional-tmppath)
* [type](_src_multipart_file_.file.md#type)
* [validated](_src_multipart_file_.file.md#validated)

### Accessors

* [isValid](_src_multipart_file_.file.md#isvalid)
* [status](_src_multipart_file_.file.md#status)

## Constructors

###  constructor

\+ **new File**(`_data`: `FileInputNode`): *[File](_src_multipart_file_.file.md)*

**Parameters:**

Name | Type |
------ | ------ |
`_data` | `FileInputNode` |

**Returns:** *[File](_src_multipart_file_.file.md)*

## Properties

###  clientName

• **clientName**: *string* =  this._data.clientName

Client name is the file name on the user client

___

###  errors

• **errors**: *`FileUploadError`[]* =  []

Upload errors

___

###  extname

• **extname**: *string* =  this._data.fileType.ext

The extname for the file.

___

###  fieldName

• **fieldName**: *string* =  this._data.fieldName

Field name is the name of the field

___

### `Optional` filePath

• **filePath**? : *undefined | string* =  this._data.filePath

Filename is only set after the move operation

___

###  meta

• **meta**: *string* =  this._data.meta

The file meta data

___

###  size

• **size**: *number* =  this._data.bytes

File size in bytes

___

###  subtype

• **subtype**: *string* =  this._data.fileType.subtype

___

### `Optional` tmpPath

• **tmpPath**? : *undefined | string* =  this._data.tmpPath

Tmp path, only exists when file is uploaded using the
classic mode.

___

###  type

• **type**: *string* =  this._data.fileType.type

Type and subtype are extracted from the `content-type`
header or from the file magic number

___

###  validated

• **validated**: *boolean* = false

Whether or not this file has been validated

## Accessors

###  isValid

• **get isValid**(): *boolean*

Returns a boolean telling if file is
valid or not

**Returns:** *boolean*

___

###  status

• **get status**(): *"pending" | "moved" | "error"*

Current status of the file

**Returns:** *"pending" | "moved" | "error"*