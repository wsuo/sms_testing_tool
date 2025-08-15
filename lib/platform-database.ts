import { executePlatformQuery, executePlatformTransaction, createPlatformPool } from './platform-mysql'
import mysql from 'mysql2/promise'

// 基础数据库操作类，提供与 better-sqlite3 类似的 API
export class MySQLDatabase {
  private pool: mysql.Pool
  
  constructor() {
    this.pool = createPlatformPool()
  }
  
  // 模拟 better-sqlite3 的 prepare().get() 方法
  async prepare(sql: string) {
    return {
      get: async (...params: any[]) => {
        const results = await executePlatformQuery(sql, params)
        return results[0] || null
      },
      all: async (...params: any[]) => {
        return await executePlatformQuery(sql, params)
      },
      run: async (...params: any[]) => {
        const connection = await this.pool.getConnection()
        try {
          const [result] = await connection.execute(sql, params)
          return {
            changes: (result as any).affectedRows || 0,
            lastInsertRowid: (result as any).insertId || 0,
            lastInsertId: (result as any).insertId || 0
          }
        } finally {
          connection.release()
        }
      }
    }
  }
  
  // 执行原始 SQL
  async exec(sql: string) {
    const connection = await this.pool.getConnection()
    try {
      await connection.execute(sql)
    } finally {
      connection.release()
    }
  }
  
  // 执行事务
  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    const connection = await this.pool.getConnection()
    try {
      await connection.beginTransaction()
      const result = await fn()
      await connection.commit()
      return result
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }
  
  // 关闭连接
  async close() {
    await this.pool.end()
  }
  
  // 兼容 SQLite 的 pragma 查询（转换为 MySQL 的信息模式查询）
  async pragma(command: string) {
    if (command.startsWith('table_info(')) {
      const tableName = command.match(/table_info\\((.+)\\)/)?.[1] || ''
      const sql = `
        SELECT 
          COLUMN_NAME as name,
          DATA_TYPE as type,
          IS_NULLABLE as \`notnull\`,
          COLUMN_DEFAULT as dflt_value,
          CASE WHEN COLUMN_KEY = 'PRI' THEN 1 ELSE 0 END as pk
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION
      `
      return await executePlatformQuery(sql, [tableName])
    }
    return []
  }
}

// 全局 MySQL 数据库实例
let mysqlDb: MySQLDatabase | null = null

export function getPlatformDatabase(): MySQLDatabase {
  if (!mysqlDb) {
    mysqlDb = new MySQLDatabase()
    console.log('Platform MySQL database initialized')
  }
  return mysqlDb
}

// 兼容 SQLite 的日期时间函数转换
export function convertSQLiteDateToMySQL(sqliteQuery: string): string {
  let mysqlQuery = sqliteQuery
  
  // 转换日期时间函数
  mysqlQuery = mysqlQuery.replace(/date\\('now'\\)/g, 'CURDATE()')
  mysqlQuery = mysqlQuery.replace(/datetime\\('now'\\)/g, 'NOW()')
  
  // 转换日期时间计算
  mysqlQuery = mysqlQuery.replace(/datetime\\('now',\\s*'(-?\\d+)\\s*days?'\\)/g, 'DATE_SUB(NOW(), INTERVAL $1 DAY)')
  mysqlQuery = mysqlQuery.replace(/datetime\\('now',\\s*'-?(\\d+)\\s*minutes?'\\)/g, 'DATE_SUB(NOW(), INTERVAL $1 MINUTE)')
  mysqlQuery = mysqlQuery.replace(/datetime\\('now',\\s*'-?(\\d+)\\s*hours?'\\)/g, 'DATE_SUB(NOW(), INTERVAL $1 HOUR)')
  
  // 转换日期比较
  mysqlQuery = mysqlQuery.replace(/date\\(([^)]+)\\)\\s*=\\s*date\\('now'\\)/g, 'DATE($1) = CURDATE()')
  
  // 转换随机函数
  mysqlQuery = mysqlQuery.replace(/RANDOM\\(\\)/g, 'RAND()')
  
  // 转换 CURRENT_TIMESTAMP
  mysqlQuery = mysqlQuery.replace(/CURRENT_TIMESTAMP/g, 'CURRENT_TIMESTAMP')
  
  // 转换 ON CONFLICT 语法
  mysqlQuery = mysqlQuery.replace(
    /INSERT\\s+INTO\\s+([^\\s]+)\\s*\\(([^)]+)\\)\\s*VALUES\\s*\\(([^)]+)\\)\\s*ON\\s+CONFLICT\\s*\\(([^)]+)\\)\\s*DO\\s+UPDATE\\s+SET\\s+(.+)/gi,
    'INSERT INTO $1 ($2) VALUES ($3) ON DUPLICATE KEY UPDATE $5'
  )
  
  return mysqlQuery
}

// 处理 MySQL 特殊的 SQL 语法
export function prepareMySQLQuery(sql: string, params: any[] = []): { sql: string; params: any[] } {
  let processedSQL = convertSQLiteDateToMySQL(sql)
  let processedParams = [...params]
  
  // 处理批量插入的占位符
  if (processedSQL.includes('VALUES ?') && params.length === 1 && Array.isArray(params[0])) {
    const valuesCount = params[0].length
    const placeholderCount = params[0][0]?.length || 0
    const placeholders = Array(valuesCount)
      .fill(`(${Array(placeholderCount).fill('?').join(', ')})`)
      .join(', ')
    
    processedSQL = processedSQL.replace('VALUES ?', `VALUES ${placeholders}`)
    processedParams = params[0].flat()
  }
  
  return { sql: processedSQL, params: processedParams }
}

// 执行兼容 SQLite 语法的查询
export async function executeCompatibleQuery<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const { sql: processedSQL, params: processedParams } = prepareMySQLQuery(sql, params)
  return await executePlatformQuery<T>(processedSQL, processedParams)
}

// 执行兼容 SQLite 语法的单个查询
export async function executeCompatibleSingle<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const results = await executeCompatibleQuery<T>(sql, params)
  return results[0] || null
}

// 执行兼容 SQLite 语法的插入/更新/删除操作
export async function executeCompatibleRun(sql: string, params: any[] = []) {
  const { sql: processedSQL, params: processedParams } = prepareMySQLQuery(sql, params)
  const connection = await createPlatformPool().getConnection()
  
  try {
    const [result] = await connection.execute(processedSQL, processedParams)
    return {
      changes: (result as any).affectedRows || 0,
      lastInsertRowid: (result as any).insertId || 0,
      lastInsertId: (result as any).insertId || 0
    }
  } finally {
    connection.release()
  }
}