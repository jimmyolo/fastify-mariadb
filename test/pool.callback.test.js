'use strict'
const DB_HOST = process.env.DB_HOST || 'localhost'
const DB_PORT = process.env.DB_PORT || 3306
const DB_USER = process.env.DB_USER || 'root'
const DB_DB = process.env.DB_DB || 'mysql'

const test = require('tap').test
const Fastify = require('fastify')
const fastifyMariadb = require('../index')

test('fastify.mariadb plugin', (batch) => {
  let fastify = false
  batch.beforeEach((done) => {
    fastify = Fastify()
    fastify.register(fastifyMariadb, {
      host: DB_HOST,
      user: DB_USER,
      database: 'mysql',
      connectionLimit: 5,

      metaAsArray: true
    })
    done()
  })

  batch.afterEach((done) => {
    fastify.close()
    fastify = null
    done()
  })

  batch.test('fastify.mariadb namespace should exist', (t) => {
    t.plan(6)
    fastify.ready((err) => {
      t.error(err)
      t.ok(fastify.mariadb)
      t.ok(fastify.mariadb.pool)
      t.ok(fastify.mariadb.query)
      t.ok(fastify.mariadb.getConnection)
      t.ok(fastify.mariadb.sqlstring)
    })
  })

  batch.test('mariadb.pool.query', (t) => {
    t.plan(4)
    fastify.ready((err) => {
      t.error(err)
      fastify.mariadb.query('SELECT 1 AS `ping`', (err, [results, metadata]) => {
        t.error(err)
        t.ok(results[0].ping === 1)
        t.ok(metadata)
      })
    })
  })

  batch.test('pool.getConnection', (t) => {
    t.plan(6)
    fastify.ready((err) => {
      t.error(err)
      fastify.mariadb.getConnection((err, connection) => {
        t.error(err)
        connection.query('SELECT 2 AS `ping`', (err, [results]) => {
          t.error(err)
          t.ok(results[0].ping === 2)
          connection.release()
        })
      })
      fastify.mariadb.query('SELECT 3 AS `ping`', (err, [results]) => {
        t.error(err)
        t.ok(results[0].ping === 3)
      })
    })
  })

  batch.test('synchronous sqlstring utils', (t) => {
    t.plan(4)
    fastify.ready((err) => {
      t.error(err)
      const sqlstring = fastify.mariadb.sqlstring

      t.is(
        sqlstring.format('SELECT ? AS `now`', [1]),
        'SELECT 1 AS `now`'
      )

      const id = 'userId'
      t.is(
        'SELECT * FROM users WHERE id = ' + sqlstring.escape(id),
        `SELECT * FROM users WHERE id = '${id}'`
      )

      const sorter = 'date'
      t.is(
        'SELECT * FROM posts ORDER BY ' + sqlstring.escapeId('posts.' + sorter),
        'SELECT * FROM posts ORDER BY `posts`.`date`'
      )
    })
  })

  batch.end()
})

test('fastify.mariadb.test namespace should exist', (t) => {
  t.plan(6)

  const fastify = Fastify()
  fastify
    .register(fastifyMariadb, {
      name: 'test',
      connectionString: `mariadb://${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_DB}`
    })

  fastify.ready((err) => {
    t.error(err)
    t.ok(fastify.mariadb)
    t.ok(fastify.mariadb.test)
    t.ok(fastify.mariadb.test.pool)
    t.ok(fastify.mariadb.test.getConnection)
    t.ok(fastify.mariadb.test.sqlstring)
    fastify.close()
  })
})

test('fastify.mariadb should throw has already been registered', (t) => {
  t.plan(1)

  const fastify = Fastify()
  fastify
    .register(fastifyMariadb, {
      connectionString: `mariadb://${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_DB}`
    })
    .register(fastifyMariadb, {
      connectionString: `mariadb://${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_DB}`
    })

  fastify.ready((err) => {
    t.is(err.message, 'fastify.mariadb has already been registered')
    fastify.close()
  })
})

test('fastify.mariadb.test should throw has already been registered', (t) => {
  t.plan(1)

  const fastify = Fastify()
  fastify
    .register(fastifyMariadb, {
      name: 'test',
      connectionString: `mariadb://${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_DB}`
    })
    .register(fastifyMariadb, {
      name: 'test',
      connectionString: `mariadb://${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_DB}`
    })

  fastify.ready((err) => {
    t.is(err.message, 'fastify.mariadb.test has already been registered')
    fastify.close()
  })
})

test('should throw error when initial fail', (t) => {
  t.plan(1)

  const fastify = Fastify()
  const invalidUser = 'invalid'

  fastify
    .register(fastifyMariadb, {
      connectionString: `mariadb://${invalidUser}@${DB_HOST}:${DB_PORT}/${DB_DB}`
    })

  fastify.ready((err) => {
    t.ok(err)
    fastify.close()
  })
})
