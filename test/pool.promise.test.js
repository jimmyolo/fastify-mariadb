'use strict'
const DB_HOST = process.env.DB_HOST || 'localhost'
const DB_PORT = process.env.DB_PORT || 3306
const DB_USER = process.env.DB_USER || 'root'
const DB_DB = process.env.DB_DB || 'mysql'

const test = require('node:test')
const assert = require('node:assert/strict')
const Fastify = require('fastify')
const fastifyMariadb = require('../index')

const registerPromisePlugin = async (extraOptions = {}) => {
  const fastify = Fastify()
  fastify.register(fastifyMariadb, {
    promise: true,
    host: DB_HOST,
    user: DB_USER,
    database: 'mysql',
    connectionLimit: 5,
    metaAsArray: true,
    ...extraOptions
  })
  await fastify.ready()
  return fastify
}

test('fastify.mariadb namespace should exist', async () => {
  const fastify = await registerPromisePlugin()
  try {
    assert.ok(fastify.mariadb)
    assert.ok(fastify.mariadb.pool)
    assert.ok(fastify.mariadb.query)
    assert.ok(fastify.mariadb.getConnection)
    assert.ok(fastify.mariadb.sqlstring)
  } finally {
    await fastify.close()
  }
})

test('mariadb.pool.query (promise)', async () => {
  const fastify = await registerPromisePlugin()
  try {
    const [results, metadata] = await fastify.mariadb.query('SELECT 1 AS `ping`')
    assert.equal(results[0].ping, 1)
    assert.ok(metadata)
  } finally {
    await fastify.close()
  }
})

test('pool.getConnection (promise)', async () => {
  const fastify = await registerPromisePlugin()
  try {
    const connection = await fastify.mariadb.getConnection()
    const [results] = await connection.query('SELECT 2 AS `ping`')
    assert.equal(results[0].ping, 2)
    connection.release()

    const [otherResults] = await fastify.mariadb.query('SELECT 3 AS `ping`')
    assert.equal(otherResults[0].ping, 3)
  } finally {
    await fastify.close()
  }
})

test('synchronous sqlstring utils', async () => {
  const fastify = await registerPromisePlugin()
  try {
    const sqlstring = fastify.mariadb.sqlstring

    assert.equal(
      sqlstring.format('SELECT ? AS `now`', [1]),
      'SELECT 1 AS `now`'
    )

    const id = 'userId'
    assert.equal(
      'SELECT * FROM users WHERE id = ' + sqlstring.escape(id),
      `SELECT * FROM users WHERE id = '${id}'`
    )

    const sorter = 'date'
    assert.equal(
      'SELECT * FROM posts ORDER BY ' + sqlstring.escapeId('posts.' + sorter),
      'SELECT * FROM posts ORDER BY `posts`.`date`'
    )
  } finally {
    await fastify.close()
  }
})

test('fastify.mariadb.test namespace should exist', async () => {
  const fastify = Fastify()
  fastify.register(fastifyMariadb, {
    promise: true,
    name: 'test',
    connectionString: `mariadb://${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_DB}`
  })

  try {
    await fastify.ready()
    assert.ok(fastify.mariadb)
    assert.ok(fastify.mariadb.test)
    assert.ok(fastify.mariadb.test.pool)
    assert.ok(fastify.mariadb.test.query)
    assert.ok(fastify.mariadb.test.execute)
    assert.ok(fastify.mariadb.test.getConnection)
    assert.ok(fastify.mariadb.test.sqlstring)
  } finally {
    await fastify.close()
  }
})

test('fastify.mariadb should throw has already been registered', async () => {
  const fastify = Fastify()
  fastify
    .register(fastifyMariadb, {
      promise: true,
      connectionString: `mariadb://${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_DB}`
    })
    .register(fastifyMariadb, {
      promise: true,
      connectionString: `mariadb://${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_DB}`
    })

  try {
    await assert.rejects(
      fastify.ready(),
      { message: 'fastify.mariadb has already been registered' }
    )
  } finally {
    await fastify.close()
  }
})

test('fastify.mariadb.test should throw has already been registered', async () => {
  const fastify = Fastify()
  fastify
    .register(fastifyMariadb, {
      promise: true,
      name: 'test',
      connectionString: `mariadb://${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_DB}`
    })
    .register(fastifyMariadb, {
      promise: true,
      name: 'test',
      connectionString: `mariadb://${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_DB}`
    })

  try {
    await assert.rejects(
      fastify.ready(),
      { message: 'fastify.mariadb.test has already been registered' }
    )
  } finally {
    await fastify.close()
  }
})

test('should throw error when initial fail', async () => {
  const fastify = Fastify()
  const invalidUser = 'invalid'

  fastify.register(fastifyMariadb, {
    promise: true,
    connectionString: `mariadb://${invalidUser}@${DB_HOST}:${DB_PORT}/${DB_DB}`
  })

  try {
    await assert.rejects(fastify.ready())
  } finally {
    await fastify.close()
  }
})
