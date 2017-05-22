# Adonis Middleware


## Body Parser

Receiving data from client to the server is getting complicated these days, since we deal with a lot more different data types over simple HTML form submissions.

The idea is to keep the body parser simple and plain and yet have extensive support for different data types. It should allow.

1. Parsing `form`, `raw` and `json` data types.
2. Allow file uploads
3. Should be able to stream file uploads over saving them to `tmp` directory.
4. Proper support for arrays.
