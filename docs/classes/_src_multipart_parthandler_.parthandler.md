> **[@adonisjs/bodyparser](../README.md)**

[Globals](../globals.md) / ["src/Multipart/PartHandler"](../modules/_src_multipart_parthandler_.md) / [PartHandler](_src_multipart_parthandler_.parthandler.md) /

# Class: PartHandler

Part handler handles the progress of a stream and also internally validates
it's size and extension.

This class offloads the task of validating a file stream, regardless of how
the stream is consumed. For example:

In classic scanerio, we will process the file stream and write files to the
tmp directory and in more advanced cases, the end user can handle the
stream by themselves and report each chunk to this class.

## Hierarchy

* **PartHandler**

## Index

### Constructors

* [constructor](_src_multipart_parthandler_.parthandler.md#constructor)

### Methods

* [getFile](_src_multipart_parthandler_.parthandler.md#getfile)
* [reportError](_src_multipart_parthandler_.parthandler.md#reporterror)
* [reportProgress](_src_multipart_parthandler_.parthandler.md#reportprogress)
* [reportSuccess](_src_multipart_parthandler_.parthandler.md#reportsuccess)

## Constructors

###  constructor

\+ **new PartHandler**(`_part`: `MultipartStream`, `_options`: `Partial<FileValidationOptions & object>`): *[PartHandler](_src_multipart_parthandler_.parthandler.md)*

**Parameters:**

Name | Type |
------ | ------ |
`_part` | `MultipartStream` |
`_options` | `Partial<FileValidationOptions & object>` |

**Returns:** *[PartHandler](_src_multipart_parthandler_.parthandler.md)*

## Methods

###  getFile

▸ **getFile**(): *[File](_src_multipart_file_.file.md) | null*

Returns the file instance only when the progress of
the file has been reported atleast once.

**Returns:** *[File](_src_multipart_file_.file.md) | null*

___

###  reportError

▸ **reportError**(`error`: any): *void*

Report errors encountered while processing the stream. These can be errors
apart from the one reported by this class. For example: The `s3` failure
due to some bad credentails.

**Parameters:**

Name | Type |
------ | ------ |
`error` | any |

**Returns:** *void*

___

###  reportProgress

▸ **reportProgress**(`line`: `Buffer`, `bufferLength`: number): *void*

Handles the file upload progress by validating the file size and
extension.

**Parameters:**

Name | Type |
------ | ------ |
`line` | `Buffer` |
`bufferLength` | number |

**Returns:** *void*

___

###  reportSuccess

▸ **reportSuccess**(`data?`: object & object): *void*

Report success data about the file.

**Parameters:**

Name | Type |
------ | ------ |
`data?` | object & object |

**Returns:** *void*