# Body Parser

Receiving data from client to the server is getting complicated these days, since we deal with a lot more different data types over simple HTML form submissions.

The idea is to keep the body parser simple and plain and yet have extensive support for different data types. It should allow.

1. Parsing `form`, `raw` and `json` data types.
2. Allow file uploads
3. Should be able to stream file uploads over saving them to `tmp` directory.
4. Proper support for arrays.

## Things To Know About File Uploads

1. `stream` property is set to `null` when file has been moved successfully or if there was an error.
2. `stream` property is set to `null` when file is moved to `tmp` directory.
3. All errors are swalled and returned via `errors()` method. Only `form` stream errors are thrown.
4. Request abort is handled gracefully.

## Use Cases
Below is the list of use cases one can have with file uploads. There is no need to complex things a lot, since people have been living with file uploads even when `body parsers` were dumb.

### Simplest
The simplest use case is when we need all the files to be moved to the `tmp` directory automatically and later we can pull the file instances and `move` them to the right location.

It requires

1. Ability to `move` file.
2. Ability to `move` and remove `tmp` file.
3. Ability to `validate` file before moving it.
4. Stream file from `tmp` directory to a custom location.

The syntax needs to be as

```js
const file = request.file('package', {
  maxSize: '2mb',
  allowExtensions: ['jpg', 'png', 'gif']
})

file.validate(async function () {
	// return true, error message or exception
})

await file.move()

if (!file.moved()) {
  file.errors()
}
```

At times we allow users to upload an array of files instead of a single file. This time things get little complicated since we don't want to fail the entire operation when one file fails and also wants to know the status of files.

```js
const picsJar = request.files('pics', {
  maxSize: '2mb',
  allowExtensions: ['jpg', 'png', 'gif']
})

picsJar.validate(async (file) => {
  // return true for each file
})

await picsJar.moveAll()

// An array of files which were moved successfully
const files = picsJar.movedList().map((file) => {
  return {
    name: file.filename,
    path: file.location
  }
})

await FileModel.createMany(files)

if (!picsJar.movedAll()) {
  picsJar.errors()
}
```

### Advanced Approach
At times we need more control over the uploaded files and don't want server to do extra work. Let's see how it will look like.

1. Here, no `tmp` files are created.
2. Nothing is stored inside buffer.
3. Files can be streamed directly to `s3` or any other cloud service.
4. Ultra light.


```js
const multipart = request.multipart

// handle each file individually
multipart.file('package', { opts }, async (file) => {
  await file.move()
})

// handle each file individually
multipart.file('avatar', async (file) => {
})

// or handle all files
multipart.file('*', async (file) => {
})

await multipart.process()

multipart.completed()
multipart.movedAll()
```

## File Class
Below is the list of methods on the `File` class.

#### move(location, options)
Move file to given location. Can define any of the `s3` drivers as part of options.

```js
await file.move(location, {
  name: 'custom-name',
  driver: 'node-flydriver-driver',
  stream: false // do not stream, even if driver supports it
})
```


#### validate(callback)
Manually run validations

```js
file.validate(async function () {
  // return true or error message or exception
})
```

#### moved()
Return a `boolean` indicating whether file as moved or not.

```js
if (file.moved()) {
}
```

#### errors()
Returns an array of errors happend during file upload

```js
file.errors()
```

#### toJSON()
JSON representation of the file.

```js
file.toJSON()
```

#### stream
Stream property, only available when file upload is manually handled or when file is not moved to the `tmp` directory.

```js
res.pipe(file.stream)
```


## File Jar Class
Below is the list of methods on `file` Jar. A file jar is returned when an array of files are uploaded over a single file.

#### validate
Called for each file

```js
fileJar.validate(async function (file) {
  // return true or error message or exception
})
```

#### moveAll(location, callback)
Move all the files

```js
await fileJar.moveAll(location, function () {
  return { name: new Date().getTime(), driver: 's3' }
})
```

#### movedAll()
Returns a `boolean` indicating whether all files were successfully moved

```js
if (fileJar.movedAll()) {

}
```

#### errors()
An array of errors with files names and their errors.

```js
if (fileJar.movedAll()) {
  fileJar.errors()
}
```

#### movedList()
Returns an array of files moved successfully.

```js
fileJar.movedList()
```

#### toJSON()
Returns an array of files json representation.

```js
fileJar.toJSON()
```

## Multipart Class
The multipart class is responsible for reading and processing files, this class should be used manually for advanced options.

#### file(name, callback)
Returns an instance of file to the callback with it's readable stream.

```js
multipart.file('profile', async (file) => {
  // return true or error message or exception
})

// or wildcard

multipart.file('*', async function (file) => {
  // return true or error message or exception
})
```

#### process()
Start process the files by lazy reading them, files not accessed via `file` method are never processed.

```js
await multipart.process()
```

#### movedAll()
Returns a `boolean` indicating whether all files were successfully moved

```js
multipart.movedAll()
```

#### errors()
Returns an array of errors occured during file uploads.

```js
multipart.errors()
```

#### movedList()
Returns an array of files moved successfully.

```js
multipart.movedList()
```
