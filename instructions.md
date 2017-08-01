## Registering provider

Make sure you register the provider inside `start/app.js` file before making use of the body parser.

```js
const providers = [
  '@adonisjs/bodyparser/providers/BodyParserProvider'
]
```

## Registering middleware

Next step is to register a global middleware which will read data from the all requests. The middleware will be registered inside `start/kernel.js` file.

```js
const globalMiddleware = [
  'Adonis/Middleware/BodyParser'
]
```

That's all you need to do 😎

## Config

The config file `config/bodyParser.js`  contains all the configuration options you need to configure.
