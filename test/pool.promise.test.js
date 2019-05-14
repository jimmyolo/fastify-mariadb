'use strict'
const TEST_HOST = process.env.TEST_HOST || 'localhost'
const TEST_PORT = process.env.TEST_PORT || 3306
const TEST_USER = process.env.TEST_USER || 'root'
const TEST_DB = process.env.TEST_DB || 'mysql'

const test = require('tap').test
const Fastify = require('fastify')
const fastifyMariadb = require('../index')

test('fastify.mariadb plugin', (batch) => {
  let fastify = false
  batch.beforeEach((done) => {
    fastify = Fastify()
    fastify.register(fastifyMariadb, {
      promise: true,

      host: TEST_HOST,
      user: TEST_USER,
      database: 'mysql',
      connectionLimit: 5,
      // Compatibility option. causes Promise to return an array object, [rows, metadata].
      // rather than the rows as JSON objects with a meta property.
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
    t.plan(3)
    fastify.ready((err) => {
      t.error(err)
      fastify.mariadb.query('SELECT 1 AS `ping`').then(([results, metadata]) => {
        t.ok(results[0].ping === 1)
        t.ok(metadata)
      })
    })
  })

  batch.test('pool.getConnection', (t) => {
    t.plan(3)
    fastify.ready((err) => {
      t.error(err)
      fastify.mariadb.getConnection().then((connection) => {
        connection.query('SELECT 2 AS `ping`').then(([results]) => {
          t.ok(results[0].ping === 2)
          connection.release()
        })
      })
      fastify.mariadb.query('SELECT 3 AS `ping`').then(([results]) => {
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
      promise: true,
      name: 'test',
      connectionString: `mariadb://${TEST_USER}@${TEST_HOST}:${TEST_PORT}/${TEST_DB}`
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

test('fastify.mariadb should throw has already registered', (t) => {
  t.plan(1)

  const fastify = Fastify()
  fastify
    .register(fastifyMariadb, {
      promise: true,
      connectionString: `mariadb://${TEST_USER}@${TEST_HOST}:${TEST_PORT}/${TEST_DB}`
    })
    .register(fastifyMariadb, {
      promise: true,
      connectionString: `mariadb://${TEST_USER}@${TEST_HOST}:${TEST_PORT}/${TEST_DB}`
    })

  fastify.ready((err) => {
    t.is(err.message, 'fastify.mariadb has already registered')
    fastify.close()
  })
})

test('fastify.mariadb.test should throw has already registered', (t) => {
  t.plan(1)

  const fastify = Fastify()
  fastify
    .register(fastifyMariadb, {
      promise: true,
      name: 'test',
      connectionString: `mariadb://${TEST_USER}@${TEST_HOST}:${TEST_PORT}/${TEST_DB}`
    })
    .register(fastifyMariadb, {
      promise: true,
      name: 'test',
      connectionString: `mariadb://${TEST_USER}@${TEST_HOST}:${TEST_PORT}/${TEST_DB}`
    })

  fastify.ready((err) => {
    t.is(err.message, 'fastify.mariadb.test has already registered')
    fastify.close()
  })
})
