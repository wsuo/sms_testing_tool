import Database from 'better-sqlite3'
import { createPlatformConnection } from '../lib/platform-mysql'
import { config } from 'dotenv'
import path from 'path'

// 加载环境变量
config({ path: path.join(process.cwd(), '.env.local') })

// 数据迁移脚本
async function migrateDataToMySQL() {
  console.log('开始从 SQLite 迁移数据到 MySQL...')
  
  const sqliteDbPath = path.join(process.cwd(), 'data', 'db', 'sms_records.db')
  const sqliteDb = new Database(sqliteDbPath)
  const mysqlConn = await createPlatformConnection()
  
  try {
    // 定义表迁移顺序（按依赖关系）
    const migrationTables = [
      { name: 'platforms', hasData: true },
      { name: 'projects', hasData: true },
      { name: 'project_phases', hasData: false },
      { name: 'feature_modules', hasData: false },
      { name: 'feature_items', hasData: false },
      { name: 'progress_records', hasData: false },
      { name: 'import_records', hasData: true },
      { name: 'failed_companies', hasData: false },
      { name: 'phone_numbers', hasData: true },
      { name: 'sms_records', hasData: true },
      { name: 'question_sets', hasData: false },
      { name: 'questions', hasData: false },
      { name: 'training_records', hasData: true },
      { name: 'system_config', hasData: false },
      { name: 'auto_test_plans', hasData: false }
    ]
    
    let totalMigratedRecords = 0
    
    // 清空目标表数据（按反向顺序）
    console.log('清空目标表数据...')
    await mysqlConn.execute('SET FOREIGN_KEY_CHECKS = 0')
    
    for (const table of migrationTables.reverse()) {
      await mysqlConn.execute(`TRUNCATE TABLE ${table.name}`)
    }
    
    await mysqlConn.execute('SET FOREIGN_KEY_CHECKS = 1')
    migrationTables.reverse() // 恢复正序
    
    // 迁移每个表
    for (const table of migrationTables) {
      console.log(`\\n迁移表 ${table.name}...`)
      
      try {
        // 获取 SQLite 数据
        const rows = sqliteDb.prepare(`SELECT * FROM ${table.name}`).all()
        
        if (rows.length === 0) {
          console.log(`  表 ${table.name} 无数据，跳过`)
          continue
        }
        
        console.log(`  发现 ${rows.length} 条记录`)
        
        // 根据表名进行特殊处理
        await migrateTableData(mysqlConn, table.name, rows)
        
        console.log(`  ✅ 表 ${table.name} 迁移完成: ${rows.length} 条记录`)
        totalMigratedRecords += rows.length
        
      } catch (error) {
        console.error(`  ❌ 表 ${table.name} 迁移失败:`, error)
        throw error
      }
    }
    
    console.log('\\n=== 数据迁移完成 ===')
    console.log(`总迁移记录数: ${totalMigratedRecords}`)
    
    // 验证迁移结果
    await verifyMigration(sqliteDb, mysqlConn, migrationTables)
    
  } catch (error) {
    console.error('数据迁移失败:', error)
    throw error
  } finally {
    sqliteDb.close()
    await mysqlConn.end()
  }
}

// 迁移特定表的数据
async function migrateTableData(mysqlConn: any, tableName: string, rows: any[]) {
  if (rows.length === 0) return
  
  const batchSize = 10  // 减小批次大小避免参数过多
  
  // 对所有表使用通用迁移方法，避免特殊处理的复杂性
  await migrateGenericTable(mysqlConn, tableName, rows, batchSize)
}

// 迁移 SMS 记录
async function migrateSMSRecords(mysqlConn: any, rows: any[], batchSize: number) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    
    const valuesPlaceholder = batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')
    const sql = `
      INSERT INTO sms_records 
      (id, out_id, phone_number, carrier, phone_note, template_code, template_name, 
       template_params, content, send_date, receive_date, status, error_code, 
       retry_count, last_retry_at, auto_refresh_enabled, created_at, updated_at)
      VALUES ${valuesPlaceholder}
    `
    
    const allValues = batch.flatMap(row => [
      row.id, row.out_id, row.phone_number, row.carrier || null, row.phone_note || null,
      row.template_code || null, row.template_name || null, row.template_params || null,
      row.content || null, row.send_date || null, row.receive_date || null, row.status,
      row.error_code || null, row.retry_count || 0, row.last_retry_at || null,
      row.auto_refresh_enabled || 1, row.created_at, row.updated_at
    ])
    
    await mysqlConn.execute(sql, allValues)
  }
}

// 迁移手机号码
async function migratePhoneNumbers(mysqlConn: any, rows: any[], batchSize: number) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    
    const sql = `
      INSERT INTO phone_numbers 
      (id, number, carrier, province, city, note, created_at, updated_at)
      VALUES ?
    `
    
    const values = batch.map(row => [
      row.id,
      row.number,
      row.carrier,
      row.province || null,
      row.city || null,
      row.note || null,
      row.created_at,
      row.updated_at
    ])
    
    await mysqlConn.execute(sql, [values])
  }
}

// 迁移培训记录
async function migrateTrainingRecords(mysqlConn: any, rows: any[], batchSize: number) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    
    const sql = `
      INSERT INTO training_records 
      (id, employee_name, set_id, answers, score, total_questions, 
       started_at, completed_at, ip_address, session_duration)
      VALUES ?
    `
    
    const values = batch.map(row => [
      row.id,
      row.employee_name,
      row.set_id,
      row.answers, // 直接作为 JSON 存储
      row.score,
      row.total_questions,
      row.started_at,
      row.completed_at,
      row.ip_address || null,
      row.session_duration || null
    ])
    
    await mysqlConn.execute(sql, [values])
  }
}

// 迁移自动测试计划
async function migrateAutoTestPlans(mysqlConn: any, rows: any[], batchSize: number) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    
    const sql = `
      INSERT INTO auto_test_plans 
      (id, name, description, template_id, template_name, phone_numbers, 
       schedule, status, progress, created_at, updated_at, last_run, next_run)
      VALUES ?
    `
    
    const values = batch.map(row => [
      row.id,
      row.name,
      row.description || null,
      row.template_id,
      row.template_name || null,
      row.phone_numbers, // JSON 字符串
      row.schedule, // JSON 字符串
      row.status,
      row.progress, // JSON 字符串
      row.created_at,
      row.updated_at,
      row.last_run || null,
      row.next_run || null
    ])
    
    await mysqlConn.execute(sql, [values])
  }
}

// 迁移系统配置
async function migrateSystemConfig(mysqlConn: any, rows: any[], batchSize: number) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    
    const sql = `
      INSERT INTO system_config 
      (\`key\`, value, description, created_at, updated_at)
      VALUES ?
    `
    
    const values = batch.map(row => [
      row.key,
      row.value,
      row.description || null,
      row.created_at,
      row.updated_at
    ])
    
    await mysqlConn.execute(sql, [values])
  }
}

// 迁移导入记录
async function migrateImportRecords(mysqlConn: any, rows: any[], batchSize: number) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    
    const sql = `
      INSERT INTO import_records 
      (id, import_date, total_processed, success_count, error_count, 
       success_rate, duration_seconds, status, notes, mysql_update_time)
      VALUES ?
    `
    
    const values = batch.map(row => [
      row.id,
      row.import_date,
      row.total_processed,
      row.success_count,
      row.error_count,
      row.success_rate,
      row.duration_seconds,
      row.status,
      row.notes || null,
      row.mysql_update_time || null
    ])
    
    await mysqlConn.execute(sql, [values])
  }
}

// 迁移功能点
async function migrateFeatureItems(mysqlConn: any, rows: any[], batchSize: number) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    
    const sql = `
      INSERT INTO feature_items 
      (id, module_id, name, description, priority, status, progress_percentage, 
       estimated_hours, actual_hours, assignee, start_date, estimated_completion_date, 
       actual_completion_date, notes, created_at, updated_at)
      VALUES ?
    `
    
    const values = batch.map(row => [
      row.id,
      row.module_id,
      row.name,
      row.description || null,
      row.priority,
      row.status,
      row.progress_percentage,
      row.estimated_hours || null,
      row.actual_hours || null,
      row.assignee || null,
      row.start_date || null,
      row.estimated_completion_date || null,
      row.actual_completion_date || null,
      row.notes || null,
      row.created_at,
      row.updated_at
    ])
    
    await mysqlConn.execute(sql, [values])
  }
}

// 通用表迁移方法
async function migrateGenericTable(mysqlConn: any, tableName: string, rows: any[], batchSize: number) {
  if (rows.length === 0) return
  
  // 获取第一行的字段名
  const fields = Object.keys(rows[0])
  
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    
    // 为每行创建占位符
    const valuesPlaceholder = batch.map(() => `(${fields.map(() => '?').join(', ')})`).join(', ')
    // 处理 MySQL 保留字，如 key 需要用反引号包裹
    const escapedFields = fields.map(field => field === 'key' ? '`key`' : field)
    const sql = `INSERT INTO ${tableName} (${escapedFields.join(', ')}) VALUES ${valuesPlaceholder}`
    
    // 平展所有值，并处理日期格式
    const allValues = batch.flatMap(row => 
      fields.map(field => {
        let value = row[field] === undefined ? null : row[field]
        
        // 处理 ISO 8601 日期格式转换为 MySQL 兼容格式
        if (value && typeof value === 'string') {
          // 检查是否是 ISO 8601 格式的日期时间字符串
          if (value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
            // 转换为 MySQL 格式 'YYYY-MM-DD HH:mm:ss'
            value = new Date(value).toISOString().slice(0, 19).replace('T', ' ')
          }
        }
        
        return value
      })
    )
    
    await mysqlConn.execute(sql, allValues)
  }
}

// 验证迁移结果
async function verifyMigration(sqliteDb: any, mysqlConn: any, tables: any[]) {
  console.log('\\n=== 验证迁移结果 ===')
  
  let allMatch = true
  
  for (const table of tables) {
    try {
      // 获取记录数
      const sqliteCount = sqliteDb.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get().count
      const [mysqlResult] = await mysqlConn.execute(`SELECT COUNT(*) as count FROM ${table.name}`)
      const mysqlCount = mysqlResult[0].count
      
      if (sqliteCount === mysqlCount) {
        console.log(`  ✅ ${table.name}: ${sqliteCount} = ${mysqlCount}`)
      } else {
        console.log(`  ❌ ${table.name}: SQLite=${sqliteCount}, MySQL=${mysqlCount}`)
        allMatch = false
      }
    } catch (error) {
      console.log(`  ⚠️  ${table.name}: 验证失败 - ${error.message}`)
      allMatch = false
    }
  }
  
  if (allMatch) {
    console.log('\\n✅ 所有表记录数验证通过')
  } else {
    console.log('\\n❌ 存在记录数不匹配的表')
    throw new Error('数据迁移验证失败')
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  migrateDataToMySQL()
    .then(() => {
      console.log('\\n✅ 数据迁移成功完成')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ 数据迁移失败:', error)
      process.exit(1)
    })
}

export { migrateDataToMySQL }