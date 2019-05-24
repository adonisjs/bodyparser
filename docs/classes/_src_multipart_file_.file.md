[@adonisjs/bodyparser](../README.md) > ["src/Multipart/File"](../modules/_src_multipart_file_.md) > [File](../classes/_src_multipart_file_.file.md)

# Class: File

File class exposes a friendly API to validate or save uploaded files.

## Hierarchy

**File**

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
* [fileName](_src_multipart_file_.file.md#filename)
* [size](_src_multipart_file_.file.md#size)
* [subtype](_src_multipart_file_.file.md#subtype)
* [tmpPath](_src_multipart_file_.file.md#tmppath)
* [type](_src_multipart_file_.file.md#type)

### Accessors

* [isValid](_src_multipart_file_.file.md#isvalid)
* [status](_src_multipart_file_.file.md#status)

### Methods

* [setValidationOptions](_src_multipart_file_.file.md#setvalidationoptions)

---

## Constructors

<a id="constructor"></a>

###  constructor

⊕ **new File**(_data: *`FileInputNode`*): [File](_src_multipart_file_.file.md)

**Parameters:**

| Name | Type |
| ------ | ------ |
| _data | `FileInputNode` |

**Returns:** [File](_src_multipart_file_.file.md)

___

## Properties

<a id="clientname"></a>

###  clientName

**● clientName**: *`string`* =  this._data.fileName

Client name is the file name on the user client

___
<a id="errors"></a>

###  errors

**● errors**: *`FileUploadError`[]* =  []

Upload errors

___
<a id="extname"></a>

###  extname

**● extname**: *`string`* =  extname(this.clientName).replace(/^\./, '')

The extname for the file

___
<a id="fieldname"></a>

###  fieldName

**● fieldName**: *`string`* =  this._data.fieldName

Field name is the name of the field

___
<a id="filename"></a>

###  fileName

**● fileName**: *`string`*

Filename is only set after the move operation

___
<a id="size"></a>

###  size

**● size**: *`number`* =  this._data.bytes

File size in bytes

___
<a id="subtype"></a>

###  subtype

**● subtype**: *`string`*

___
<a id="tmppath"></a>

###  tmpPath

**● tmpPath**: *`string`* =  this._data.tmpPath

Path to the tmp folder

___
<a id="type"></a>

###  type

**● type**: *`string`*

Type and subtype are extracted from the `content-type` header

___

## Accessors

<a id="isvalid"></a>

###  isValid

**get isValid**(): `boolean`

Returns a boolean telling if file is valid or not

**Returns:** `boolean`

___
<a id="status"></a>

###  status

**get status**(): "pending" \| "moved" \| "error"

Current status of the file

**Returns:** "pending" \| "moved" \| "error"

___

## Methods

<a id="setvalidationoptions"></a>

###  setValidationOptions

▸ **setValidationOptions**(options: *`Partial`<`FileValidationOptions`>*): `this`

Set validation options to be used for validating the file

**Parameters:**

| Name | Type |
| ------ | ------ |
| options | `Partial`<`FileValidationOptions`> |

**Returns:** `this`

___

