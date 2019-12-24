<div align="center"><img src="https://res.cloudinary.com/adonisjs/image/upload/q_100/v1564392111/adonis-banner_o9lunk.png" width="600px"></div>

# AdonisJS BodyParser
> Bodyparser middleware to AdonisJs

[![appveyor-image]][appveyor-url] [![circleci-image]][circleci-url] [![typescript-image]][typescript-url] [![npm-image]][npm-url] [![license-image]][license-url]

The BodyParser middleware parses the incoming HTTP requests body and files, so that you can access them using the `request` instance. The module is written specifically to work with AdonisJs only.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
## Table of contents

- [Features](#features)
- [Usage](#usage)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Features

1. Support for `multipart/form-data`, `application/x-www-form-urlencoded` as well raw HTTP requests.
2. Extensive support for JSON request body including `application/vnd.api+json`, `application/json-patch+json`, `application/csp-report` and `application/json` content type.
3. Exposes API to stream file uploads without writing to the `tmp` directory.
4. Inbuilt protection from [JSON poisioning](https://medium.com/intrinsic/javascript-prototype-poisoning-vulnerabilities-in-the-wild-7bc15347c96)

## Usage
The bodyparser is part of `@adonisjs/core` package and hence no extra setup is required

[appveyor-image]: https://img.shields.io/appveyor/ci/thetutlage/adonis-bodyparser/master.svg?style=for-the-badge&logo=appveyor
[appveyor-url]: https://ci.appveyor.com/project/thetutlage/adonis-bodyparser "appveyor"

[circleci-image]: https://img.shields.io/circleci/project/github/adonisjs/adonis-bodyparser/master.svg?style=for-the-badge&logo=circleci
[circleci-url]: https://circleci.com/gh/adonisjs/adonis-bodyparser "circleci"

[typescript-image]: https://img.shields.io/badge/Typescript-294E80.svg?style=for-the-badge&logo=typescript
[typescript-url]:  "typescript"

[npm-image]: https://img.shields.io/npm/v/@adonisjs/bodyparser.svg?style=for-the-badge&logo=npm
[npm-url]: https://npmjs.org/package/@adonisjs/bodyparser "npm"

[license-image]: https://img.shields.io/npm/l/@adonisjs/bodyparser?color=blueviolet&style=for-the-badge
[license-url]: LICENSE.md "license"
