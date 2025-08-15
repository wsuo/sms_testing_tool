import Database from 'better-sqlite3'
import { createPlatformConnection } from '../lib/platform-mysql'
import { config } from 'dotenv'
import path from 'path'

// 加载环境变量
config({ path: path.join(process.cwd(), '.env.local') })

interface TableStats {
  name: string
  sqliteCount: number
  mysqlCount: number
  match: boolean
  sampleData?: any
}

// 验证迁移结果
async function verifyMigration() {
  console.log('开始验证数据库迁移结果...')
  
  const sqliteDbPath = path.join(process.cwd(), 'data', 'db', 'sms_records.db')
  const sqliteDb = new Database(sqliteDbPath)
  const mysqlConn = await createPlatformConnection()
  
  try {
    // 获取所有表
    const sqliteTables = sqliteDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all()
    const tableNames = sqliteTables.map(t => t.name)
    
    console.log(`\\n发现 ${tableNames.length} 个表需要验证:`)
    console.log(tableNames.join(', '))
    
    const stats: TableStats[] = []
    let totalSqliteRecords = 0
    let totalMysqlRecords = 0
    let allTablesMatch = true
    
    // 验证每个表
    for (const tableName of tableNames) {
      console.log(`\\n验证表 ${tableName}...`)
      
      try {
        // 获取记录数
        const sqliteCount = sqliteDb.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get().count
        const [mysqlResult] = await mysqlConn.execute(`SELECT COUNT(*) as count FROM ${tableName}`)
        const mysqlCount = mysqlResult[0].count
        
        const match = sqliteCount === mysqlCount
        
        if (match) {
          console.log(`  ✅ 记录数匹配: ${sqliteCount}`)
        } else {
          console.log(`  ❌ 记录数不匹配: SQLite=${sqliteCount}, MySQL=${mysqlCount}`)
          allTablesMatch = false
        }
        
        // 获取样本数据进行对比
        let sampleData = null
        if (sqliteCount > 0 && match) {
          sampleData = await compareSampleData(sqliteDb, mysqlConn, tableName)
        }
        
        stats.push({
          name: tableName,
          sqliteCount,
          mysqlCount,
          match,
          sampleData
        })
        
        totalSqliteRecords += sqliteCount
        totalMysqlRecords += mysqlCount
        
      } catch (error) {
        console.log(`  ⚠️  验证失败: ${error.message}`)
        allTablesMatch = false
        
        stats.push({
          name: tableName,
          sqliteCount: -1,
          mysqlCount: -1,
          match: false
        })
      }
    }
    
    // 验证数据完整性
    await verifyDataIntegrity(mysqlConn)
    
    // 验证外键关系
    await verifyForeignKeys(mysqlConn)
    
    // 生成验证报告
    generateReport(stats, totalSqliteRecords, totalMysqlRecords, allTablesMatch)
    
    if (!allTablesMatch) {
      throw new Error('数据迁移验证失败：存在记录数不匹配的表')
    }
    
    console.log('\\n✅ 数据迁移验证通过')
    
  } catch (error) {
    console.error('验证过程失败:', error)
    throw error
  } finally {
    sqliteDb.close()
    await mysqlConn.end()
  }
}

// 对比样本数据
async function compareSampleData(sqliteDb: any, mysqlConn: any, tableName: string): Promise<any> {
  try {
    // 获取第一条记录进行对比
    const sqliteRow = sqliteDb.prepare(`SELECT * FROM ${tableName} LIMIT 1`).get()
    const [mysqlRows] = await mysqlConn.execute(`SELECT * FROM ${tableName} LIMIT 1`)
    const mysqlRow = mysqlRows[0]
    
    if (!sqliteRow || !mysqlRow) {
      return { status: 'empty' }
    }
    
    // 对比关键字段
    const comparison: any = { status: 'compared', differences: [] }
    
    for (const [key, sqliteValue] of Object.entries(sqliteRow)) {
      const mysqlValue = mysqlRow[key]
      
      // 处理特殊类型转换
      let normalizedSqliteValue = sqliteValue
      let normalizedMysqlValue = mysqlValue
      
      // 布尔值转换
      if (typeof sqliteValue === 'number' && (sqliteValue === 0 || sqliteValue === 1)) {
        normalizedSqliteValue = Boolean(sqliteValue)
        normalizedMysqlValue = Boolean(mysqlValue)
      }
      
      // 日期时间字符串比较
      if (typeof sqliteValue === 'string' && sqliteValue.includes('-') && sqliteValue.length > 10) {
        // 可能是日期时间，转换为标准格式比较
        try {
          const sqliteDate = new Date(sqliteValue)
          const mysqlDate = new Date(mysqlValue)
          if (!isNaN(sqliteDate.getTime()) && !isNaN(mysqlDate.getTime())) {
            normalizedSqliteValue = sqliteDate.toISOString()
            normalizedMysqlValue = mysqlDate.toISOString()
          }
        } catch (e) {
          // 不是日期，继续原值比较
        }
      }
      
      if (normalizedSqliteValue !== normalizedMysqlValue) {
        comparison.differences.push({
          field: key,
          sqlite: normalizedSqliteValue,
          mysql: normalizedMysqlValue
        })
      }
    }
    
    if (comparison.differences.length === 0) {
      console.log(`    ✅ 样本数据一致`)
    } else {
      console.log(`    ⚠️  样本数据有差异: ${comparison.differences.length} 个字段`)
      for (const diff of comparison.differences.slice(0, 3)) { // 只显示前3个差异
        console.log(`      ${diff.field}: SQLite='${diff.sqlite}' MySQL='${diff.mysql}'`)
      }
    }
    
    return comparison
    
  } catch (error) {
    console.log(`    ⚠️  样本数据对比失败: ${error.message}`)
    return { status: 'error', message: error.message }
  }
}

// 验证数据完整性
async function verifyDataIntegrity(mysqlConn: any) {
  console.log('\\n验证数据完整性...')
  
  try {
    // 验证必要字段不为空
    const checks = [
      { table: 'sms_records', field: 'out_id', description: 'SMS记录的out_id不能为空' },
      { table: 'phone_numbers', field: 'number', description: '手机号码不能为空' },
      { table: 'platforms', field: 'name', description: '平台名称不能为空' },
      { table: 'projects', field: 'name', description: '项目名称不能为空' }
    ]
    
    for (const check of checks) {
      const [result] = await mysqlConn.execute(
        `SELECT COUNT(*) as count FROM ${check.table} WHERE ${check.field} IS NULL OR ${check.field} = ''`
      )
      
      if (result[0].count > 0) {
        console.log(`  ⚠️  ${check.description}: 发现 ${result[0].count} 条无效记录`)
      } else {
        console.log(`  ✅ ${check.description}`)
      }
    }
    
  } catch (error) {
    console.log(`  ⚠️  数据完整性验证失败: ${error.message}`)
  }
}

// 验证外键关系
async function verifyForeignKeys(mysqlConn: any) {
  console.log('\\n验证外键关系...')
  
  try {
    const foreignKeyChecks = [
      {
        description: '项目-平台关系',
        sql: `SELECT COUNT(*) as count FROM projects p 
              LEFT JOIN platforms pt ON p.platform_id = pt.id 
              WHERE p.platform_id IS NOT NULL AND pt.id IS NULL`
      },
      {
        description: '项目阶段-项目关系',
        sql: `SELECT COUNT(*) as count FROM project_phases pp 
              LEFT JOIN projects p ON pp.project_id = p.id 
              WHERE p.id IS NULL`
      },
      {
        description: '功能模块-项目关系',
        sql: `SELECT COUNT(*) as count FROM feature_modules fm 
              LEFT JOIN projects p ON fm.project_id = p.id 
              WHERE p.id IS NULL`
      },
      {
        description: '功能点-模块关系',
        sql: `SELECT COUNT(*) as count FROM feature_items fi 
              LEFT JOIN feature_modules fm ON fi.module_id = fm.id 
              WHERE fm.id IS NULL`
      }
    ]
    
    for (const check of foreignKeyChecks) {
      const [result] = await mysqlConn.execute(check.sql)
      
      if (result[0].count > 0) {
        console.log(`  ⚠️  ${check.description}: 发现 ${result[0].count} 条孤立记录`)
      } else {
        console.log(`  ✅ ${check.description}`)
      }
    }
    
  } catch (error) {
    console.log(`  ⚠️  外键关系验证失败: ${error.message}`)
  }
}

// 生成验证报告
function generateReport(stats: TableStats[], totalSqliteRecords: number, totalMysqlRecords: number, allTablesMatch: boolean) {
  console.log('\\n' + '='.repeat(60))
  console.log('                  数据迁移验证报告')
  console.log('='.repeat(60))
  
  console.log('\\n📊 表统计:')
  console.log(`  总表数: ${stats.length}`)
  console.log(`  匹配表数: ${stats.filter(s => s.match).length}`)
  console.log(`  不匹配表数: ${stats.filter(s => !s.match).length}`)
  
  console.log('\\n📈 记录统计:')
  console.log(`  SQLite 总记录数: ${totalSqliteRecords}`)
  console.log(`  MySQL 总记录数: ${totalMysqlRecords}`)
  console.log(`  记录匹配: ${totalSqliteRecords === totalMysqlRecords ? '✅' : '❌'}`)
  
  console.log('\\n📋 详细结果:')
  stats.forEach(stat => {
    const status = stat.match ? '✅' : '❌'
    console.log(`  ${status} ${stat.name.padEnd(20)} SQLite: ${stat.sqliteCount.toString().padStart(6)} | MySQL: ${stat.mysqlCount.toString().padStart(6)}`)
  })
  
  if (!allTablesMatch) {
    console.log('\\n❌ 验证失败的表:')
    stats.filter(s => !s.match).forEach(stat => {
      console.log(`  - ${stat.name}: SQLite=${stat.sqliteCount}, MySQL=${stat.mysqlCount}`)
    })
  }
  
  console.log('\\n' + '='.repeat(60))
  console.log(`最终结果: ${allTablesMatch ? '✅ 验证通过' : '❌ 验证失败'}`)
  console.log('='.repeat(60))
}

// 如果直接运行此脚本
if (require.main === module) {
  verifyMigration()
    .then(() => {
      console.log('\\n✅ 数据库迁移验证完成')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ 数据库迁移验证失败:', error)
      process.exit(1)
    })
}

export { verifyMigration }