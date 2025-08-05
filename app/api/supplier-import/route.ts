import { NextRequest, NextResponse } from 'next/server'
import { executeTransaction, testConnection } from '@/lib/mysql'

interface CompanyData {
  company_id: number
  company_no?: string
  name: string
  name_en: string
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
  company_birth?: string | number
  is_verified?: number
  homepage?: string
}

interface ImportResult {
  totalProcessed: number
  successCount: number
  errorCount: number
  errors: string[]
}

// 验证数据库连接
async function validateDatabaseConnection(): Promise<void> {
  const isConnected = await testConnection()
  if (!isConnected) {
    throw new Error('无法连接到MySQL数据库，请检查配置')
  }
}

// MySQL错误信息转换为中文友好提示
function getMySQLErrorMessage(error: any): string {
  if (!error || typeof error !== 'object') {
    return '数据库操作失败'
  }

  const { code, errno, sqlMessage, sqlState } = error
  
  // 根据MySQL错误代码返回中文提示
  switch (code) {
    case 'ER_DATA_TOO_LONG':
      // 从sqlMessage中提取字段名
      const fieldMatch = sqlMessage?.match(/column '(\w+)'/)
      const fieldName = fieldMatch ? fieldMatch[1] : '某个字段'
      const fieldNameMap: { [key: string]: string } = {
        'province': '省份',
        'city': '城市', 
        'county': '县区',
        'name': '公司名称',
        'address': '地址',
        'business_scope': '经营范围',
        'contact_person': '联系人',
        'intro': '公司简介'
      }
      const chineseFieldName = fieldNameMap[fieldName] || fieldName
      return `${chineseFieldName}信息过长，请检查数据长度或联系管理员调整数据库字段限制`
    
    case 'ER_DUP_ENTRY':
      return '数据重复，该记录已存在'
    
    case 'ER_NO_REFERENCED_ROW_2':
      return '关联数据不存在，请检查外键约束'
    
    case 'ER_BAD_NULL_ERROR':
      const nullFieldMatch = sqlMessage?.match(/Column '(\w+)' cannot be null/)
      const nullField = nullFieldMatch ? nullFieldMatch[1] : '必填字段'
      return `${nullField}不能为空`
    
    case 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD':
      return '数据格式错误，请检查数据类型'
    
    case 'ER_OUT_OF_RANGE_VALUE':
      return '数值超出允许范围'
    
    case 'ECONNREFUSED':
      return '无法连接到数据库服务器'
    
    case 'ER_ACCESS_DENIED_ERROR':
      return '数据库访问权限不足'
    
    case 'ER_BAD_DB_ERROR':
      return '指定的数据库不存在'
    
    case 'ER_TABLE_EXISTS_ERROR':
      return '数据表已存在'
    
    case 'ER_NO_SUCH_TABLE':
      return '数据表不存在'
    
    default:
      // 如果有sqlMessage，尝试提取有用信息
      if (sqlMessage) {
        return `数据库操作失败：${sqlMessage}`
      }
      return `数据库错误 (${code || errno || 'UNKNOWN'})`
  }
}

export async function POST(request: NextRequest) {
  try {
    const { companies, batchSize = 50 } = await request.json()

    if (!companies || !Array.isArray(companies)) {
      return NextResponse.json(
        { error: '无效的数据格式' },
        { status: 400 }
      )
    }

    // 验证数据库连接
    await validateDatabaseConnection()

    const result: ImportResult = {
      totalProcessed: companies.length,
      successCount: 0,
      errorCount: 0,
      errors: []
    }

    // 分批处理数据
    const batches = []
    for (let i = 0; i < companies.length; i += batchSize) {
      batches.push(companies.slice(i, i + batchSize))
    }

    // 逐批处理
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]
      const queries: Array<{ sql: string; params: any[] }> = []

      // 为当前批次准备SQL查询
      for (const company of batch) {
        try {
          // 更新或插入seller_company表的SQL
          // 使用REPLACE语句处理唯一键冲突
          const updateCompanySQL = `
            REPLACE INTO seller_company (
              company_id, company_no, name, country, province, city, county,
              address, business_scope, contact_person, contact_person_title,
              mobile, phone, email, intro, whats_app, fax, postal_code,
              company_birth, is_verified, homepage, update_time
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
          `

          queries.push({
            sql: updateCompanySQL,
            params: [
              company.company_id,
              company.company_no || null,
              company.name || null,
              company.country || null,
              company.province || null,
              company.city || null,
              company.county || null,
              company.address || null,
              company.business_scope || null,
              company.contact_person || null,
              company.contact_person_title || null,
              company.mobile || null,
              company.phone || null,
              company.email || null,
              company.intro || null,
              company.whats_app || null,
              company.fax || null,
              company.postal_code || null,
              company.company_birth ? parseInt(String(company.company_birth)) || null : null,
              company.is_verified || 0,
              company.homepage || null
            ]
          })

          // 更新或插入seller_company_lang表的SQL（英文）
          // 使用REPLACE处理可能的重复键问题
          const updateLangSQL = `
            REPLACE INTO seller_company_lang (
              company_id, language_code, name, province, city, county,
              address, business_scope, contact_person, contact_person_title,
              intro
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `

          queries.push({
            sql: updateLangSQL,
            params: [
              company.company_id,
              'en-US',
              company.name_en || null,
              company.province_en || null,
              company.city_en || null,
              company.county_en || null,
              company.address_en || null,
              company.business_scope_en || null,
              company.contact_person_en || null,
              company.contact_person_title_en || null,
              company.intro_en || null
            ]
          })

        } catch (error) {
          result.errorCount++
          const friendlyError = getMySQLErrorMessage(error)
          result.errors.push(`公司ID ${company.company_id}: ${friendlyError}`)
        }
      }

      // 执行当前批次的事务
      if (queries.length > 0) {
        try {
          await executeTransaction(queries)
          result.successCount += batch.length
        } catch (error) {
          result.errorCount += batch.length
          const friendlyError = getMySQLErrorMessage(error)
          result.errors.push(`批次 ${batchIndex + 1} 处理失败: ${friendlyError}`)
        }
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('导入失败:', error)
    const friendlyError = getMySQLErrorMessage(error)
    return NextResponse.json(
      { error: friendlyError },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ message: '供应商导入API' })
}
