'use strict';

const fp = require('fastify-plugin');
const { format, escape, escapeId } = require('sqlstring');

function fastifyMariadb(fastify, options, next) {
  const name = options.name;
  delete options.name;

  const usePromise = options.promise;
  delete options.promise;

  const mysql = usePromise ? require('mariadb/promise') : require('mariadb/callback');

  const pool = (options.pool)
    ? options.pool
    : mysql.createPool(options.connectionString || options);

  const db = {
    pool,
    query: pool.query.bind(pool),
    getConnection: pool.getConnection.bind(pool),
    sqlstring: {
      format,
      escape,
      escapeId,
    },
  };

  if (name) {
    if (!fastify.mariadb) {
      fastify.decorate('mariadb', {});
    }
    if (fastify.mariadb[name]) {
      next(new Error('fastify.mariadb.' + name + ' has already registered'));
      return;
    }
    fastify.mariadb[name] = db;
  } else {
    if (fastify.mariadb) {
      return next(new Error('fastify.mariadb has already registered'));
    } else {
      fastify.mariadb = db;
    }
  }

  if (usePromise) {
    fastify.addHook('onClose', (fastify) => pool.end());
  } else {
    fastify.addHook('onClose', (fastify, done) => pool.end(done));
  }

  next();
}

module.exports = fp(fastifyMariadb, {
  fastify: '>=1.x',
  name: 'fastify-mariadb',
});
