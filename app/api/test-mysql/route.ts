import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    // 检查环境变量
    const config = {
      host: process.env.MYSQL_HOST,
      port: process.env.MYSQL_PORT,
      database: process.env.MYSQL_DATABASE,
      user: process.env.MYSQL_USER
    }

    // 加载mysql2模块
    let mysql
    try {
      mysql = require('mysql2/promise')
    } catch (importError) {
      return NextResponse.json({
        success: false,
        error: 'mysql2模块未安装',
        details: importError.message,
        config
      }, { status: 500 })
    }

    // 创建数据库连接
    let connection
    try {
      connection = await mysql.createConnection({
        host: config.host,
        port: parseInt(config.port || '3306'),
        user: config.user,
        password: process.env.MYSQL_PASSWORD,
        database: config.database,
        charset: 'utf8mb4'
      })
    } catch (connectionError) {
      return NextResponse.json({
        success: false,
        error: '数据库连接失败',
        details: connectionError.message,
        config
      }, { status: 500 })
    }

    // 测试基本查询和表查询
    try {
      const [rows] = await connection.execute('SELECT VERSION() as version')

      // 测试表查询
      let companyCount = 0
      let langCount = 0

      try {
        const [companyRows] = await connection.execute('SELECT COUNT(*) as count FROM seller_company')
        companyCount = companyRows[0]?.count || 0
      } catch (tableError) {
        // 表不存在或无权限访问
      }

      try {
        const [langRows] = await connection.execute('SELECT COUNT(*) as count FROM seller_company_lang')
        langCount = langRows[0]?.count || 0
      } catch (tableError) {
        // 表不存在或无权限访问
      }

      return NextResponse.json({
        success: true,
        message: 'MySQL数据库连接成功',
        version: rows[0]?.version,
        tables: {
          seller_company: companyCount,
          seller_company_lang: langCount
        },
        config
      })
    } catch (queryError) {
      return NextResponse.json({
        success: true,
        message: 'MySQL数据库连接成功，但查询失败',
        error: queryError.message,
        config
      })
    } finally {
      if (connection) {
        await connection.end()
      }
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '连接测试失败',
      config: {
        host: process.env.MYSQL_HOST,
        port: process.env.MYSQL_PORT,
        database: process.env.MYSQL_DATABASE,
        user: process.env.MYSQL_USER
      }
    }, { status: 500 })
  }
}
