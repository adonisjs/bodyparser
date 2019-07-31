> **[@adonisjs/bodyparser](../README.md)**

[Globals](../globals.md) / ["src/Multipart/streamFile"](_src_multipart_streamfile_.md) /

# External module: "src/Multipart/streamFile"

## Index

### Functions

* [streamFile](_src_multipart_streamfile_.md#streamfile)

## Functions

###  streamFile

▸ **streamFile**(`readStream`: `Readable`, `location`: string, `dataListener?`: undefined | function): *`Promise<void>`*

Writes readable stream to the given location by properly cleaning up readable
and writable streams in case of any errors. Also an optional data listener
can listen for the `data` event.

**Parameters:**

Name | Type |
------ | ------ |
`readStream` | `Readable` |
`location` | string |
`dataListener?` | undefined \| function |

**Returns:** *`Promise<void>`*