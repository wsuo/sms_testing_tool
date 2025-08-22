import { getPlatformDatabase, MySQLDatabase, executeCompatibleQuery, executeCompatibleSingle, executeCompatibleRun } from './platform-database'
import { executePlatformQuery, executePlatformTransaction } from './platform-mysql'

// 创建数据库连接
let db: MySQLDatabase | null = null

export function getDatabase(): MySQLDatabase {
  if (!db) {
    db = getPlatformDatabase()
    console.log('MySQL Platform Database initialized')
  }
  return db
}

// 接口定义保持不变
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

export interface PhoneNumber {
  id?: number
  number: string
  carrier: string
  province?: string
  city?: string
  note?: string
  created_at?: string
  updated_at?: string
}

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

export interface Platform {
  id?: number
  name: string
  description?: string
  color?: string
  status: 'active' | 'inactive'
  created_at?: string
  updated_at?: string
}

export interface Project {
  id?: number
  name: string
  description?: string
  platform_id?: number
  status: 'active' | 'completed' | 'paused'
  start_date?: string
  end_date?: string
  created_at?: string
  updated_at?: string
}

export interface ProjectPhase {
  id?: number
  project_id: number
  name: string
  description?: string
  phase_order: number
  status: 'pending' | 'in_progress' | 'completed'
  start_date?: string
  end_date?: string
  created_at?: string
  updated_at?: string
}

export interface FeatureModule {
  id?: number
  project_id: number
  phase_id?: number
  name: string
  description?: string
  module_order?: number
  created_at?: string
  updated_at?: string
}

export interface FeatureItem {
  id?: number
  module_id: number
  name: string
  description?: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'pending' | 'in_progress' | 'completed' | 'testing' | 'deployed' | 'paused'
  progress_percentage: number
  estimated_hours?: number
  actual_hours?: number
  assignee?: string
  start_date?: string
  estimated_completion_date?: string
  actual_completion_date?: string
  notes?: string
  created_at?: string
  updated_at?: string
}

export interface ProgressRecord {
  id?: number
  feature_item_id: number
  old_status?: string
  new_status: string
  old_progress?: number
  new_progress?: number
  notes?: string
  updated_by?: string
  created_at?: string
}

export interface ExamCategory {
  id?: number
  name: string
  description?: string
  icon?: string
  color?: string
  sort_order?: number
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

export interface QuestionSet {
  id?: number
  name: string
  description?: string
  category_id?: number
  total_questions: number
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

export interface Question {
  id?: number
  set_id: number
  question_number: number
  section?: string
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: string
  explanation?: string
  created_at?: string
}

export interface TrainingRecord {
  id?: number
  employee_name: string
  set_id: number
  category_id?: number
  answers: string
  score: number
  total_questions: number
  started_at: string
  completed_at?: string
  ip_address?: string
  session_duration?: number
}

export interface AnswerItem {
  questionId: number
  questionNumber: number
  selectedAnswer: string
  correctAnswer: string
  isCorrect: boolean
}

// 简化的数据库操作类 - 只保留核心方法，全部转为异步
export class SmsRecordDB {
  private db: MySQLDatabase
  
  constructor() {
    this.db = getDatabase()
  }
  
  async insertRecord(record: Omit<SmsRecord, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
    // 转换日期格式为MySQL兼容格式
    let processedSendDate = record.send_date || null
    if (processedSendDate && typeof processedSendDate === 'string') {
      const date = new Date(processedSendDate)
      if (!isNaN(date.getTime())) {
        processedSendDate = date.toISOString().slice(0, 19).replace('T', ' ')
      }
    }
    
    const sql = `
      INSERT INTO sms_records 
      (out_id, phone_number, carrier, phone_note, template_code, template_name, template_params, content, send_date, status, error_code)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    const result = await executeCompatibleRun(sql, [
      record.out_id, record.phone_number, record.carrier || null, record.phone_note || null,
      record.template_code || null, record.template_name || null, record.template_params || null,
      record.content || null, processedSendDate, record.status, record.error_code || null
    ])
    return result.lastInsertRowid
  }
  
  async updateCarrierInfo(outId: string, carrier?: string, phoneNote?: string): Promise<boolean> {
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
    
    updateFields.push('updated_at = NOW()')
    values.push(outId)
    
    const sql = `UPDATE sms_records SET ${updateFields.join(', ')} WHERE out_id = ?`
    const result = await executeCompatibleRun(sql, values)
    return result.changes > 0
  }

  async updateStatus(outId: string, updates: Partial<Pick<SmsRecord, 'status' | 'error_code' | 'receive_date' | 'retry_count' | 'last_retry_at' | 'auto_refresh_enabled'>>): Promise<boolean> {
    const updateFields: string[] = []
    const values: any[] = []
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${key} = ?`)
        
        // 转换日期时间格式为MySQL兼容格式
        if ((key === 'last_retry_at' || key === 'receive_date') && typeof value === 'string') {
          // 将ISO 8601格式转换为MySQL datetime格式 (YYYY-MM-DD HH:mm:ss)
          const date = new Date(value)
          if (!isNaN(date.getTime())) {
            values.push(date.toISOString().slice(0, 19).replace('T', ' '))
          } else {
            values.push(value)
          }
        } else {
          values.push(value)
        }
      }
    })
    
    if (updateFields.length === 0) return false
    
    updateFields.push('updated_at = NOW()')
    values.push(outId)
    
    const sql = `UPDATE sms_records SET ${updateFields.join(', ')} WHERE out_id = ?`
    const result = await executeCompatibleRun(sql, values)
    return result.changes > 0
  }
  
  async findByOutId(outId: string): Promise<SmsRecord | null> {
    return await executeCompatibleSingle<SmsRecord>('SELECT * FROM sms_records WHERE out_id = ?', [outId])
  }
  
  async findAll(limit = 100, offset = 0): Promise<SmsRecord[]> {
    // 使用字符串拼接避免参数绑定问题
    const sql = `SELECT * FROM sms_records ORDER BY created_at DESC LIMIT ${parseInt(String(limit))} OFFSET ${parseInt(String(offset))}`
    return await executeCompatibleQuery<SmsRecord>(sql, [])
  }
  
  async findWithFilters(filters: any): Promise<SmsRecord[]> {
    const conditions: string[] = []
    const params: any[] = []
    
    if (filters.searchTerm && filters.searchTerm.trim()) {
      conditions.push('(phone_number LIKE ? OR out_id LIKE ?)')
      const searchPattern = `%${filters.searchTerm.trim()}%`
      params.push(searchPattern, searchPattern)
    }
    
    if (filters.status && filters.status !== 'all') {
      conditions.push('status = ?')
      params.push(filters.status)
    }
    
    if (filters.carrier && filters.carrier !== 'all') {
      conditions.push('carrier = ?')
      params.push(filters.carrier)
    }
    
    if (filters.templateName && filters.templateName !== 'all') {
      conditions.push('template_name = ?')
      params.push(filters.templateName)
    }
    
    if (filters.dateRange && filters.dateRange !== 'all') {
      switch (filters.dateRange) {
        case 'today':
          conditions.push("DATE(created_at) = CURDATE()")
          break
        case '2days':
          conditions.push("created_at >= DATE_SUB(NOW(), INTERVAL 2 DAY)")
          break
        case 'week':
          conditions.push("created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)")
          break
        case 'month':
          conditions.push("created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)")
          break
      }
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const limit = filters.limit || 100
    const offset = filters.offset || 0
    
    // 使用字符串拼接避免参数绑定问题
    const sql = `SELECT * FROM sms_records ${whereClause} ORDER BY created_at DESC LIMIT ${parseInt(String(limit))} OFFSET ${parseInt(String(offset))}`
    
    return await executeCompatibleQuery<SmsRecord>(sql, params)
  }

  async countWithFilters(filters: any): Promise<number> {
    // 类似的逻辑，但是用 COUNT(*)
    const conditions: string[] = []
    const params: any[] = []
    
    if (filters.searchTerm && filters.searchTerm.trim()) {
      conditions.push('(phone_number LIKE ? OR out_id LIKE ?)')
      const searchPattern = `%${filters.searchTerm.trim()}%`
      params.push(searchPattern, searchPattern)
    }
    
    if (filters.status && filters.status !== 'all') {
      conditions.push('status = ?')
      params.push(filters.status)
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const sql = `SELECT COUNT(*) as count FROM sms_records ${whereClause}`
    
    const result = await executeCompatibleSingle<{ count: number }>(sql, params)
    return result?.count || 0
  }
  
  async findPendingRecords(): Promise<SmsRecord[]> {
    return await executeCompatibleQuery<SmsRecord>(`
      SELECT * FROM sms_records 
      WHERE status IN ('发送中') AND auto_refresh_enabled = 1 AND (retry_count < 20 OR retry_count IS NULL)
      ORDER BY created_at DESC
    `)
  }

  async canResend(outId: string): Promise<{ canResend: boolean; reason?: string }> {
    const record = await this.findByOutId(outId)
    if (!record) return { canResend: false, reason: '记录不存在' }
    if (record.status === '已送达') return { canResend: false, reason: '已送达的记录不允许重发' }
    
    if (record.last_retry_at) {
      const lastRetryTime = new Date(record.last_retry_at).getTime()
      const intervalMinutes = (Date.now() - lastRetryTime) / (1000 * 60)
      if (intervalMinutes < 5) {
        return { canResend: false, reason: `请等待 ${Math.ceil(5 - intervalMinutes)} 分钟后再重发` }
      }
    }

    const resendableStatuses = ['发送失败', '发送中(已停止查询)', '发送中']
    if (!resendableStatuses.includes(record.status)) {
      return { canResend: false, reason: `当前状态 "${record.status}" 不允许重发` }
    }

    return { canResend: true }
  }

  async incrementRetryCount(outId: string): Promise<boolean> {
    const sql = `UPDATE sms_records SET retry_count = COALESCE(retry_count, 0) + 1, last_retry_at = NOW(), updated_at = NOW() WHERE out_id = ?`
    const result = await executeCompatibleRun(sql, [outId])
    return result.changes > 0
  }

  async findResendableRecords(limit = 20, offset = 0): Promise<SmsRecord[]> {
    const sql = `
      SELECT * FROM sms_records 
      WHERE status IN ('发送失败', '发送中(已停止查询)', '发送中') 
      ORDER BY created_at DESC 
      LIMIT ${parseInt(String(limit))} OFFSET ${parseInt(String(offset))}
    `
    return await executeCompatibleQuery<SmsRecord>(sql, [])
  }
  
  async count(): Promise<number> {
    const result = await executeCompatibleSingle<{ count: number }>('SELECT COUNT(*) as count FROM sms_records', [])
    return result?.count || 0
  }

  async countByStatus(status: string): Promise<number> {
    const result = await executeCompatibleSingle<{ count: number }>('SELECT COUNT(*) as count FROM sms_records WHERE status = ?', [status])
    return result?.count || 0
  }

  async deleteRecord(id: number): Promise<boolean> {
    const result = await executeCompatibleRun('DELETE FROM sms_records WHERE id = ?', [id])
    return result.changes > 0
  }

  async close() {
    if (this.db) {
      await this.db.close()
    }
  }
}

// 其他数据库操作类 - 简化版本
export class PhoneNumberDB {
  private db: MySQLDatabase
  
  constructor() {
    this.db = getDatabase()
  }
  
  async insertPhoneNumber(phoneNumber: Omit<PhoneNumber, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
    const sql = `INSERT INTO phone_numbers (number, carrier, province, city, note) VALUES (?, ?, ?, ?, ?)`
    const result = await executeCompatibleRun(sql, [
      phoneNumber.number, phoneNumber.carrier, phoneNumber.province || null, 
      phoneNumber.city || null, phoneNumber.note || null
    ])
    return result.lastInsertRowid
  }
  
  async findByNumber(number: string): Promise<PhoneNumber | null> {
    return await executeCompatibleSingle<PhoneNumber>('SELECT * FROM phone_numbers WHERE number = ?', [number])
  }
  
  async findAll(limit = 100, offset = 0): Promise<PhoneNumber[]> {
    const sql = `SELECT * FROM phone_numbers ORDER BY created_at DESC LIMIT ${parseInt(String(limit))} OFFSET ${parseInt(String(offset))}`
    return await executeCompatibleQuery<PhoneNumber>(sql, [])
  }
  
  async exists(number: string, excludeId?: number): Promise<boolean> {
    const sql = excludeId 
      ? 'SELECT COUNT(*) as count FROM phone_numbers WHERE number = ? AND id != ?'
      : 'SELECT COUNT(*) as count FROM phone_numbers WHERE number = ?'
    const params = excludeId ? [number, excludeId] : [number]
    
    const result = await executeCompatibleSingle<{ count: number }>(sql, params)
    return (result?.count || 0) > 0
  }
  
  async deletePhoneNumber(id: number): Promise<boolean> {
    const result = await executeCompatibleRun('DELETE FROM phone_numbers WHERE id = ?', [id])
    return result.changes > 0
  }

  async count(): Promise<number> {
    const result = await executeCompatibleSingle<{ count: number }>('SELECT COUNT(*) as count FROM phone_numbers', [])
    return result?.count || 0
  }

  async findById(id: number): Promise<PhoneNumber | null> {
    return await executeCompatibleSingle<PhoneNumber>('SELECT * FROM phone_numbers WHERE id = ?', [id])
  }

  async updatePhoneNumber(id: number, updates: Partial<Pick<PhoneNumber, 'number' | 'carrier' | 'province' | 'city' | 'note'>>): Promise<boolean> {
    const updateFields: string[] = []
    const values: any[] = []
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${key} = ?`)
        values.push(value)
      }
    })
    
    if (updateFields.length === 0) return false
    
    updateFields.push('updated_at = NOW()')
    values.push(id)
    
    const sql = `UPDATE phone_numbers SET ${updateFields.join(', ')} WHERE id = ?`
    const result = await executeCompatibleRun(sql, values)
    return result.changes > 0
  }

  async getUniqueCarriers(): Promise<string[]> {
    const result = await executeCompatibleQuery<{ carrier: string }>('SELECT DISTINCT carrier FROM phone_numbers WHERE carrier IS NOT NULL ORDER BY carrier', [])
    return result.map(row => row.carrier)
  }
}

// 导出单例实例
export const smsRecordDB = new SmsRecordDB()
export const phoneNumberDB = new PhoneNumberDB()

// 其他简化的数据库操作类实例
export class ImportRecordDB { 
  private db = getDatabase()
  async findAll(limit = 50, offset = 0): Promise<ImportRecord[]> {
    // 使用字符串插值而不是参数化查询，与其他方法保持一致
    const limitInt = parseInt(String(limit), 10)
    const offsetInt = parseInt(String(offset), 10)
    const sql = `SELECT * FROM import_records ORDER BY import_date DESC LIMIT ${limitInt} OFFSET ${offsetInt}`
    return await executeCompatibleQuery<ImportRecord>(sql, [])
  }
  
  async count(): Promise<number> {
    const result = await executeCompatibleSingle<{ count: number }>('SELECT COUNT(*) as count FROM import_records', [])
    return result?.count || 0
  }
  
  async deleteRecord(id: number): Promise<boolean> {
    const result = await executeCompatibleRun('DELETE FROM import_records WHERE id = ?', [id])
    return result.changes > 0
  }
}

export class FailedCompanyDB { 
  private db = getDatabase() 
  async findByImportRecordId(importRecordId: number): Promise<FailedCompany[]> {
    return await executeCompatibleQuery<FailedCompany>('SELECT * FROM failed_companies WHERE import_record_id = ? ORDER BY created_at DESC', [importRecordId])
  }
  
  async countByImportRecordId(importRecordId: number): Promise<number> {
    const result = await executeCompatibleSingle<{ count: number }>('SELECT COUNT(*) as count FROM failed_companies WHERE import_record_id = ?', [importRecordId])
    return result?.count || 0
  }
  
  async findAll(limit = 50, offset = 0): Promise<FailedCompany[]> {
    const sql = `SELECT * FROM failed_companies ORDER BY created_at DESC LIMIT ${parseInt(String(limit))} OFFSET ${parseInt(String(offset))}`
    return await executeCompatibleQuery<FailedCompany>(sql, [])
  }
  
  async count(): Promise<number> {
    const result = await executeCompatibleSingle<{ count: number }>('SELECT COUNT(*) as count FROM failed_companies', [])
    return result?.count || 0
  }
  
  async deleteCompany(id: number): Promise<boolean> {
    const result = await executeCompatibleRun('DELETE FROM failed_companies WHERE id = ?', [id])
    return result.changes > 0
  }
}

export class PlatformDB { 
  private db = getDatabase()
  async findAll(): Promise<Platform[]> {
    return await executeCompatibleQuery<Platform>('SELECT * FROM platforms WHERE status = ? ORDER BY created_at DESC', ['active'])
  }
}

export class ProjectDB { 
  private db = getDatabase()
  async findAll(): Promise<Project[]> {
    return await executeCompatibleQuery<Project>('SELECT * FROM projects ORDER BY created_at DESC')
  }
  
  async findById(id: number): Promise<Project | null> {
    return await executeCompatibleSingle<Project>('SELECT * FROM projects WHERE id = ?', [id])
  }
  
  async findByPlatformId(platformId: number): Promise<Project[]> {
    return await executeCompatibleQuery<Project>('SELECT * FROM projects WHERE platform_id = ? ORDER BY created_at DESC', [platformId])
  }
}

export class ExamCategoryDB { 
  private db = getDatabase()
  
  async findAll(): Promise<ExamCategory[]> {
    return await executeCompatibleQuery<ExamCategory>('SELECT * FROM exam_categories WHERE is_active = TRUE ORDER BY sort_order ASC', [])
  }
  
  async findById(id: number): Promise<ExamCategory | null> {
    return await executeCompatibleSingle<ExamCategory>('SELECT * FROM exam_categories WHERE id = ?', [id])
  }
  
  async insertCategory(category: Omit<ExamCategory, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
    const sql = `INSERT INTO exam_categories (name, description, icon, color, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?)`
    const result = await executeCompatibleRun(sql, [
      category.name, 
      category.description || null, 
      category.icon || 'BookOpen',
      category.color || '#3b82f6',
      category.sort_order || 0,
      category.is_active ?? true
    ])
    return result.lastInsertRowid
  }
  
  async updateCategory(id: number, updates: Partial<Pick<ExamCategory, 'name' | 'description' | 'icon' | 'color' | 'sort_order' | 'is_active'>>): Promise<boolean> {
    const updateFields: string[] = []
    const values: any[] = []
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${key} = ?`)
        values.push(value)
      }
    })
    
    if (updateFields.length === 0) return false
    
    updateFields.push('updated_at = NOW()')
    values.push(id)
    
    const sql = `UPDATE exam_categories SET ${updateFields.join(', ')} WHERE id = ?`
    const result = await executeCompatibleRun(sql, values)
    return result.changes > 0
  }
  
  async deleteCategory(id: number): Promise<boolean> {
    const result = await executeCompatibleRun('UPDATE exam_categories SET is_active = FALSE WHERE id = ?', [id])
    return result.changes > 0
  }
  
  async getCategoryStats(): Promise<any[]> {
    // 直接查询统计数据，而不依赖视图
    const sql = `
      SELECT 
        c.id,
        c.name,
        c.description,
        c.icon,
        c.color,
        c.sort_order,
        c.is_active,
        c.created_at,
        c.updated_at,
        COALESCE(qs.question_sets_count, 0) as question_sets_count,
        COALESCE(tr.exam_records_count, 0) as exam_records_count
      FROM exam_categories c
      LEFT JOIN (
        SELECT category_id, COUNT(*) as question_sets_count 
        FROM question_sets 
        WHERE is_active = TRUE 
        GROUP BY category_id
      ) qs ON c.id = qs.category_id
      LEFT JOIN (
        SELECT category_id, COUNT(*) as exam_records_count 
        FROM training_records 
        GROUP BY category_id
      ) tr ON c.id = tr.category_id
      WHERE c.is_active = TRUE
      ORDER BY c.sort_order ASC
    `
    return await executeCompatibleQuery<any>(sql, [])
  }
  
  async getActiveCategories(): Promise<ExamCategory[]> {
    return await executeCompatibleQuery<ExamCategory>('SELECT * FROM exam_categories WHERE is_active = TRUE ORDER BY sort_order ASC', [])
  }
}

export class QuestionSetDB { 
  private db = getDatabase()
  async findAll(): Promise<QuestionSet[]> {
    return await executeCompatibleQuery<QuestionSet>('SELECT * FROM question_sets ORDER BY created_at DESC')
  }

  async findAllActive(): Promise<QuestionSet[]> {
    return await executeCompatibleQuery<QuestionSet>('SELECT * FROM question_sets WHERE is_active = TRUE ORDER BY created_at DESC')
  }

  async findByCategory(categoryId: number): Promise<QuestionSet[]> {
    return await executeCompatibleQuery<QuestionSet>('SELECT * FROM question_sets WHERE category_id = ? AND is_active = TRUE ORDER BY created_at DESC', [categoryId])
  }

  async getRandomSet(): Promise<QuestionSet | null> {
    const result = await executeCompatibleSingle<QuestionSet>('SELECT * FROM question_sets WHERE is_active = TRUE ORDER BY RAND() LIMIT 1', [])
    return result || null
  }

  async getRandomSetByCategory(categoryId: number): Promise<QuestionSet | null> {
    const result = await executeCompatibleSingle<QuestionSet>('SELECT * FROM question_sets WHERE category_id = ? AND is_active = TRUE ORDER BY RAND() LIMIT 1', [categoryId])
    return result || null
  }

  async findById(id: number): Promise<QuestionSet | null> {
    return await executeCompatibleSingle<QuestionSet>('SELECT * FROM question_sets WHERE id = ?', [id])
  }
  
  async getQuestionsBySetId(setId: number): Promise<Question[]> {
    return await executeCompatibleQuery<Question>('SELECT * FROM questions WHERE set_id = ? ORDER BY question_number ASC', [setId])
  }
  
  async deleteQuestionsBySetId(setId: number): Promise<boolean> {
    const result = await executeCompatibleRun('DELETE FROM questions WHERE set_id = ?', [setId])
    return result.changes > 0
  }
  
  async deleteQuestionSet(setId: number): Promise<boolean> {
    const result = await executeCompatibleRun('DELETE FROM question_sets WHERE id = ?', [setId])
    return result.changes > 0
  }

  async insertQuestionSet(set: Omit<QuestionSet, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
    const sql = `INSERT INTO question_sets (name, description, category_id, total_questions, is_active) VALUES (?, ?, ?, ?, ?)`
    const result = await executeCompatibleRun(sql, [
      set.name, 
      set.description || null, 
      set.category_id || null,
      set.total_questions,
      set.is_active ?? true
    ])
    return result.lastInsertRowid
  }

  async updateQuestionSet(id: number, updates: Partial<Pick<QuestionSet, 'name' | 'description' | 'category_id' | 'total_questions' | 'is_active'>>): Promise<boolean> {
    const updateFields: string[] = []
    const values: any[] = []
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${key} = ?`)
        values.push(value)
      }
    })
    
    if (updateFields.length === 0) return false
    
    updateFields.push('updated_at = NOW()')
    values.push(id)
    
    const sql = `UPDATE question_sets SET ${updateFields.join(', ')} WHERE id = ?`
    const result = await executeCompatibleRun(sql, values)
    return result.changes > 0
  }
}

export class QuestionDB { 
  private db = getDatabase()
  async findBySetId(setId: number): Promise<Question[]> {
    return await executeCompatibleQuery<Question>('SELECT * FROM questions WHERE set_id = ? ORDER BY question_number ASC', [setId])
  }

  async countBySetId(setId: number): Promise<number> {
    const result = await executeCompatibleSingle<{ count: number }>('SELECT COUNT(*) as count FROM questions WHERE set_id = ?', [setId])
    return result?.count || 0
  }

  async insertQuestion(question: Omit<Question, 'id' | 'created_at'>): Promise<number> {
    const sql = `INSERT INTO questions (set_id, question_number, section, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    const result = await executeCompatibleRun(sql, [
      question.set_id,
      question.question_number,
      question.section || null,
      question.question_text,
      question.option_a,
      question.option_b,
      question.option_c,
      question.option_d,
      question.correct_answer,
      question.explanation || null
    ])
    return result.lastInsertRowid
  }

  async deleteQuestion(id: number): Promise<boolean> {
    const result = await executeCompatibleRun('DELETE FROM questions WHERE id = ?', [id])
    return result.changes > 0
  }

  async deleteBySetId(setId: number): Promise<number> {
    const result = await executeCompatibleRun('DELETE FROM questions WHERE set_id = ?', [setId])
    return result.changes
  }
}

export class TrainingRecordDB { 
  private db = getDatabase()
  async insertRecord(record: Omit<TrainingRecord, 'id' | 'completed_at'>): Promise<number> {
    // 转换日期格式为MySQL兼容格式
    let processedStartedAt = record.started_at
    if (processedStartedAt && typeof processedStartedAt === 'string') {
      const date = new Date(processedStartedAt)
      if (!isNaN(date.getTime())) {
        processedStartedAt = date.toISOString().slice(0, 19).replace('T', ' ')
      }
    }
    
    const sql = `INSERT INTO training_records (employee_name, set_id, category_id, answers, score, total_questions, started_at, ip_address, session_duration) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    const result = await executeCompatibleRun(sql, [
      record.employee_name, record.set_id, record.category_id || null, record.answers, record.score, 
      record.total_questions, processedStartedAt, record.ip_address || null, record.session_duration || null
    ])
    return result.lastInsertRowid
  }
  
  async findAll(limit = 100, offset = 0): Promise<TrainingRecord[]> {
    const sql = `SELECT * FROM training_records ORDER BY completed_at DESC LIMIT ${parseInt(String(limit))} OFFSET ${parseInt(String(offset))}`
    return await executeCompatibleQuery<TrainingRecord>(sql, [])
  }

  async findWithFilters(filters: any): Promise<TrainingRecord[]> {
    const conditions: string[] = []
    const params: any[] = []
    
    if (filters.employeeName) {
      conditions.push('employee_name LIKE ?')
      params.push(`%${filters.employeeName}%`)
    }
    
    if (filters.setId) {
      conditions.push('set_id = ?')
      params.push(filters.setId)
    }

    if (filters.categoryId) {
      conditions.push('category_id = ?')
      params.push(filters.categoryId)
    }
    
    if (filters.minScore !== undefined) {
      conditions.push('score >= ?')
      params.push(filters.minScore)
    }
    
    if (filters.maxScore !== undefined) {
      conditions.push('score <= ?')
      params.push(filters.maxScore)
    }
    
    if (filters.dateRange) {
      switch (filters.dateRange) {
        case 'today':
          conditions.push("DATE(completed_at) = CURDATE()")
          break
        case 'week':
          conditions.push("completed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)")
          break
        case 'month':
          conditions.push("completed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)")
          break
      }
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const limit = filters.limit || 100
    const offset = filters.offset || 0
    
    const sql = `SELECT * FROM training_records ${whereClause} ORDER BY completed_at DESC LIMIT ${limit} OFFSET ${offset}`
    
    return await executeCompatibleQuery<TrainingRecord>(sql, params)
  }

  async countWithFilters(filters: any): Promise<number> {
    const conditions: string[] = []
    const params: any[] = []
    
    if (filters.employeeName) {
      conditions.push('employee_name LIKE ?')
      params.push(`%${filters.employeeName}%`)
    }
    
    if (filters.setId) {
      conditions.push('set_id = ?')
      params.push(filters.setId)
    }

    if (filters.categoryId) {
      conditions.push('category_id = ?')
      params.push(filters.categoryId)
    }
    
    if (filters.minScore !== undefined) {
      conditions.push('score >= ?')
      params.push(filters.minScore)
    }
    
    if (filters.maxScore !== undefined) {
      conditions.push('score <= ?')
      params.push(filters.maxScore)
    }
    
    if (filters.dateRange) {
      switch (filters.dateRange) {
        case 'today':
          conditions.push("DATE(completed_at) = CURDATE()")
          break
        case 'week':
          conditions.push("completed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)")
          break
        case 'month':
          conditions.push("completed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)")
          break
      }
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const sql = `SELECT COUNT(*) as count FROM training_records ${whereClause}`
    
    const result = await executeCompatibleSingle<{ count: number }>(sql, params)
    return result?.count || 0
  }

  async count(): Promise<number> {
    const result = await executeCompatibleSingle<{ count: number }>('SELECT COUNT(*) as count FROM training_records', [])
    return result?.count || 0
  }

  async getTrainingStats(): Promise<any> {
    const totalRecords = await this.count()
    const passedCount = await executeCompatibleSingle<{ count: number }>('SELECT COUNT(*) as count FROM training_records WHERE score >= 60', [])
    const averageScore = await executeCompatibleSingle<{ avg: number }>('SELECT AVG(score) as avg FROM training_records', [])
    
    return {
      totalRecords,
      passedCount: passedCount?.count || 0,
      failedCount: totalRecords - (passedCount?.count || 0),
      averageScore: Math.round(averageScore?.avg || 0)
    }
  }

  async getScoreDistribution(): Promise<any[]> {
    const distribution = await executeCompatibleQuery<{ score_range: string, count: number }>(`
      SELECT 
        CASE 
          WHEN score >= 90 THEN '90-100'
          WHEN score >= 80 THEN '80-89'
          WHEN score >= 70 THEN '70-79'
          WHEN score >= 60 THEN '60-69'
          ELSE '0-59'
        END as score_range,
        COUNT(*) as count
      FROM training_records 
      GROUP BY score_range
      ORDER BY score_range DESC
    `, [])
    
    return distribution
  }

  async findById(id: number): Promise<TrainingRecord | null> {
    return await executeCompatibleSingle<TrainingRecord>('SELECT * FROM training_records WHERE id = ?', [id])
  }

  async deleteRecord(id: number): Promise<boolean> {
    const result = await executeCompatibleRun('DELETE FROM training_records WHERE id = ?', [id])
    return result.changes > 0
  }

  async findByEmployeeName(employeeName: string): Promise<TrainingRecord[]> {
    return await executeCompatibleQuery<TrainingRecord>(
      'SELECT * FROM training_records WHERE employee_name = ? ORDER BY completed_at DESC', 
      [employeeName]
    )
  }
  
  async findBySetId(setId: number): Promise<TrainingRecord[]> {
    return await executeCompatibleQuery<TrainingRecord>(
      'SELECT * FROM training_records WHERE set_id = ? ORDER BY completed_at DESC', 
      [setId]
    )
  }
}

export class SystemConfigDB { 
  private db = getDatabase()
  
  async getConfig(key: string): Promise<string | null> {
    const result = await executeCompatibleSingle<{ value: string }>('SELECT value FROM system_config WHERE `key` = ?', [key])
    return result?.value || null
  }
  
  async setConfig(key: string, value: string, description?: string): Promise<boolean> {
    const sql = `INSERT INTO system_config (\`key\`, value, description, updated_at) VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE value = VALUES(value), description = COALESCE(VALUES(description), description), updated_at = NOW()`
    const result = await executeCompatibleRun(sql, [key, value, description])
    return result.changes > 0
  }

  async getTrainingPassScore(): Promise<number> {
    const scoreStr = await this.getConfig('training_pass_score')
    return scoreStr ? parseInt(scoreStr) : 60
  }

  async getExamTimeLimit(): Promise<number> {
    const timeLimitStr = await this.getConfig('exam_time_limit')
    return timeLimitStr ? parseInt(timeLimitStr) : 35
  }

  async getAllConfigs(): Promise<any[]> {
    return await executeCompatibleQuery<any>('SELECT * FROM system_config ORDER BY `key`', [])
  }

  async setTrainingPassScore(score: number): Promise<boolean> {
    return await this.setConfig('training_pass_score', score.toString(), '培训考试合格分数线')
  }

  async deleteConfig(key: string): Promise<boolean> {
    const result = await executeCompatibleRun('DELETE FROM system_config WHERE `key` = ?', [key])
    return result.changes > 0
  }
}

// 导出其他实例
export const importRecordDB = new ImportRecordDB()
export const failedCompanyDB = new FailedCompanyDB()
export const platformDB = new PlatformDB()
export const projectDB = new ProjectDB()
export const examCategoryDB = new ExamCategoryDB()
export const questionSetDB = new QuestionSetDB()
export const questionDB = new QuestionDB()
export const trainingRecordDB = new TrainingRecordDB()
export const systemConfigDB = new SystemConfigDB()

// ========== 项目管理相关类定义 ==========
export class ProjectPhaseDB {
  private db = getDatabase()
  
  async findByProjectId(projectId: number): Promise<ProjectPhase[]> {
    return await executeCompatibleQuery<ProjectPhase>('SELECT * FROM project_phases WHERE project_id = ? ORDER BY id ASC', [projectId])
  }
  
  async insertPhase(phase: Omit<ProjectPhase, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
    const result = await executeCompatibleRun(`
      INSERT INTO project_phases (project_id, name, description, phase_order, status, start_date, end_date, dependencies, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      phase.project_id,
      phase.name,
      phase.description || null,
      phase.phase_order || 1,
      phase.status || 'pending',
      phase.start_date || null,
      phase.end_date || null,
      phase.dependencies || null,
      phase.notes || null
    ])
    
    return result.insertId
  }
}

export class FeatureModuleDB {
  private db = getDatabase()
  
  async findByPhaseId(phaseId: number): Promise<FeatureModule[]> {
    return await executeCompatibleQuery<FeatureModule>('SELECT * FROM feature_modules WHERE phase_id = ? ORDER BY id ASC', [phaseId])
  }
}

export class FeatureItemDB {
  private db = getDatabase()
  
  async findByModuleId(moduleId: number): Promise<FeatureItem[]> {
    return await executeCompatibleQuery<FeatureItem>('SELECT * FROM feature_items WHERE module_id = ? ORDER BY id ASC', [moduleId])
  }
  
  async getProjectStats(projectId: number) {
    // 实现项目统计逻辑 - 明确指定列名以避免歧义
    const stats = await executeCompatibleSingle<any>(`
      SELECT 
        COUNT(*) as totalItems,
        SUM(CASE WHEN fi.status IN ('completed', 'deployed') THEN 1 ELSE 0 END) as completedItems,
        SUM(CASE WHEN fi.status = 'in_progress' THEN 1 ELSE 0 END) as inProgressItems,
        SUM(CASE WHEN fi.status = 'pending' THEN 1 ELSE 0 END) as pendingItems
      FROM feature_items fi
      JOIN feature_modules fm ON fi.module_id = fm.id
      JOIN project_phases pp ON fm.phase_id = pp.id
      WHERE pp.project_id = ?
    `, [projectId])
    
    const totalItems = stats?.totalItems || 0
    const completedItems = stats?.completedItems || 0
    
    return {
      totalItems,
      completedItems,
      inProgressItems: stats?.inProgressItems || 0,
      pendingItems: stats?.pendingItems || 0,
      completionRate: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0
    }
  }
}

export class ProgressRecordDB {
  private db = getDatabase()
  
  async findByFeatureItemId(featureItemId: number): Promise<ProgressRecord[]> {
    return await executeCompatibleQuery<ProgressRecord>('SELECT * FROM progress_records WHERE feature_item_id = ? ORDER BY created_at DESC', [featureItemId])
  }
}

// ========== 项目管理相关数据库实例 ==========
export const projectPhaseDB = new ProjectPhaseDB()
export const featureModuleDB = new FeatureModuleDB()
export const featureItemDB = new FeatureItemDB()
export const progressRecordDB = new ProgressRecordDB()