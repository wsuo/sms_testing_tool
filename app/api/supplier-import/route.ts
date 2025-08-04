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
  company_birth?: string
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

export async function POST(request: NextRequest) {
  try {
    const { companies } = await request.json()

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

    // 准备事务查询
    const queries: Array<{ sql: string; params: any[] }> = []

    for (const company of companies) {
      try {
        // 更新或插入seller_company表的SQL
        const updateCompanySQL = `
          INSERT INTO seller_company (
            company_id, company_no, name, country, province, city, county,
            address, business_scope, contact_person, contact_person_title,
            mobile, phone, email, intro, whats_app, fax, postal_code,
            company_birth, is_verified, homepage, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
          ON DUPLICATE KEY UPDATE
            company_no = VALUES(company_no),
            name = VALUES(name),
            country = VALUES(country),
            province = VALUES(province),
            city = VALUES(city),
            county = VALUES(county),
            address = VALUES(address),
            business_scope = VALUES(business_scope),
            contact_person = VALUES(contact_person),
            contact_person_title = VALUES(contact_person_title),
            mobile = VALUES(mobile),
            phone = VALUES(phone),
            email = VALUES(email),
            intro = VALUES(intro),
            whats_app = VALUES(whats_app),
            fax = VALUES(fax),
            postal_code = VALUES(postal_code),
            company_birth = VALUES(company_birth),
            is_verified = VALUES(is_verified),
            homepage = VALUES(homepage),
            updated_at = NOW()
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
            company.company_birth || null,
            company.is_verified || 0,
            company.homepage || null
          ]
        })

        // 更新或插入seller_company_lang表的SQL（英文）
        const updateLangSQL = `
          INSERT INTO seller_company_lang (
            company_id, language_code, name, province, city, county,
            address, business_scope, contact_person, contact_person_title,
            intro, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
          ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            province = VALUES(province),
            city = VALUES(city),
            county = VALUES(county),
            address = VALUES(address),
            business_scope = VALUES(business_scope),
            contact_person = VALUES(contact_person),
            contact_person_title = VALUES(contact_person_title),
            intro = VALUES(intro),
            updated_at = NOW()
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

        result.successCount++
      } catch (error) {
        result.errorCount++
        result.errors.push(`公司ID ${company.company_id}: ${error instanceof Error ? error.message : '未知错误'}`)
      }
    }

    // 执行事务
    if (queries.length > 0) {
      await executeTransaction(queries)
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('导入失败:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '导入失败' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ message: '供应商导入API' })
}
