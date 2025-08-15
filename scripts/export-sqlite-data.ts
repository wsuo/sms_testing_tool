import Database from 'better-sqlite3'
import { writeFileSync } from 'fs'
import path from 'path'

// 导出SQLite数据到JSON文件
async function exportSQLiteData() {
  console.log('开始导出 SQLite 数据...')
  
  const dbPath = path.join(process.cwd(), 'data', 'db', 'sms_records.db')
  const db = new Database(dbPath)
  
  try {
    // 获取所有表名
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all()
    console.log(`发现 ${tables.length} 个表:`, tables.map(t => t.name).join(', '))
    
    const exportData: Record<string, any[]> = {}
    let totalRecords = 0
    
    // 导出每个表的数据
    for (const table of tables) {
      const tableName = table.name as string
      console.log(`导出表 ${tableName}...`)
      
      try {
        const rows = db.prepare(`SELECT * FROM ${tableName}`).all()
        exportData[tableName] = rows
        console.log(`  表 ${tableName}: ${rows.length} 条记录`)
        totalRecords += rows.length
      } catch (error) {
        console.error(`  导出表 ${tableName} 失败:`, error)
        exportData[tableName] = []
      }
    }
    
    // 导出表结构信息
    const schemas: Record<string, any> = {}
    for (const table of tables) {
      const tableName = table.name as string
      try {
        const schema = db.prepare(`PRAGMA table_info(${tableName})`).all()
        schemas[tableName] = schema
      } catch (error) {
        console.error(`获取表 ${tableName} 结构失败:`, error)
      }
    }
    
    // 创建导出对象
    const exportObject = {
      exportDate: new Date().toISOString(),
      database: 'sms_records.db',
      totalTables: tables.length,
      totalRecords: totalRecords,
      schemas: schemas,
      data: exportData
    }
    
    // 生成文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const backupPath = path.join(process.cwd(), 'data', 'backup', `sqlite-export-${timestamp}.json`)
    
    // 写入文件
    writeFileSync(backupPath, JSON.stringify(exportObject, null, 2), 'utf8')
    
    console.log('\\n=== 导出完成 ===')
    console.log(`导出文件: ${backupPath}`)
    console.log(`总表数: ${tables.length}`)
    console.log(`总记录数: ${totalRecords}`)
    console.log('\\n各表记录统计:')
    
    for (const [tableName, records] of Object.entries(exportData)) {
      console.log(`  ${tableName}: ${records.length} 条`)
    }
    
    return backupPath
    
  } catch (error) {
    console.error('导出失败:', error)
    throw error
  } finally {
    db.close()
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  exportSQLiteData()
    .then((backupPath) => {
      console.log(`\\n✅ SQLite 数据导出成功: ${backupPath}`)
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ SQLite 数据导出失败:', error)
      process.exit(1)
    })
}

export { exportSQLiteData }