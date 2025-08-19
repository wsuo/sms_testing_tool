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
    connectionLimit: parseInt(process.env.PLATFORM_DB_CONNECTION_LIMIT || '5'), // 降低连接数
    queueLimit: parseInt(process.env.PLATFORM_DB_QUEUE_LIMIT || '10') // 增加队列限制
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
    
    // 监听连接池事件
    platformPool.on('connection', (connection) => {
      console.log('MySQL 连接创建, ID:', connection.threadId)
    })
    
    platformPool.on('error', (err) => {
      console.error('MySQL 连接池错误:', err)
      if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        // 连接丢失，重新创建连接池
        platformPool = null
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
  let connection: mysql.PoolConnection | null = null
  let retries = 3
  
  while (retries > 0) {
    try {
      connection = await getPlatformConnection()
      
      // 确保参数是正确的类型，特别是数字参数
      const processedParams = params.map(param => {
        if (typeof param === 'string' && !isNaN(Number(param))) {
          return Number(param)
        }
        return param
      })
      
      const [rows] = await connection.execute(sql, processedParams)
      return rows as T[]
    } catch (error: any) {
      console.error(`执行SQL查询失败 (剩余重试次数: ${retries - 1}):`, error.message)
      
      if (error.code === 'ER_CON_COUNT_ERROR' && retries > 1) {
        // 连接数过多，等待后重试
        await new Promise(resolve => setTimeout(resolve, 1000))
        retries--
        continue
      } else if (error.code === 'PROTOCOL_CONNECTION_LOST' && retries > 1) {
        // 连接丢失，重新创建连接池
        platformPool = null
        retries--
        continue
      } else {
        throw error
      }
    } finally {
      if (connection) {
        try {
          connection.release()
        } catch (releaseError) {
          console.error('释放连接失败:', releaseError)
        }
      }
    }
  }
  
  throw new Error('查询失败，已用尽所有重试次数')
}

// 执行平台数据库事务
export async function executePlatformTransaction(
  queries: Array<{ sql: string; params: any[] }>
): Promise<void> {
  let connection: mysql.PoolConnection | null = null
  let retries = 3
  
  while (retries > 0) {
    try {
      connection = await getPlatformConnection()
      await connection.beginTransaction()
      
      for (const query of queries) {
        await connection.execute(query.sql, query.params)
      }
      
      await connection.commit()
      return
    } catch (error: any) {
      console.error(`执行事务失败 (剩余重试次数: ${retries - 1}):`, error.message)
      
      if (connection) {
        try {
          await connection.rollback()
        } catch (rollbackError) {
          console.error('事务回滚失败:', rollbackError)
        }
      }
      
      if (error.code === 'ER_CON_COUNT_ERROR' && retries > 1) {
        // 连接数过多，等待后重试
        await new Promise(resolve => setTimeout(resolve, 1000))
        retries--
        continue
      } else if (error.code === 'PROTOCOL_CONNECTION_LOST' && retries > 1) {
        // 连接丢失，重新创建连接池
        platformPool = null
        retries--
        continue
      } else {
        throw error
      }
    } finally {
      if (connection) {
        try {
          connection.release()
        } catch (releaseError) {
          console.error('释放连接失败:', releaseError)
        }
      }
    }
  }
  
  throw new Error('事务执行失败，已用尽所有重试次数')
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

// 获取连接池状态
export function getPlatformPoolStatus(): {
  totalConnections: number
  allConnections: number
  freeConnections: number
  queuedRequests: number
} | null {
  if (!platformPool) {
    return null
  }
  
  try {
    // 访问连接池的内部状态（这些属性在 mysql2 中可用）
    const pool = platformPool as any
    
    // 确保连接池已正确初始化
    if (!pool._allConnections) {
      console.log('连接池内部状态未初始化')
      return {
        totalConnections: 0,
        allConnections: 0,
        freeConnections: 0,
        queuedRequests: 0
      }
    }
    
    const status = {
      totalConnections: pool._allConnections?.length || 0,
      allConnections: pool._allConnections?.length || 0,
      freeConnections: pool._freeConnections?.length || 0,
      queuedRequests: pool._connectionQueue?.length || 0
    }
    
    console.log('连接池状态:', status)
    return status
  } catch (error) {
    console.error('获取连接池状态失败:', error)
    return {
      totalConnections: 0,
      allConnections: 0,
      freeConnections: 0,
      queuedRequests: 0
    }
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