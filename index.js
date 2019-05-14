'use strict'

const fp = require('fastify-plugin')
const { format, escape, escapeId } = require('sqlstring')

function activatePool (options, cb) {
  const usePromise = options.promise
  delete options.promise

  const mysql = usePromise ? require('mariadb/promise') : require('mariadb/callback')
  const pool = mysql.createPool(options.connectionString || options)
  const fastifyPool = {
    pool,
    query: pool.query.bind(pool),
    getConnection: pool.getConnection.bind(pool),
    sqlstring: {
      format,
      escape,
      escapeId
    }
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
      fastify.addHook('onClose', () => pool.end())
    } else {
      fastify.addHook('onClose', (fastify, done) => pool.end(done))
    }

    if (name) {
      if (!fastify.mariadb) {
        fastify.decorate('mariadb', {})
      }
      if (fastify.mariadb[name]) {
        return next(new Error('fastify.mariadb.' + name + ' has already been registered'))
      }
      fastify.mariadb[name] = fastifyPool
    } else {
      if (fastify.mariadb) {
        return next(new Error('fastify.mariadb has already been registered'))
      } else {
        fastify.mariadb = fastifyPool
      }
    }

    next()
  })
}

module.exports = fp(fastifyMariadb, {
  fastify: '>=1.x',
  name: 'fastify-mariadb'
})
