# Fastify MariaDB Pool plugin

[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](http://standardjs.com/)
![CI](https://github.com/victor0801x/fastify-mariadb/workflows/CI/badge.svg)
[![npm version](https://img.shields.io/npm/v/fastify-mariadb.svg?style=flat)](https://www.npmjs.com/package/fastify-mariadb)
[![npm downloads](https://img.shields.io/npm/dm/fastify-mariadb.svg?style=flat)](https://www.npmjs.com/package/fastify-mariadb)
<!-- [![Known Vulnerabilities](https://snyk.io/test/github/victor0801x/fastify-mariadb/badge.svg?targetFile=package.json&style=flat)](https://snyk.io/test/github/victor0801x/fastify-mariadb?targetFile=package.json) -->
<!-- [![codecov](https://codecov.io/gh/victor0801x/fastify-mariadb/branch/master/graph/badge.svg?style=flat)](https://codecov.io/gh/victor0801x/fastify-mariadb) -->
<!--[![Greenkeeper badge](https://badges.greenkeeper.io/victor0801x/fastify-mariadb.svg?style=flat)](https://greenkeeper.io/)-->

Fastify MariaDB **connection Pool** plugin, with this you can share the same MariaDB connection pool in every part of your server.

Under the hood the official [MariaDB Node.js connector](https://github.com/MariaDB/mariadb-connector-nodejs) is used, the options that you pass to `register` will be passed to the MariaDB pool builder.

**Note: start v2.x required Node.js 10+**

## Install

```
npm install fastify-mariadb --save
```

## Usage

Add it to your project with `register` and you are done!
This plugin will add the `mariadb` namespace in your Fastify instance, with the following properties:

```
pool: the pool instance
query: an utility to perform a query without a transaction
getConnection: get a connection from the pool
```

Example:
```js
const fastify = require('fastify')()

fastify.register(require('fastify-mariadb'), {
  host: 'localhost',
  user: 'root',
  database: 'mysql',
  connectionLimit: 5
})

fastify.get('/user/:id', (req, reply) => {
  // `pool.getConnection` -> `conn.query` -> `conn.release`
  fastify.mariadb.getConnection((err, conn) => {
    if (err) return reply.send(err)
    conn.query('SELECT username FROM users WHERE id=?', [req.params.id], (err, result) => {
      conn.release()
      reply.send(err || result)
    })
  })
})

fastify.get('/mariadb/time', (req, reply) => {
  // `pool.query`
  fastify.mariadb.query('SELECT now()', (err, result) => {
    reply.send(err || result)
  })
})

fastify.listen(3000, (err) => {
  if (err) throw err
  console.log(`server listening on ${fastify.server.address().port}`)
})
```
As you can see there is no need to close the client, since is done internally.

Async await is supported, when register `promise` option is `true`:
```js
const fastify = require('fastify')()

fastify.register(require('fastify-mariadb'), {
  promise: true,
  connectionString: 'mariadb://root@localhost/mysql'
})

fastify.get('/user/:id', async (req, reply) => {
  const mariadb = fastify.mariadb
  const connection = await mariadb.getConnection()
  const result = await mariadb.query('SELECT username FROM users WHERE id=?', [req.params.id])
  connection.release()
  return result[0]
})

fastify.listen(3000, (err) => {
  if (err) throw err
  console.log(`server listening on ${fastify.server.address().port}`)
})
```

## options

* `promise` - `Boolean` (optional, if not present will use `callback` style pool)
* `connectionString` - `String` (optional, url string) For example: `mariadb://user:pass@host/db?debug=true`
* `Pool options` - [Pool options](https://github.com/MariaDB/mariadb-connector-nodejs/blob/master/documentation/promise-api.md#pool-options) includes `connection options` that will be used when creating new connections.

`MariaDB connector/Node.js` most options are similar to `mysql/mysql2` driver with more features and performant.
More usage, please see [mariadb-connector-nodejs](https://github.com/MariaDB/mariadb-connector-nodejs)
  * [`Promise API`](https://github.com/MariaDB/mariadb-connector-nodejs/blob/master/documentation/promise-api.md#promise-api)
  * [`Callback API`](https://github.com/MariaDB/mariadb-connector-nodejs/blob/master/documentation/callback-api.md#callback-api)

## Acknowledgements

- Most of codes are copied from [fastify-mysql](https://github.com/fastify/fastify-mysql).


## License

Licensed under [MIT](./LICENSE).
