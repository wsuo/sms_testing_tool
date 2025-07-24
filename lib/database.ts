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
      carrier TEXT, -- 运营商信息
      phone_note TEXT, -- 手机号备注信息
      template_code TEXT,
      template_name TEXT, -- 模板中文名称
      template_params TEXT, -- JSON字符串存储模板参数
      content TEXT,
      send_date TEXT,
      receive_date TEXT,
      status TEXT NOT NULL DEFAULT '发送中',
      error_code TEXT,
      retry_count INTEGER DEFAULT 0, -- 重试次数
      last_retry_at DATETIME, -- 最后重试时间
      auto_refresh_enabled INTEGER DEFAULT 1, -- 是否启用自动刷新 (1=启用, 0=禁用)
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `

  // 创建手机号码表
  const createPhoneNumbersTable = `
    CREATE TABLE IF NOT EXISTS phone_numbers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      number TEXT NOT NULL UNIQUE,
      carrier TEXT NOT NULL,
      province TEXT,
      city TEXT,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `
  
  // 创建索引以提升查询性能
  const createIndexes = [
    'CREATE INDEX IF NOT EXISTS idx_out_id ON sms_records (out_id)',
    'CREATE INDEX IF NOT EXISTS idx_phone_number ON sms_records (phone_number)', 
    'CREATE INDEX IF NOT EXISTS idx_status ON sms_records (status)',
    'CREATE INDEX IF NOT EXISTS idx_created_at ON sms_records (created_at)',
    'CREATE INDEX IF NOT EXISTS idx_phone_numbers_number ON phone_numbers (number)',
    'CREATE INDEX IF NOT EXISTS idx_phone_numbers_carrier ON phone_numbers (carrier)'
  ]
  
  try {
    db.exec(createSmsRecordsTable)
    console.log('SMS records table created/verified')
    
    db.exec(createPhoneNumbersTable)
    console.log('Phone numbers table created/verified')
    
    // 执行数据库迁移
    runMigrations()
    
    createIndexes.forEach(indexSQL => {
      db!.exec(indexSQL)
    })
    console.log('Database indexes created/verified')
    
  } catch (error) {
    console.error('Database initialization failed:', error)
    throw error
  }
}

// 数据库迁移函数
function runMigrations() {
  if (!db) return
  
  try {
    // 检查sms_records表是否存在新字段，如果不存在则添加
    const checkSmsColumns = db.prepare("PRAGMA table_info(sms_records)").all() as any[]
    const existingSmsColumns = checkSmsColumns.map(col => col.name)
    
    console.log('Existing sms_records columns:', existingSmsColumns)
    
    // 需要添加的SMS记录新字段
    const requiredSmsColumns = [
      { name: 'retry_count', sql: 'ALTER TABLE sms_records ADD COLUMN retry_count INTEGER DEFAULT 0' },
      { name: 'last_retry_at', sql: 'ALTER TABLE sms_records ADD COLUMN last_retry_at DATETIME' },
      { name: 'auto_refresh_enabled', sql: 'ALTER TABLE sms_records ADD COLUMN auto_refresh_enabled INTEGER DEFAULT 1' },
      { name: 'template_name', sql: 'ALTER TABLE sms_records ADD COLUMN template_name TEXT' },
      { name: 'carrier', sql: 'ALTER TABLE sms_records ADD COLUMN carrier TEXT' },
      { name: 'phone_note', sql: 'ALTER TABLE sms_records ADD COLUMN phone_note TEXT' }
    ]
    
    // 添加SMS记录表缺失的字段
    for (const column of requiredSmsColumns) {
      if (!existingSmsColumns.includes(column.name)) {
        console.log(`Adding missing sms_records column: ${column.name}`)
        db.exec(column.sql)
      }
    }

    // 检查phone_numbers表是否存在新字段，如果不存在则添加
    const checkPhoneColumns = db.prepare("PRAGMA table_info(phone_numbers)").all() as any[]
    const existingPhoneColumns = checkPhoneColumns.map(col => col.name)
    
    console.log('Existing phone_numbers columns:', existingPhoneColumns)
    
    // 需要添加的手机号码新字段
    const requiredPhoneColumns = [
      { name: 'province', sql: 'ALTER TABLE phone_numbers ADD COLUMN province TEXT' },
      { name: 'city', sql: 'ALTER TABLE phone_numbers ADD COLUMN city TEXT' }
    ]
    
    // 添加手机号码表缺失的字段
    for (const column of requiredPhoneColumns) {
      if (!existingPhoneColumns.includes(column.name)) {
        console.log(`Adding missing phone_numbers column: ${column.name}`)
        db.exec(column.sql)
      }
    }
    
    console.log('Database migration completed')
    
  } catch (error) {
    console.error('Database migration failed:', error)
    // 不抛出错误，让应用继续运行
  }
}

// SMS记录类型定义
export interface SmsRecord {
  id?: number
  out_id: string
  phone_number: string
  carrier?: string
  phone_note?: string
  template_code?: string
  template_name?: string
  template_params?: string
  content?: string
  send_date?: string
  receive_date?: string
  status: string
  error_code?: string
  retry_count?: number
  last_retry_at?: string
  auto_refresh_enabled?: number
  created_at?: string
  updated_at?: string
}

// 手机号码类型定义
export interface PhoneNumber {
  id?: number
  number: string
  carrier: string
  province?: string  // 省份
  city?: string      // 城市
  note?: string
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
      (out_id, phone_number, carrier, phone_note, template_code, template_name, template_params, content, send_date, status, error_code)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    const result = stmt.run(
      record.out_id,
      record.phone_number,
      record.carrier || null,
      record.phone_note || null,
      record.template_code || null,
      record.template_name || null,
      record.template_params || null,
      record.content || null,
      record.send_date || null,
      record.status,
      record.error_code || null
    )
    
    return result.lastInsertRowid as number
  }
  
  // 更新SMS记录的运营商和备注信息
  updateCarrierInfo(outId: string, carrier?: string, phoneNote?: string): boolean {
    const updateFields: string[] = []
    const values: any[] = []
    
    if (carrier !== undefined) {
      updateFields.push('carrier = ?')
      values.push(carrier)
    }
    
    if (phoneNote !== undefined) {
      updateFields.push('phone_note = ?')
      values.push(phoneNote)
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

  // 更新SMS状态
  updateStatus(outId: string, updates: Partial<Pick<SmsRecord, 'status' | 'error_code' | 'receive_date' | 'retry_count' | 'last_retry_at' | 'auto_refresh_enabled'>>): boolean {
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
    
    if (updates.retry_count !== undefined) {
      updateFields.push('retry_count = ?')
      values.push(updates.retry_count)
    }
    
    if (updates.last_retry_at !== undefined) {
      updateFields.push('last_retry_at = ?')
      values.push(updates.last_retry_at)
    }
    
    if (updates.auto_refresh_enabled !== undefined) {
      updateFields.push('auto_refresh_enabled = ?')
      values.push(updates.auto_refresh_enabled)
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
  
  // 根据状态查询记录
  findByStatus(status: string, limit = 100, offset = 0): SmsRecord[] {
    const stmt = this.db.prepare(`
      SELECT * FROM sms_records 
      WHERE status = ? 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `)
    return stmt.all(status, limit, offset) as SmsRecord[]
  }

  // 复合条件查询记录
  findWithFilters(filters: {
    searchTerm?: string
    status?: string
    carrier?: string
    templateName?: string
    dateRange?: 'today' | '2days' | 'week' | 'month'
    limit?: number
    offset?: number
  }): SmsRecord[] {
    const conditions: string[] = []
    const params: any[] = []
    
    // 搜索条件（手机号或OutId）
    if (filters.searchTerm && filters.searchTerm.trim()) {
      conditions.push('(phone_number LIKE ? OR out_id LIKE ?)')
      const searchPattern = `%${filters.searchTerm.trim()}%`
      params.push(searchPattern, searchPattern)
    }
    
    // 状态筛选
    if (filters.status && filters.status !== 'all') {
      conditions.push('status = ?')
      params.push(filters.status)
    }
    
    // 运营商筛选
    if (filters.carrier && filters.carrier !== 'all') {
      conditions.push('carrier = ?')
      params.push(filters.carrier)
    }
    
    // 模板筛选
    if (filters.templateName && filters.templateName !== 'all') {
      conditions.push('template_name = ?')
      params.push(filters.templateName)
    }
    
    // 日期筛选
    if (filters.dateRange && filters.dateRange !== 'all') {
      switch (filters.dateRange) {
        case 'today':
          conditions.push("date(created_at) = date('now')")
          break
        case '2days':
          conditions.push("created_at >= datetime('now', '-2 days')")
          break
        case 'week':
          conditions.push("created_at >= datetime('now', '-7 days')")
          break
        case 'month':
          conditions.push("created_at >= datetime('now', '-30 days')")
          break
      }
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const limit = filters.limit || 100
    const offset = filters.offset || 0
    
    const query = `
      SELECT * FROM sms_records 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `
    
    params.push(limit, offset)
    
    const stmt = this.db.prepare(query)
    return stmt.all(...params) as SmsRecord[]
  }

  // 复合条件统计记录数
  countWithFilters(filters: {
    searchTerm?: string
    status?: string
    carrier?: string
    templateName?: string
    dateRange?: 'today' | '2days' | 'week' | 'month'
  }): number {
    const conditions: string[] = []
    const params: any[] = []
    
    // 搜索条件（手机号或OutId）
    if (filters.searchTerm && filters.searchTerm.trim()) {
      conditions.push('(phone_number LIKE ? OR out_id LIKE ?)')
      const searchPattern = `%${filters.searchTerm.trim()}%`
      params.push(searchPattern, searchPattern)
    }
    
    // 状态筛选
    if (filters.status && filters.status !== 'all') {
      conditions.push('status = ?')
      params.push(filters.status)
    }
    
    // 运营商筛选
    if (filters.carrier && filters.carrier !== 'all') {
      conditions.push('carrier = ?')
      params.push(filters.carrier)
    }
    
    // 模板筛选
    if (filters.templateName && filters.templateName !== 'all') {
      conditions.push('template_name = ?')
      params.push(filters.templateName)
    }
    
    // 日期筛选
    if (filters.dateRange && filters.dateRange !== 'all') {
      switch (filters.dateRange) {
        case 'today':
          conditions.push("date(created_at) = date('now')")
          break
        case '2days':
          conditions.push("created_at >= datetime('now', '-2 days')")
          break
        case 'week':
          conditions.push("created_at >= datetime('now', '-7 days')")
          break
        case 'month':
          conditions.push("created_at >= datetime('now', '-30 days')")
          break
      }
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    
    const query = `SELECT COUNT(*) as count FROM sms_records ${whereClause}`
    
    const stmt = this.db.prepare(query)
    const result = stmt.get(...params) as { count: number }
    return result.count
  }
  
  // 查询未完成的记录（用于状态更新）
  findPendingRecords(): SmsRecord[] {
    const stmt = this.db.prepare(`
      SELECT * FROM sms_records 
      WHERE status IN ('发送中') 
      AND auto_refresh_enabled = 1
      AND (retry_count < 20 OR retry_count IS NULL)
      ORDER BY created_at DESC
    `)
    return stmt.all() as SmsRecord[]
  }
  
  // 统计记录总数
  count(): number {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM sms_records')
    const result = stmt.get() as { count: number }
    return result.count
  }

  // 根据状态统计记录数
  countByStatus(status: string): number {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM sms_records WHERE status = ?')
    const result = stmt.get(status) as { count: number }
    return result.count
  }

  // 根据手机号统计记录数
  countByPhoneNumber(phoneNumber: string): number {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM sms_records WHERE phone_number = ?')
    const result = stmt.get(phoneNumber) as { count: number }
    return result.count
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

// 手机号码数据库操作类
export class PhoneNumberDB {
  private db: Database.Database
  
  constructor() {
    this.db = getDatabase()
  }
  
  // 插入手机号码记录
  insertPhoneNumber(phoneNumber: Omit<PhoneNumber, 'id' | 'created_at' | 'updated_at'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO phone_numbers 
      (number, carrier, province, city, note)
      VALUES (?, ?, ?, ?, ?)
    `)
    
    const result = stmt.run(
      phoneNumber.number,
      phoneNumber.carrier,
      phoneNumber.province || null,
      phoneNumber.city || null,
      phoneNumber.note || null
    )
    
    return result.lastInsertRowid as number
  }
  
  // 更新手机号码记录
  updatePhoneNumber(id: number, updates: Partial<Pick<PhoneNumber, 'number' | 'carrier' | 'province' | 'city' | 'note'>>): boolean {
    const updateFields: string[] = []
    const values: any[] = []
    
    if (updates.number !== undefined) {
      updateFields.push('number = ?')
      values.push(updates.number)
    }
    
    if (updates.carrier !== undefined) {
      updateFields.push('carrier = ?')
      values.push(updates.carrier)
    }
    
    if (updates.province !== undefined) {
      updateFields.push('province = ?')
      values.push(updates.province)
    }
    
    if (updates.city !== undefined) {
      updateFields.push('city = ?')
      values.push(updates.city)
    }
    
    if (updates.note !== undefined) {
      updateFields.push('note = ?')
      values.push(updates.note)
    }
    
    if (updateFields.length === 0) return false
    
    updateFields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)
    
    const stmt = this.db.prepare(`
      UPDATE phone_numbers 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `)
    
    const result = stmt.run(...values)
    return result.changes > 0
  }
  
  // 根据ID查询记录
  findById(id: number): PhoneNumber | null {
    const stmt = this.db.prepare('SELECT * FROM phone_numbers WHERE id = ?')
    return stmt.get(id) as PhoneNumber | null
  }
  
  // 根据手机号查询记录
  findByNumber(number: string): PhoneNumber | null {
    const stmt = this.db.prepare('SELECT * FROM phone_numbers WHERE number = ?')
    return stmt.get(number) as PhoneNumber | null
  }
  
  // 查询所有记录
  findAll(limit = 100, offset = 0): PhoneNumber[] {
    const stmt = this.db.prepare(`
      SELECT * FROM phone_numbers 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `)
    return stmt.all(limit, offset) as PhoneNumber[]
  }
  
  // 根据运营商查询记录
  findByCarrier(carrier: string): PhoneNumber[] {
    const stmt = this.db.prepare(`
      SELECT * FROM phone_numbers 
      WHERE carrier = ? 
      ORDER BY created_at DESC
    `)
    return stmt.all(carrier) as PhoneNumber[]
  }
  
  // 检查手机号是否存在
  exists(number: string, excludeId?: number): boolean {
    let stmt
    if (excludeId) {
      stmt = this.db.prepare('SELECT COUNT(*) as count FROM phone_numbers WHERE number = ? AND id != ?')
      const result = stmt.get(number, excludeId) as { count: number }
      return result.count > 0
    } else {
      stmt = this.db.prepare('SELECT COUNT(*) as count FROM phone_numbers WHERE number = ?')
      const result = stmt.get(number) as { count: number }
      return result.count > 0
    }
  }
  
  // 删除记录
  deletePhoneNumber(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM phone_numbers WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }
  
  // 统计记录数量
  count(): number {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM phone_numbers')
    const result = stmt.get() as { count: number }
    return result.count
  }
  
  // 复合条件查询手机号码
  findWithFilters(filters: {
    searchTerm?: string
    carrier?: string
    limit?: number
    offset?: number
  }): PhoneNumber[] {
    const conditions: string[] = []
    const params: any[] = []
    
    // 搜索条件（手机号码、省份、城市或备注）
    if (filters.searchTerm && filters.searchTerm.trim()) {
      conditions.push('(number LIKE ? OR province LIKE ? OR city LIKE ? OR note LIKE ?)')
      const searchPattern = `%${filters.searchTerm.trim()}%`
      params.push(searchPattern, searchPattern, searchPattern, searchPattern)
    }
    
    // 运营商筛选
    if (filters.carrier && filters.carrier !== 'all') {
      conditions.push('carrier = ?')
      params.push(filters.carrier)
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const limit = filters.limit || 100
    const offset = filters.offset || 0
    
    const query = `
      SELECT * FROM phone_numbers 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `
    
    params.push(limit, offset)
    
    const stmt = this.db.prepare(query)
    return stmt.all(...params) as PhoneNumber[]
  }

  // 复合条件统计手机号码数量
  countWithFilters(filters: {
    searchTerm?: string
    carrier?: string
  }): number {
    const conditions: string[] = []
    const params: any[] = []
    
    // 搜索条件（手机号码、省份、城市或备注）
    if (filters.searchTerm && filters.searchTerm.trim()) {
      conditions.push('(number LIKE ? OR province LIKE ? OR city LIKE ? OR note LIKE ?)')
      const searchPattern = `%${filters.searchTerm.trim()}%`
      params.push(searchPattern, searchPattern, searchPattern, searchPattern)
    }
    
    // 运营商筛选
    if (filters.carrier && filters.carrier !== 'all') {
      conditions.push('carrier = ?')
      params.push(filters.carrier)
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    
    const query = `SELECT COUNT(*) as count FROM phone_numbers ${whereClause}`
    
    const stmt = this.db.prepare(query)
    const result = stmt.get(...params) as { count: number }
    return result.count
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
export const phoneNumberDB = new PhoneNumberDB()