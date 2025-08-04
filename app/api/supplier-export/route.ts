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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'excel'
    const limit = parseInt(searchParams.get('limit') || '1000')
    const offset = parseInt(searchParams.get('offset') || '0')

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
      LIMIT ? OFFSET ?
    `

    const companies = await executeQuery(companySql, [limit, offset]) as any[]

    if (companies.length === 0) {
      return NextResponse.json({
        success: false,
        error: '没有找到可导出的数据'
      }, { status: 404 })
    }

    // 获取公司ID列表
    const companyIds = companies.map(c => c.company_id)
    const placeholders = companyIds.map(() => '?').join(',')

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
    const filename = `companies_export_${timestamp}.xlsx`

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
