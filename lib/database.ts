import Database from 'better-sqlite3'
import path from 'path'

// 数据库文件路径
const dbPath = path.join(process.cwd(), 'sms_records.db')

// 创建数据库连接
let db: Database.Database | null = null

export function getDatabase(): Database.Database {
  if (!db) {
    db = new Database(dbPath)
    
    // 启用外键支持
    db.pragma('foreign_keys = ON')
    
    // 初始化数据表
    initializeTables()
    
    console.log('Database initialized:', dbPath)
  }
  
  return db
}

function initializeTables() {
  if (!db) return
  
  // 创建SMS记录表
  const createSmsRecordsTable = `
    CREATE TABLE IF NOT EXISTS sms_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      out_id TEXT NOT NULL,
      phone_number TEXT NOT NULL,
      template_code TEXT,
      template_params TEXT, -- JSON字符串存储模板参数
      content TEXT,
      send_date TEXT,
      receive_date TEXT,
      status TEXT NOT NULL DEFAULT '发送中',
      error_code TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `
  
  // 创建索引以提升查询性能
  const createIndexes = [
    'CREATE INDEX IF NOT EXISTS idx_out_id ON sms_records (out_id)',
    'CREATE INDEX IF NOT EXISTS idx_phone_number ON sms_records (phone_number)', 
    'CREATE INDEX IF NOT EXISTS idx_status ON sms_records (status)',
    'CREATE INDEX IF NOT EXISTS idx_created_at ON sms_records (created_at)'
  ]
  
  try {
    db.exec(createSmsRecordsTable)
    console.log('SMS records table created/verified')
    
    createIndexes.forEach(indexSQL => {
      db!.exec(indexSQL)
    })
    console.log('Database indexes created/verified')
    
  } catch (error) {
    console.error('Database initialization failed:', error)
    throw error
  }
}

// SMS记录类型定义
export interface SmsRecord {
  id?: number
  out_id: string
  phone_number: string
  template_code?: string
  template_params?: string
  content?: string
  send_date?: string
  receive_date?: string
  status: string
  error_code?: string
  created_at?: string
  updated_at?: string
}

// 数据库操作类
export class SmsRecordDB {
  private db: Database.Database
  
  constructor() {
    this.db = getDatabase()
  }
  
  // 插入SMS记录
  insertRecord(record: Omit<SmsRecord, 'id' | 'created_at' | 'updated_at'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO sms_records 
      (out_id, phone_number, template_code, template_params, content, send_date, status, error_code)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    const result = stmt.run(
      record.out_id,
      record.phone_number,
      record.template_code || null,
      record.template_params || null,
      record.content || null,
      record.send_date || null,
      record.status,
      record.error_code || null
    )
    
    return result.lastInsertRowid as number
  }
  
  // 更新SMS状态
  updateStatus(outId: string, updates: Partial<Pick<SmsRecord, 'status' | 'error_code' | 'receive_date'>>): boolean {
    const updateFields: string[] = []
    const values: any[] = []
    
    if (updates.status !== undefined) {
      updateFields.push('status = ?')
      values.push(updates.status)
    }
    
    if (updates.error_code !== undefined) {
      updateFields.push('error_code = ?')
      values.push(updates.error_code)
    }
    
    if (updates.receive_date !== undefined) {
      updateFields.push('receive_date = ?')
      values.push(updates.receive_date)
    }
    
    if (updateFields.length === 0) return false
    
    updateFields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(outId)
    
    const stmt = this.db.prepare(`
      UPDATE sms_records 
      SET ${updateFields.join(', ')}
      WHERE out_id = ?
    `)
    
    const result = stmt.run(...values)
    return result.changes > 0
  }
  
  // 根据OutId查询记录
  findByOutId(outId: string): SmsRecord | null {
    const stmt = this.db.prepare('SELECT * FROM sms_records WHERE out_id = ?')
    return stmt.get(outId) as SmsRecord | null
  }
  
  // 查询所有记录（分页）
  findAll(limit = 100, offset = 0): SmsRecord[] {
    const stmt = this.db.prepare(`
      SELECT * FROM sms_records 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `)
    return stmt.all(limit, offset) as SmsRecord[]
  }
  
  // 根据手机号查询记录
  findByPhoneNumber(phoneNumber: string, limit = 50): SmsRecord[] {
    const stmt = this.db.prepare(`
      SELECT * FROM sms_records 
      WHERE phone_number = ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `)
    return stmt.all(phoneNumber, limit) as SmsRecord[]
  }
  
  // 查询未完成的记录（用于状态更新）
  findPendingRecords(): SmsRecord[] {
    const stmt = this.db.prepare(`
      SELECT * FROM sms_records 
      WHERE status IN ('发送中') 
      ORDER BY created_at DESC
    `)
    return stmt.all() as SmsRecord[]
  }
  
  // 删除记录
  deleteRecord(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM sms_records WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }
  
  // 清理旧记录（保留最近N天）
  cleanupOldRecords(daysToKeep = 30): number {
    const stmt = this.db.prepare(`
      DELETE FROM sms_records 
      WHERE created_at < datetime('now', '-${daysToKeep} days')
    `)
    const result = stmt.run()
    return result.changes
  }
  
  // 关闭数据库连接
  close() {
    if (this.db) {
      this.db.close()
    }
  }
}

// 导出单例实例
export const smsRecordDB = new SmsRecordDB()