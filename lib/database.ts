import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

// 确保数据库目录存在
const dbDir = path.join(process.cwd(), 'data', 'db')
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

// 数据库文件路径
const dbPath = path.join(dbDir, 'sms_records.db')

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

  // 创建导入记录表
  const createImportRecordsTable = `
    CREATE TABLE IF NOT EXISTS import_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      import_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      total_processed INTEGER NOT NULL DEFAULT 0,
      success_count INTEGER NOT NULL DEFAULT 0,
      error_count INTEGER NOT NULL DEFAULT 0,
      success_rate REAL DEFAULT 0,
      duration_seconds INTEGER DEFAULT 0,
      status TEXT DEFAULT 'completed',
      notes TEXT,
      mysql_update_time DATETIME
    )
  `

  // 创建失败的公司数据表
  const createFailedCompaniesTable = `
    CREATE TABLE IF NOT EXISTS failed_companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      import_record_id INTEGER,
      company_id INTEGER,
      company_no TEXT,
      name TEXT,
      name_en TEXT,
      country TEXT,
      province TEXT,
      province_en TEXT,
      city TEXT,
      city_en TEXT,
      county TEXT,
      county_en TEXT,
      address TEXT,
      address_en TEXT,
      business_scope TEXT,
      business_scope_en TEXT,
      contact_person TEXT,
      contact_person_en TEXT,
      contact_person_title TEXT,
      contact_person_title_en TEXT,
      mobile TEXT,
      phone TEXT,
      email TEXT,
      intro TEXT,
      intro_en TEXT,
      whats_app TEXT,
      fax TEXT,
      postal_code TEXT,
      company_birth TEXT,
      is_verified INTEGER DEFAULT 0,
      homepage TEXT,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      retry_count INTEGER DEFAULT 0,
      FOREIGN KEY (import_record_id) REFERENCES import_records (id)
    )
  `
  
  // 创建索引以提升查询性能
  const createIndexes = [
    'CREATE INDEX IF NOT EXISTS idx_out_id ON sms_records (out_id)',
    'CREATE INDEX IF NOT EXISTS idx_phone_number ON sms_records (phone_number)', 
    'CREATE INDEX IF NOT EXISTS idx_status ON sms_records (status)',
    'CREATE INDEX IF NOT EXISTS idx_created_at ON sms_records (created_at)',
    'CREATE INDEX IF NOT EXISTS idx_phone_numbers_number ON phone_numbers (number)',
    'CREATE INDEX IF NOT EXISTS idx_phone_numbers_carrier ON phone_numbers (carrier)',
    'CREATE INDEX IF NOT EXISTS idx_import_records_date ON import_records (import_date)',
    'CREATE INDEX IF NOT EXISTS idx_failed_companies_import_id ON failed_companies (import_record_id)',
    'CREATE INDEX IF NOT EXISTS idx_failed_companies_company_id ON failed_companies (company_id)'
  ]
  
  try {
    db.exec(createSmsRecordsTable)
    console.log('SMS records table created/verified')
    
    db.exec(createPhoneNumbersTable)
    console.log('Phone numbers table created/verified')
    
    db.exec(createImportRecordsTable)
    console.log('Import records table created/verified')
    
    db.exec(createFailedCompaniesTable)
    console.log('Failed companies table created/verified')
    
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

// 导入记录类型定义
export interface ImportRecord {
  id?: number
  import_date?: string
  total_processed: number
  success_count: number
  error_count: number
  success_rate: number
  duration_seconds: number
  status: 'processing' | 'completed' | 'failed'
  notes?: string
  mysql_update_time?: string
}

// 失败公司数据类型定义
export interface FailedCompany {
  id?: number
  import_record_id: number
  company_id: number
  company_no?: string
  name?: string
  name_en?: string
  country?: string
  province?: string
  province_en?: string
  city?: string
  city_en?: string
  county?: string
  county_en?: string
  address?: string
  address_en?: string
  business_scope?: string
  business_scope_en?: string
  contact_person?: string
  contact_person_en?: string
  contact_person_title?: string
  contact_person_title_en?: string
  mobile?: string
  phone?: string
  email?: string
  intro?: string
  intro_en?: string
  whats_app?: string
  fax?: string
  postal_code?: string
  company_birth?: string
  is_verified?: number
  homepage?: string
  error_message?: string
  created_at?: string
  retry_count: number
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

  // 查询可重发的记录
  findResendableRecords(limit = 100, offset = 0): SmsRecord[] {
    const stmt = this.db.prepare(`
      SELECT * FROM sms_records 
      WHERE status IN ('发送失败', '发送中(已停止查询)') 
      OR (status = '发送中' AND created_at < datetime('now', '-10 minutes'))
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `)
    return stmt.all(limit, offset) as SmsRecord[]
  }

  // 检查记录是否可以重发
  canResend(outId: string): { canResend: boolean; reason?: string } {
    const record = this.findByOutId(outId)
    
    if (!record) {
      return { canResend: false, reason: '记录不存在' }
    }

    // 已送达的记录不允许重发
    if (record.status === '已送达') {
      return { canResend: false, reason: '已送达的记录不允许重发' }
    }

    // 检查重发间隔（最少5分钟）
    if (record.last_retry_at) {
      const lastRetryTime = new Date(record.last_retry_at).getTime()
      const now = Date.now()
      const intervalMinutes = (now - lastRetryTime) / (1000 * 60)
      
      if (intervalMinutes < 5) {
        return { canResend: false, reason: `请等待 ${Math.ceil(5 - intervalMinutes)} 分钟后再重发` }
      }
    }

    // 可以重发的状态
    const resendableStatuses = ['发送失败', '发送中(已停止查询)', '发送中']
    if (!resendableStatuses.includes(record.status)) {
      return { canResend: false, reason: `当前状态 "${record.status}" 不允许重发` }
    }

    return { canResend: true }
  }

  // 增加重试计数并更新时间
  incrementRetryCount(outId: string): boolean {
    const stmt = this.db.prepare(`
      UPDATE sms_records 
      SET retry_count = COALESCE(retry_count, 0) + 1,
          last_retry_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE out_id = ?
    `)
    
    const result = stmt.run(outId)
    return result.changes > 0
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
  
  // 获取所有唯一的运营商列表
  getUniqueCarriers(): string[] {
    const stmt = this.db.prepare(`
      SELECT DISTINCT carrier 
      FROM phone_numbers 
      WHERE carrier IS NOT NULL AND carrier != ''
      ORDER BY carrier
    `)
    const results = stmt.all() as { carrier: string }[]
    return results.map(row => row.carrier)
  }
  
  // 关闭数据库连接
  close() {
    if (this.db) {
      this.db.close()
    }
  }
}

// 导入记录数据库操作类
export class ImportRecordDB {
  private db: Database.Database
  
  constructor() {
    this.db = getDatabase()
  }
  
  // 插入导入记록
  insertRecord(record: Omit<ImportRecord, 'id' | 'import_date'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO import_records 
      (total_processed, success_count, error_count, success_rate, duration_seconds, status, notes, mysql_update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    const result = stmt.run(
      record.total_processed,
      record.success_count,
      record.error_count,
      record.success_rate,
      record.duration_seconds,
      record.status,
      record.notes || null,
      record.mysql_update_time || null
    )
    
    return result.lastInsertRowid as number
  }
  
  // 更新导入记录
  updateRecord(id: number, updates: Partial<ImportRecord>): boolean {
    const updateFields: string[] = []
    const values: any[] = []
    
    const allowedFields = ['total_processed', 'success_count', 'error_count', 'success_rate', 'duration_seconds', 'status', 'notes', 'mysql_update_time']
    
    for (const field of allowedFields) {
      if (field in updates && updates[field as keyof ImportRecord] !== undefined) {
        updateFields.push(`${field} = ?`)
        values.push(updates[field as keyof ImportRecord])
      }
    }
    
    if (updateFields.length === 0) return false
    
    values.push(id)
    
    const stmt = this.db.prepare(`
      UPDATE import_records 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `)
    
    const result = stmt.run(...values)
    return result.changes > 0
  }
  
  // 查询所有导入记录
  findAll(limit = 50, offset = 0): ImportRecord[] {
    const stmt = this.db.prepare(`
      SELECT * FROM import_records 
      ORDER BY import_date DESC 
      LIMIT ? OFFSET ?
    `)
    return stmt.all(limit, offset) as ImportRecord[]
  }
  
  // 根据ID查询记录
  findById(id: number): ImportRecord | null {
    const stmt = this.db.prepare('SELECT * FROM import_records WHERE id = ?')
    return stmt.get(id) as ImportRecord | null
  }
  
  // 查询最新的导入记录
  findLatest(): ImportRecord | null {
    const stmt = this.db.prepare(`
      SELECT * FROM import_records 
      ORDER BY import_date DESC 
      LIMIT 1
    `)
    return stmt.get() as ImportRecord | null
  }
  
  // 统计记录数量
  count(): number {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM import_records')
    const result = stmt.get() as { count: number }
    return result.count
  }
  
  // 删除记录
  deleteRecord(id: number): boolean {
    // 先删除关联的失败公司数据
    const deleteFailedCompanies = this.db.prepare('DELETE FROM failed_companies WHERE import_record_id = ?')
    deleteFailedCompanies.run(id)
    
    // 删除导入记录
    const stmt = this.db.prepare('DELETE FROM import_records WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }
}

// 失败公司数据数据库操作类
export class FailedCompanyDB {
  private db: Database.Database
  
  constructor() {
    this.db = getDatabase()
  }
  
  // 插入失败公司数据
  insertCompany(company: Omit<FailedCompany, 'id' | 'created_at'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO failed_companies 
      (import_record_id, company_id, company_no, name, name_en, country, province, province_en, city, city_en, 
       county, county_en, address, address_en, business_scope, business_scope_en, contact_person, contact_person_en,
       contact_person_title, contact_person_title_en, mobile, phone, email, intro, intro_en, whats_app, fax,
       postal_code, company_birth, is_verified, homepage, error_message, retry_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    const result = stmt.run(
      company.import_record_id,
      company.company_id,
      company.company_no || null,
      company.name || null,
      company.name_en || null,
      company.country || null,
      company.province || null,
      company.province_en || null,
      company.city || null,
      company.city_en || null,
      company.county || null,
      company.county_en || null,
      company.address || null,
      company.address_en || null,
      company.business_scope || null,
      company.business_scope_en || null,
      company.contact_person || null,
      company.contact_person_en || null,
      company.contact_person_title || null,
      company.contact_person_title_en || null,
      company.mobile || null,
      company.phone || null,
      company.email || null,
      company.intro || null,
      company.intro_en || null,
      company.whats_app || null,
      company.fax || null,
      company.postal_code || null,
      company.company_birth || null,
      company.is_verified || 0,
      company.homepage || null,
      company.error_message || null,
      company.retry_count
    )
    
    return result.lastInsertRowid as number
  }
  
  // 批量插入失败公司数据
  insertBatch(companies: Omit<FailedCompany, 'id' | 'created_at'>[]): number {
    const stmt = this.db.prepare(`
      INSERT INTO failed_companies 
      (import_record_id, company_id, company_no, name, name_en, country, province, province_en, city, city_en, 
       county, county_en, address, address_en, business_scope, business_scope_en, contact_person, contact_person_en,
       contact_person_title, contact_person_title_en, mobile, phone, email, intro, intro_en, whats_app, fax,
       postal_code, company_birth, is_verified, homepage, error_message, retry_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    const transaction = this.db.transaction((companies: Omit<FailedCompany, 'id' | 'created_at'>[]) => {
      let insertedCount = 0
      for (const company of companies) {
        stmt.run(
          company.import_record_id,
          company.company_id,
          company.company_no || null,
          company.name || null,
          company.name_en || null,
          company.country || null,
          company.province || null,
          company.province_en || null,
          company.city || null,
          company.city_en || null,
          company.county || null,
          company.county_en || null,
          company.address || null,
          company.address_en || null,
          company.business_scope || null,
          company.business_scope_en || null,
          company.contact_person || null,
          company.contact_person_en || null,
          company.contact_person_title || null,
          company.contact_person_title_en || null,
          company.mobile || null,
          company.phone || null,
          company.email || null,
          company.intro || null,
          company.intro_en || null,
          company.whats_app || null,
          company.fax || null,
          company.postal_code || null,
          company.company_birth || null,
          company.is_verified || 0,
          company.homepage || null,
          company.error_message || null,
          company.retry_count
        )
        insertedCount++
      }
      return insertedCount
    })
    
    return transaction(companies)
  }
  
  // 根据导入记录ID查询失败公司
  findByImportRecordId(importRecordId: number): FailedCompany[] {
    const stmt = this.db.prepare(`
      SELECT * FROM failed_companies 
      WHERE import_record_id = ? 
      ORDER BY created_at DESC
    `)
    return stmt.all(importRecordId) as FailedCompany[]
  }
  
  // 查询所有失败公司（分页）
  findAll(limit = 100, offset = 0): FailedCompany[] {
    const stmt = this.db.prepare(`
      SELECT * FROM failed_companies 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `)
    return stmt.all(limit, offset) as FailedCompany[]
  }
  
  // 根据ID查询失败公司
  findById(id: number): FailedCompany | null {
    const stmt = this.db.prepare('SELECT * FROM failed_companies WHERE id = ?')
    return stmt.get(id) as FailedCompany | null
  }
  
  // 更新重试次数
  updateRetryCount(id: number, retryCount: number): boolean {
    const stmt = this.db.prepare(`
      UPDATE failed_companies 
      SET retry_count = ?
      WHERE id = ?
    `)
    
    const result = stmt.run(retryCount, id)
    return result.changes > 0
  }
  
  // 删除失败公司记录
  deleteCompany(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM failed_companies WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }
  
  // 根据导入记录ID删除所有失败公司
  deleteByImportRecordId(importRecordId: number): number {
    const stmt = this.db.prepare('DELETE FROM failed_companies WHERE import_record_id = ?')
    const result = stmt.run(importRecordId)
    return result.changes
  }
  
  // 统计失败公司数量
  count(): number {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM failed_companies')
    const result = stmt.get() as { count: number }
    return result.count
  }
  
  // 根据导入记录ID统计失败公司数量
  countByImportRecordId(importRecordId: number): number {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM failed_companies WHERE import_record_id = ?')
    const result = stmt.get(importRecordId) as { count: number }
    return result.count
  }
}

// 导出单例实例
export const smsRecordDB = new SmsRecordDB()
export const phoneNumberDB = new PhoneNumberDB()
export const importRecordDB = new ImportRecordDB()
export const failedCompanyDB = new FailedCompanyDB()