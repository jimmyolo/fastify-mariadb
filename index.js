'use strict'

const fp = require('fastify-plugin')
const sqlstring = require('sqlstring')

function activatePool (options, cb) {
  const usePromise = options.promise
  delete options.promise

  const mariadb = usePromise ? require('mariadb/promise') : require('mariadb/callback')
  const pool = mariadb.createPool(options.connectionString || options)
  const fastifyPool = {
    pool,
    sqlstring,
    query: pool.query.bind(pool),
    execute: pool.execute.bind(pool),
    getConnection: pool.getConnection.bind(pool)
  }
  if (usePromise) {
    pool.query('select 1')
      .then(() => cb(null, fastifyPool))
      .catch((err) => cb(err, null))
  } else {
    pool.query('select 1', (err) => cb(err, fastifyPool))
  }
}

function fastifyMariadb (fastify, options, next) {
  const name = options.name
  delete options.name

  const usePromise = options.promise

  activatePool(options, (err, fastifyPool) => {
    if (err) return next(err)

    const pool = fastifyPool.pool

    if (usePromise) {
      fastify.addHook('onClose', (fastify, done) => pool.end().then(done).catch(done))
    } else {
      fastify.addHook('onClose', (fastify, done) => pool.end(done))
    }

    if (name) {
      if (!fastify.mariadb) {
        fastify.decorate('mariadb', {})
      }
      if (fastify.mariadb[name]) {
        return next(new Error(`fastify.mariadb.${name} has already been registered`))
      }
      fastify.mariadb[name] = fastifyPool
    } else {
      if (fastify.mariadb) {
        return next(new Error('fastify.mariadb has already been registered'))
      }
    }

    if (!fastify.mariadb) {
      fastify.decorate('mariadb', fastifyPool)
    }

    next()
  })
}

module.exports = fp(fastifyMariadb, {
  fastify: '4.x',
  name: 'fastify-mariadb'
})
module.exports.default = fastifyMariadb
module.exports.fastifyMariadb = fastifyMariadb
