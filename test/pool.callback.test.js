'use strict'
const DB_HOST = process.env.DB_HOST || 'localhost'
const DB_PORT = process.env.DB_PORT || 3306
const DB_USER = process.env.DB_USER || 'root'
const DB_DB = process.env.DB_DB || 'mysql'

const test = require('node:test')
const assert = require('node:assert/strict')
const Fastify = require('fastify')
const fastifyMariadb = require('../index')

const registerCallbackPlugin = async (extraOptions = {}) => {
  const fastify = Fastify()
  fastify.register(fastifyMariadb, {
    host: DB_HOST,
    user: DB_USER,
    database: 'mysql',
    connectionLimit: 5,
    ...extraOptions
  })
  await fastify.ready()
  return fastify
}

const queryCallback = (target, sql, values) => new Promise((resolve, reject) => {
  const cb = (err, results, metadata) => {
    if (err) return reject(err)
    resolve({ results, metadata })
  }

  if (typeof values === 'undefined') {
    target.query(sql, cb)
    return
  }

  target.query(sql, values, cb)
})

const getConnection = (pool) => new Promise((resolve, reject) => {
  pool.getConnection((err, connection) => {
    if (err) return reject(err)
    resolve(connection)
  })
})

test('fastify.mariadb namespace should exist', async () => {
  const fastify = await registerCallbackPlugin()
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

test('mariadb.pool.query (callback)', async () => {
  const fastify = await registerCallbackPlugin()
  try {
    const { results, metadata } = await queryCallback(
      fastify.mariadb,
      'SELECT 1 AS `ping`'
    )
    assert.equal(results[0].ping, 1)
    assert.ok(metadata)
  } finally {
    await fastify.close()
  }
})

test('pool.getConnection (callback)', async () => {
  const fastify = await registerCallbackPlugin()
  try {
    const connection = await getConnection(fastify.mariadb)
    const { results } = await queryCallback(
      connection,
      'SELECT 2 AS `ping`'
    )
    assert.equal(results[0].ping, 2)
    connection.release()

    const { results: otherResults } = await queryCallback(
      fastify.mariadb,
      'SELECT 3 AS `ping`'
    )
    assert.equal(otherResults[0].ping, 3)
  } finally {
    await fastify.close()
  }
})

test('synchronous sqlstring utils', async () => {
  const fastify = await registerCallbackPlugin()
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
      connectionString: `mariadb://${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_DB}`
    })
    .register(fastifyMariadb, {
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
      name: 'test',
      connectionString: `mariadb://${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_DB}`
    })
    .register(fastifyMariadb, {
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
    connectionString: `mariadb://${invalidUser}@${DB_HOST}:${DB_PORT}/${DB_DB}`
  })

  try {
    await assert.rejects(fastify.ready())
  } finally {
    await fastify.close()
  }
})
