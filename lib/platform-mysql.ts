import mysql from 'mysql2/promise'

interface PlatformMySQLConfig {
  host: string
  port: number
  user: string
  password: string
  database: string
  connectionLimit: number
  queueLimit: number
}

// 平台数据库连接池
let platformPool: mysql.Pool | null = null

// 获取平台数据库配置
function getPlatformMySQLConfig(): PlatformMySQLConfig {
  return {
    host: process.env.PLATFORM_DB_HOST || '100.72.60.117',
    port: parseInt(process.env.PLATFORM_DB_PORT || '3306'),
    user: process.env.PLATFORM_DB_USER || 'root',
    password: process.env.PLATFORM_DB_PASSWORD || '',
    database: process.env.PLATFORM_DB_DATABASE || 'gerenuk_platform',
    connectionLimit: parseInt(process.env.PLATFORM_DB_CONNECTION_LIMIT || '10'),
    queueLimit: parseInt(process.env.PLATFORM_DB_QUEUE_LIMIT || '0')
  }
}

// 创建平台数据库连接池
export function createPlatformPool(): mysql.Pool {
  if (!platformPool) {
    const config = getPlatformMySQLConfig()
    platformPool = mysql.createPool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      connectionLimit: config.connectionLimit,
      queueLimit: config.queueLimit,
      charset: 'utf8mb4',
      multipleStatements: false,
      typeCast: function (field, next) {
        // 处理 TINYINT(1) 作为布尔值
        if (field.type === 'TINY' && field.length === 1) {
          return field.string() === '1'
        }
        return next()
      }
    })
    
    console.log('平台数据库 MySQL 连接池已创建')
  }
  return platformPool
}

// 获取平台数据库连接
export async function getPlatformConnection(): Promise<mysql.PoolConnection> {
  const pool = createPlatformPool()
  return await pool.getConnection()
}

// 执行平台数据库查询
export async function executePlatformQuery<T = any>(
  sql: string, 
  params: any[] = []
): Promise<T[]> {
  const connection = await getPlatformConnection()
  try {
    // 确保参数是正确的类型，特别是数字参数
    const processedParams = params.map(param => {
      if (typeof param === 'string' && !isNaN(Number(param))) {
        return Number(param)
      }
      return param
    })
    
    const [rows] = await connection.execute(sql, processedParams)
    return rows as T[]
  } finally {
    connection.release()
  }
}

// 执行平台数据库事务
export async function executePlatformTransaction(
  queries: Array<{ sql: string; params: any[] }>
): Promise<void> {
  const connection = await getPlatformConnection()
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

// 测试平台数据库连接
export async function testPlatformConnection(): Promise<boolean> {
  try {
    const connection = await getPlatformConnection()
    await connection.ping()
    connection.release()
    console.log('平台数据库 MySQL 连接测试成功')
    return true
  } catch (error) {
    console.error('平台数据库 MySQL 连接测试失败:', error)
    return false
  }
}

// 关闭平台数据库连接池
export async function closePlatformPool(): Promise<void> {
  if (platformPool) {
    await platformPool.end()
    platformPool = null
    console.log('平台数据库 MySQL 连接池已关闭')
  }
}

// 获取 MySQL 连接用于迁移脚本
export async function createMigrationConnection(): Promise<mysql.Connection> {
  const config = getPlatformMySQLConfig()
  return await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    // 注意：不指定 database，用于创建数据库
    charset: 'utf8mb4',
    multipleStatements: true
  })
}

// 获取带数据库的连接
export async function createPlatformConnection(): Promise<mysql.Connection> {
  const config = getPlatformMySQLConfig()
  return await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    charset: 'utf8mb4',
    multipleStatements: true
  })
}