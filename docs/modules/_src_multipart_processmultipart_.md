> **[@adonisjs/bodyparser](../README.md)**

[Globals](../globals.md) / ["src/Multipart/processMultipart"](_src_multipart_processmultipart_.md) /

# External module: "src/Multipart/processMultipart"

### Index

#### Functions

* [processMultipart](_src_multipart_processmultipart_.md#processmultipart)

## Functions

###  processMultipart

▸ **processMultipart**(`multipart`: [Multipart](../classes/_src_multipart_index_.multipart.md), `config`: `BodyParserMultipartConfig`): *`Promise<object>`*

Processes the incoming multipart stream by moving files to the
tmp directory and return `files` and `fields` data map.

**Parameters:**

Name | Type |
------ | ------ |
`multipart` | [Multipart](../classes/_src_multipart_index_.multipart.md) |
`config` | `BodyParserMultipartConfig` |

**Returns:** *`Promise<object>`*