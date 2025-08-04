import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/mysql'
import * as XLSX from 'xlsx'

interface CompanyExportData {
  company_id: number
  company_no: string
  name: string
  name_en: string
  country: string
  province: string
  province_en: string
  city: string
  city_en: string
  county: string
  county_en: string
  address: string
  address_en: string
  business_scope: string
  business_scope_en: string
  contact_person: string
  contact_person_en: string
  contact_person_title: string
  contact_person_title_en: string
  mobile: string
  phone: string
  email: string
  intro: string
  intro_en: string
  whats_app: string
  fax: string
  postal_code: string
  company_birth: number | null
  is_verified: number
  homepage: string
}

// 处理全量导出的函数
async function handleFullExport(format: string) {
  try {
    // 首先获取总数量
    const countSql = `SELECT COUNT(*) as total FROM seller_company WHERE deleted = 0`
    const countResult = await executeQuery(countSql, []) as any[]
    const totalCount = countResult[0]?.total || 0

    if (totalCount === 0) {
      return NextResponse.json({
        success: false,
        error: '没有找到可导出的数据'
      }, { status: 404 })
    }

    // 如果数据量太大，建议分批导出
    if (totalCount > 50000) {
      return NextResponse.json({
        success: false,
        error: `数据量过大（${totalCount} 条），建议分批导出或联系管理员`,
        totalCount,
        suggestion: '建议每次导出不超过10000条数据'
      }, { status: 400 })
    }

    // 分批查询数据，避免内存溢出
    const batchSize = 1000
    const allCompanies: any[] = []

    for (let offset = 0; offset < totalCount; offset += batchSize) {
      const batchSql = `
        SELECT
          company_id, company_no, name, country, province, city, county,
          address, business_scope, contact_person, contact_person_title,
          mobile, phone, email, intro, whats_app, fax, postal_code,
          company_birth, is_verified, homepage
        FROM seller_company
        WHERE deleted = 0
        ORDER BY company_id ASC
        LIMIT ${batchSize} OFFSET ${offset}
      `

      const batchCompanies = await executeQuery(batchSql, []) as any[]
      allCompanies.push(...batchCompanies)

      // 避免阻塞事件循环
      if (offset % 5000 === 0) {
        await new Promise(resolve => setImmediate(resolve))
      }
    }

    // 获取所有公司的英文数据
    const companyIds = allCompanies.map(c => c.company_id)
    const langData = await getBatchLangData(companyIds)

    // 合并数据
    const exportData = mergeCompanyData(allCompanies, langData)

    if (format === 'json') {
      return NextResponse.json({
        success: true,
        data: exportData,
        total: exportData.length,
        message: `成功导出 ${exportData.length} 条数据`
      })
    }

    // 生成Excel文件
    return generateExcelResponse(exportData, `companies_full_export_${new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')}.xlsx`)

  } catch (error) {
    console.error('Full export error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '全量导出失败'
    }, { status: 500 })
  }
}

// 批量获取语言数据
async function getBatchLangData(companyIds: number[]) {
  if (companyIds.length === 0) return []

  const batchSize = 1000
  const allLangData: any[] = []

  for (let i = 0; i < companyIds.length; i += batchSize) {
    const batchIds = companyIds.slice(i, i + batchSize)
    const placeholders = batchIds.map(() => '?').join(',')

    const langSql = `
      SELECT
        company_id, name, province, city, county, address,
        business_scope, contact_person, contact_person_title, intro
      FROM seller_company_lang
      WHERE company_id IN (${placeholders})
        AND language_code = 'en-US'
        AND deleted = 0
    `

    const batchLangData = await executeQuery(langSql, batchIds.map(id => id.toString())) as any[]
    allLangData.push(...batchLangData)
  }

  return allLangData
}

// 合并公司数据和语言数据
function mergeCompanyData(companies: any[], langData: any[]): CompanyExportData[] {
  const langMap = new Map()
  langData.forEach(lang => {
    langMap.set(lang.company_id, lang)
  })

  return companies.map(company => {
    const lang = langMap.get(company.company_id) || {}

    return {
      company_id: company.company_id,
      company_no: company.company_no || '',
      name: company.name || '',
      name_en: lang.name || '',
      country: company.country || '',
      province: company.province || '',
      province_en: lang.province || '',
      city: company.city || '',
      city_en: lang.city || '',
      county: company.county || '',
      county_en: lang.county || '',
      address: company.address || '',
      address_en: lang.address || '',
      business_scope: company.business_scope || '',
      business_scope_en: lang.business_scope || '',
      contact_person: company.contact_person || '',
      contact_person_en: lang.contact_person || '',
      contact_person_title: company.contact_person_title || '',
      contact_person_title_en: lang.contact_person_title || '',
      mobile: company.mobile || '',
      phone: company.phone || '',
      email: company.email || '',
      intro: company.intro || '',
      intro_en: lang.intro || '',
      whats_app: company.whats_app || '',
      fax: company.fax || '',
      postal_code: company.postal_code || '',
      company_birth: company.company_birth,
      is_verified: company.is_verified || 0,
      homepage: company.homepage || ''
    }
  })
}

// 生成Excel响应
function generateExcelResponse(data: CompanyExportData[], filename: string) {
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Companies')

  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'buffer'
  })

  return new NextResponse(excelBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': excelBuffer.length.toString()
    }
  })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'excel'
    const exportType = searchParams.get('type') || 'sample' // sample, custom, all
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    // 根据导出类型设置不同的限制
    let actualLimit = limit
    let actualOffset = offset

    switch (exportType) {
      case 'sample':
        actualLimit = Math.min(limit, 100) // 示例最多100条
        break
      case 'custom':
        actualLimit = Math.min(limit, 10000) // 自定义最多10000条
        break
      case 'all':
        // 全量导出需要特殊处理
        return await handleFullExport(format)
      default:
        actualLimit = 100
    }

    // 查询公司数据
    const companySql = `
      SELECT
        company_id, company_no, name, country, province, city, county,
        address, business_scope, contact_person, contact_person_title,
        mobile, phone, email, intro, whats_app, fax, postal_code,
        company_birth, is_verified, homepage
      FROM seller_company
      WHERE deleted = 0
      ORDER BY company_id ASC
      LIMIT ${actualLimit} OFFSET ${actualOffset}
    `

    const companies = await executeQuery(companySql, []) as any[]

    if (companies.length === 0) {
      return NextResponse.json({
        success: false,
        error: '没有找到可导出的数据'
      }, { status: 404 })
    }

    // 获取公司ID列表并查询英文数据
    const companyIds = companies.map(c => c.company_id)
    const langData = await getBatchLangData(companyIds)

    // 合并数据
    const exportData = mergeCompanyData(companies, langData)

    if (format === 'json') {
      return NextResponse.json({
        success: true,
        data: exportData,
        total: exportData.length,
        exportType,
        message: `成功导出 ${exportData.length} 条数据`
      })
    }

    // 生成Excel文件
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')
    const filename = `companies_${exportType}_${timestamp}.xlsx`

    return generateExcelResponse(exportData, filename)

  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '导出失败'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { companyIds, format = 'excel' } = await request.json()

    if (!companyIds || !Array.isArray(companyIds) || companyIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: '请提供要导出的公司ID列表'
      }, { status: 400 })
    }

    const placeholders = companyIds.map(() => '?').join(',')

    // 查询指定公司数据
    const companySql = `
      SELECT 
        company_id, company_no, name, country, province, city, county,
        address, business_scope, contact_person, contact_person_title,
        mobile, phone, email, intro, whats_app, fax, postal_code,
        company_birth, is_verified, homepage
      FROM seller_company 
      WHERE company_id IN (${placeholders}) AND deleted = 0
      ORDER BY company_id ASC
    `

    const companies = await executeQuery(companySql, companyIds) as any[]

    if (companies.length === 0) {
      return NextResponse.json({
        success: false,
        error: '没有找到指定的公司数据'
      }, { status: 404 })
    }

    // 查询英文数据
    const langSql = `
      SELECT 
        company_id, name, province, city, county, address, 
        business_scope, contact_person, contact_person_title, intro
      FROM seller_company_lang 
      WHERE company_id IN (${placeholders}) 
        AND language_code = 'en-US' 
        AND deleted = 0
    `

    const langData = await executeQuery(langSql, companyIds) as any[]

    // 创建英文数据映射
    const langMap = new Map()
    langData.forEach(lang => {
      langMap.set(lang.company_id, lang)
    })

    // 合并数据
    const exportData: CompanyExportData[] = companies.map(company => {
      const lang = langMap.get(company.company_id) || {}
      
      return {
        company_id: company.company_id,
        company_no: company.company_no || '',
        name: company.name || '',
        name_en: lang.name || '',
        country: company.country || '',
        province: company.province || '',
        province_en: lang.province || '',
        city: company.city || '',
        city_en: lang.city || '',
        county: company.county || '',
        county_en: lang.county || '',
        address: company.address || '',
        address_en: lang.address || '',
        business_scope: company.business_scope || '',
        business_scope_en: lang.business_scope || '',
        contact_person: company.contact_person || '',
        contact_person_en: lang.contact_person || '',
        contact_person_title: company.contact_person_title || '',
        contact_person_title_en: lang.contact_person_title || '',
        mobile: company.mobile || '',
        phone: company.phone || '',
        email: company.email || '',
        intro: company.intro || '',
        intro_en: lang.intro || '',
        whats_app: company.whats_app || '',
        fax: company.fax || '',
        postal_code: company.postal_code || '',
        company_birth: company.company_birth,
        is_verified: company.is_verified || 0,
        homepage: company.homepage || ''
      }
    })

    if (format === 'json') {
      return NextResponse.json({
        success: true,
        data: exportData,
        total: exportData.length
      })
    }

    // 生成Excel文件
    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Companies')

    // 生成Excel缓冲区
    const excelBuffer = XLSX.write(workbook, { 
      bookType: 'xlsx', 
      type: 'buffer' 
    })

    // 生成文件名
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')
    const filename = `companies_selected_${timestamp}.xlsx`

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': excelBuffer.length.toString()
      }
    })

  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '导出失败'
    }, { status: 500 })
  }
}

// 添加一个新的API端点来获取数据库统计信息
export async function HEAD(request: NextRequest) {
  try {
    const countSql = `SELECT COUNT(*) as total FROM seller_company WHERE deleted = 0`
    const countResult = await executeQuery(countSql, []) as any[]
    const totalCount = countResult[0]?.total || 0

    return new NextResponse(null, {
      status: 200,
      headers: {
        'X-Total-Count': totalCount.toString(),
        'X-Max-Export': '50000'
      }
    })
  } catch (error) {
    return new NextResponse(null, {
      status: 500,
      headers: {
        'X-Error': 'Failed to get count'
      }
    })
  }
}
