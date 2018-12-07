'use strict';

const t = require('tap');
const test = t.test;
const Fastify = require('fastify');
const fastifyMariadb = require('../index');

test('fastify.mariadb namespace should exist', (t) => {
  t.plan(6);

  const fastify = Fastify();
  fastify.register(fastifyMariadb, {
    connectionString: 'mariadb://root@localhost/mysql',
  });

  fastify.ready((err) => {
    t.error(err);
    t.ok(fastify.mariadb);
    t.ok(fastify.mariadb.pool);
    t.ok(fastify.mariadb.query);
    t.ok(fastify.mariadb.getConnection);
    t.ok(fastify.mariadb.sqlstring);
    fastify.close();
  });
});

test('use query util', (t) => {
  t.plan(3);

  const fastify = Fastify();
  fastify.register(fastifyMariadb, {
    connectionString: 'mariadb://root@localhost/mysql',
  });

  fastify.ready((err) => {
    t.error(err);
    fastify.mariadb.query('SELECT NOW()', (err, result) => {
      t.error(err);
      t.ok(result.length);
      fastify.close();
    });
  });
});

test('use getConnection util', (t) => {
  t.plan(7);

  const fastify = Fastify();
  fastify.register(fastifyMariadb, {
    connectionString: 'mariadb://root@localhost/mysql',
    connectionLimit: 5,
  });

  fastify.ready((err) => {
    t.error(err);
    fastify.mariadb.getConnection((err, connection) => {
      t.error(err);
      t.ok(connection);
      connection.query('SELECT 1 AS `ping`', (err, results) => {
        t.error(err);
        t.ok(results[0].ping === 1);
        connection.release();
      });
    });
    // if not call connection.release(), it will block next query
    fastify.mariadb.query('SELECT NOW()', (err, result) => {
      t.error(err);
      t.ok(result.length);
      fastify.close();
    });
  });
});

test('fastify.mariadb.test namespace should exist', (t) => {
  t.plan(6);

  const fastify = Fastify();
  fastify.register(fastifyMariadb, {
    name: 'test',
    connectionString: 'mariadb://root@localhost/mysql',
  });

  fastify.ready((err) => {
    t.error(err);
    t.ok(fastify.mariadb);
    t.ok(fastify.mariadb.test);
    t.ok(fastify.mariadb.test.pool);
    t.ok(fastify.mariadb.test.getConnection);
    t.ok(fastify.mariadb.test.sqlstring);
    fastify.close();
  });
});

test('synchronous functions', (t) => {
  t.plan(4);

  const fastify = Fastify();
  fastify.register(fastifyMariadb, {
    host: 'localhost',
    user: 'root',
    database: 'mysql',
  });

  fastify.ready((err) => {
    t.error(err);
    const { sqlstring } = fastify.mariadb;

    t.is(
      sqlstring.format('SELECT ? AS `now`', [1]),
      'SELECT 1 AS `now`'
    );

    const id = 'userId';
    t.is(
      'SELECT * FROM users WHERE id = ' + sqlstring.escape(id),
      `SELECT * FROM users WHERE id = '${id}'`
    );

    const sorter = 'date';
    t.is(
      'SELECT * FROM posts ORDER BY ' + sqlstring.escapeId('posts.' + sorter),
      'SELECT * FROM posts ORDER BY `posts`.`date`'
    );

    fastify.close();
  });
});
