import { FastifyPluginCallback } from 'fastify'
import sqlstring from 'sqlstring'
import { Pool as PromisePool, PoolConfig } from 'mariadb'
import { createPool } from 'mariadb/callback'
type CallbackPool = ReturnType<typeof createPool>

declare module 'fastify' {
  interface FastifyInstance {
    mariadb: (fastifyMariadb.MariadbPromisePool | fastifyMariadb.MariadbCallbackPool) & {
      [name: string]: (fastifyMariadb.MariadbPromisePool | fastifyMariadb.MariadbCallbackPool)
    }
  }
}

type FastifyMariadbPlugin = FastifyPluginCallback<fastifyMariadb.MariadbOptions>

declare namespace fastifyMariadb {

  export interface SqlString {
    format: typeof sqlstring.format
    escape: typeof sqlstring.escape
    escapeId: typeof sqlstring.escapeId
    raw: typeof sqlstring.raw
  }

  export type MariadbPromisePool = Pick<PromisePool, 'query' | 'execute' | 'getConnection'> & {
    pool: PromisePool
    sqlstring: SqlString
  }

  export type MariadbCallbackPool = Pick<CallbackPool, 'query' | 'execute' | 'getConnection'> & {
    pool: CallbackPool
    sqlstring: SqlString
  }

  export interface MariadbOptions extends PoolConfig {
    name?: string
    promise?: boolean
    connectionString?: string
  }

  export const fastifyMariadb: FastifyMariadbPlugin
  export { fastifyMariadb as default } 
}

declare function fastifyMariadb(...params: Parameters<FastifyMariadbPlugin>): ReturnType<FastifyMariadbPlugin>
export = fastifyMariadb
