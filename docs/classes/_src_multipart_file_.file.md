> **[@adonisjs/bodyparser](../README.md)**

[Globals](../globals.md) / ["src/Multipart/File"](../modules/_src_multipart_file_.md) / [File](_src_multipart_file_.file.md) /

# Class: File

File class exposes a friendly API to validate or save uploaded
files.

## Hierarchy

* **File**

## Implements

* `MultipartFileContract`

### Index

#### Constructors

* [constructor](_src_multipart_file_.file.md#constructor)

#### Properties

* [clientName](_src_multipart_file_.file.md#clientname)
* [errors](_src_multipart_file_.file.md#errors)
* [extname](_src_multipart_file_.file.md#extname)
* [fieldName](_src_multipart_file_.file.md#fieldname)
* [fileName](_src_multipart_file_.file.md#filename)
* [size](_src_multipart_file_.file.md#size)
* [subtype](_src_multipart_file_.file.md#subtype)
* [tmpPath](_src_multipart_file_.file.md#tmppath)
* [type](_src_multipart_file_.file.md#type)

#### Accessors

* [isValid](_src_multipart_file_.file.md#isvalid)
* [status](_src_multipart_file_.file.md#status)

#### Methods

* [setValidationOptions](_src_multipart_file_.file.md#setvalidationoptions)

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

• **clientName**: *string* =  this._data.fileName

Client name is the file name on the user client

___

###  errors

• **errors**: *`FileUploadError`[]* =  []

Upload errors

___

###  extname

• **extname**: *string* =  this._data.fileType
    ? this._data.fileType.ext
    : extname(this.clientName).replace(/^\./, '')

The extname for the file. We pull the file extension from the file
name when `fileType` is undefined. Check [processMultipart](../modules/_src_multipart_processmultipart_.md#processmultipart)
method to known how fileType value is computed.

___

###  fieldName

• **fieldName**: *string* =  this._data.fieldName

Field name is the name of the field

___

###  fileName

• **fileName**: *string*

Filename is only set after the move operation

___

###  size

• **size**: *number* =  this._data.bytes

File size in bytes

___

###  subtype

• **subtype**: *string*

___

###  tmpPath

• **tmpPath**: *string* =  this._data.tmpPath

Path to the tmp folder

___

###  type

• **type**: *string*

Type and subtype are extracted from the `content-type`
header

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

## Methods

###  setValidationOptions

▸ **setValidationOptions**(`options`: `Partial<FileValidationOptions>`): *this*

Set validation options to be used for
validating the file

**Parameters:**

Name | Type |
------ | ------ |
`options` | `Partial<FileValidationOptions>` |

**Returns:** *this*