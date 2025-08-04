import mysql from 'mysql2/promise'

interface MySQLConfig {
  host: string
  port: number
  user: string
  password: string
  database: string
  connectionLimit: number
  queueLimit: number
}

// 数据库连接池
let pool: mysql.Pool | null = null

// 获取数据库配置
function getMySQLConfig(): MySQLConfig {
  return {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'agrochain_seller',
    connectionLimit: parseInt(process.env.MYSQL_CONNECTION_LIMIT || '10'),
    queueLimit: parseInt(process.env.MYSQL_QUEUE_LIMIT || '0')
  }
}

// 创建连接池
export function createPool(): mysql.Pool {
  if (!pool) {
    const config = getMySQLConfig()
    pool = mysql.createPool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      connectionLimit: config.connectionLimit,
      queueLimit: config.queueLimit,
      acquireTimeout: 60000,
      timeout: 60000,
      reconnect: true,
      charset: 'utf8mb4'
    })
    
    console.log('MySQL连接池已创建')
  }
  return pool
}

// 获取数据库连接
export async function getConnection(): Promise<mysql.PoolConnection> {
  const pool = createPool()
  return await pool.getConnection()
}

// 执行查询
export async function executeQuery<T = any>(
  sql: string, 
  params: any[] = []
): Promise<T[]> {
  const connection = await getConnection()
  try {
    const [rows] = await connection.execute(sql, params)
    return rows as T[]
  } finally {
    connection.release()
  }
}

// 执行事务
export async function executeTransaction(
  queries: Array<{ sql: string; params: any[] }>
): Promise<void> {
  const connection = await getConnection()
  try {
    await connection.beginTransaction()
    
    for (const query of queries) {
      await connection.execute(query.sql, query.params)
    }
    
    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

// 测试数据库连接
export async function testConnection(): Promise<boolean> {
  try {
    const connection = await getConnection()
    await connection.ping()
    connection.release()
    console.log('MySQL数据库连接测试成功')
    return true
  } catch (error) {
    console.error('MySQL数据库连接测试失败:', error)
    return false
  }
}

// 关闭连接池
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
    console.log('MySQL连接池已关闭')
  }
}
