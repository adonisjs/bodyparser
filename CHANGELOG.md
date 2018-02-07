<a name="2.0.2"></a>
## [2.0.2](https://github.com/adonisjs/adonis-bodyparser/compare/v2.0.1...v2.0.2) (2018-02-07)



<a name="2.0.1"></a>
## [2.0.1](https://github.com/adonisjs/adonis-bodyparser/compare/v2.0.0...v2.0.1) (2018-01-10)


### Bug Fixes

* **multipart:** ignore fields with no name ([6cc93e2](https://github.com/adonisjs/adonis-bodyparser/commit/6cc93e2)), closes [#3](https://github.com/adonisjs/adonis-bodyparser/issues/3)



<a name="2.0.0"></a>
# [2.0.0](https://github.com/adonisjs/adonis-bodyparser/compare/v1.0.8...v2.0.0) (2017-11-13)


### Features

* **file:** expose public file properties ([5d4a7df](https://github.com/adonisjs/adonis-bodyparser/commit/5d4a7df))


### BREAKING CHANGES

* **file:** All apps relying on private properties of the file instance will break



<a name="1.0.8"></a>
## [1.0.8](https://github.com/adonisjs/adonis-bodyparser/compare/v1.0.7...v1.0.8) (2017-10-29)


### Bug Fixes

* **file:** generate more unique tmp file names ([257d031](https://github.com/adonisjs/adonis-bodyparser/commit/257d031)), closes [#2](https://github.com/adonisjs/adonis-bodyparser/issues/2)


### Features

* **file:** add option to define custom tmp file names ([0f50a83](https://github.com/adonisjs/adonis-bodyparser/commit/0f50a83))



<a name="1.0.7"></a>
## [1.0.7](https://github.com/adonisjs/adonis-bodyparser/compare/v1.0.6...v1.0.7) (2017-09-27)



<a name="1.0.6"></a>
## [1.0.6](https://github.com/adonisjs/adonis-bodyparser/compare/v1.0.5...v1.0.6) (2017-09-02)


### Bug Fixes

* **body:** set request.body public body ([62ff44b](https://github.com/adonisjs/adonis-bodyparser/commit/62ff44b))



<a name="1.0.5"></a>
## [1.0.5](https://github.com/adonisjs/adonis-bodyparser/compare/v1.0.4...v1.0.5) (2017-08-02)


### Features

* **exceptions:** use generic-exceptions package ([f4f3fb4](https://github.com/adonisjs/adonis-bodyparser/commit/f4f3fb4))
* **instructions:** add instructions.js and md file ([13ff287](https://github.com/adonisjs/adonis-bodyparser/commit/13ff287))



<a name="1.0.4"></a>
## [1.0.4](https://github.com/adonisjs/adonis-bodyparser/compare/v1.0.3...v1.0.4) (2017-06-23)


### Features

* **file:** add moved method to indicate if file is moved ([beb070e](https://github.com/adonisjs/adonis-bodyparser/commit/beb070e))



<a name="1.0.3"></a>
## [1.0.3](https://github.com/adonisjs/adonis-middleware/compare/v1.0.2...v1.0.3) (2017-06-22)



<a name="1.0.2"></a>
## [1.0.2](https://github.com/adonisjs/adonis-middleware/compare/v1.0.1...v1.0.2) (2017-06-22)


### Bug Fixes

* **provider:** use correct package via [@adonisjs](https://github.com/adonisjs) org ([12757d5](https://github.com/adonisjs/adonis-middleware/commit/12757d5))



<a name="1.0.1"></a>
## [1.0.1](https://github.com/adonisjs/adonis-middleware/compare/v1.0.0...v1.0.1) (2017-06-22)



<a name="1.0.0"></a>
# 1.0.0 (2017-06-13)


### Bug Fixes

* **file:** close fd when used fs.open ([d0c1ac2](https://github.com/adonisjs/adonis-middleware/commit/d0c1ac2))
* **package:** add missing standardjs dependency ([d895b64](https://github.com/adonisjs/adonis-middleware/commit/d895b64))
* **provider:** fix wrong require statement ([db57178](https://github.com/adonisjs/adonis-middleware/commit/db57178))


### Features

* implement body parser ([436bb11](https://github.com/adonisjs/adonis-middleware/commit/436bb11))
* initial commit ([a1a96a1](https://github.com/adonisjs/adonis-middleware/commit/a1a96a1))
* **bodyparser:** handle ignore cases of multipart parsing ([23ed658](https://github.com/adonisjs/adonis-middleware/commit/23ed658))
* **providers:** add provider ([6dee068](https://github.com/adonisjs/adonis-middleware/commit/6dee068))
* **request:** a request macro to access file or files ([4240022](https://github.com/adonisjs/adonis-middleware/commit/4240022))



