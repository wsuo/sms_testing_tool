import { NextRequest, NextResponse } from 'next/server'
import { failedCompanyDB, importRecordDB } from '@/lib/database'
import { executeTransaction, testConnection } from '@/lib/mysql'

// MySQL错误信息转换为中文友好提示
function getMySQLErrorMessage(error: any): string {
  if (!error || typeof error !== 'object') {
    return '数据库操作失败'
  }

  const { code, errno, sqlMessage, sqlState } = error
  
  switch (code) {
    case 'ER_DATA_TOO_LONG':
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
        'contact_person_title': '联系人职位',
        'intro': '公司简介'
      }
      const chineseFieldName = fieldNameMap[fieldName] || fieldName
      return `${chineseFieldName}信息过长，请检查数据长度或联系管理员调整数据库字段限制`
    
    case 'ER_DUP_ENTRY':
      return '数据重复，该记录已存在'
    
    default:
      if (sqlMessage) {
        return `数据库操作失败：${sqlMessage}`
      }
      return `数据库错误 (${code || errno || 'UNKNOWN'})`
  }
}

export async function POST(request: NextRequest) {
  try {
    const { importRecordId, companyIds } = await request.json()
    
    if (!importRecordId) {
      return NextResponse.json(
        { success: false, error: '缺少导入记录ID' },
        { status: 400 }
      )
    }
    
    // 验证数据库连接
    const isConnected = await testConnection()
    if (!isConnected) {
      throw new Error('无法连接到MySQL数据库，请检查配置')
    }
    
    // 获取要重试的失败公司数据
    let failedCompanies = []
    if (companyIds && companyIds.length > 0) {
      // 重试指定公司
      for (const id of companyIds) {
        const company = failedCompanyDB.findById(id)
        if (company) {
          failedCompanies.push(company)
        }
      }
    } else {
      // 重试指定导入记录的所有失败公司
      failedCompanies = failedCompanyDB.findByImportRecordId(importRecordId)
    }
    
    if (failedCompanies.length === 0) {
      return NextResponse.json(
        { success: false, error: '没有找到要重试的失败公司数据' },
        { status: 400 }
      )
    }
    
    console.log(`开始重试 ${failedCompanies.length} 个失败的公司`)
    
    let successCount = 0
    let errorCount = 0
    const errors: string[] = []
    const stillFailedIds: number[] = []
    
    // 逐个重试失败的公司
    for (const company of failedCompanies) {
      try {
        const queries = []
        
        // seller_company表
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
        
        // seller_company_lang表 - 使用 INSERT ... ON DUPLICATE KEY UPDATE 避免重复记录
        const updateLangSQL = `
          INSERT INTO seller_company_lang (
            company_id, language_code, name, province, city, county,
            address, business_scope, contact_person, contact_person_title,
            intro
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            province = VALUES(province),
            city = VALUES(city),
            county = VALUES(county),
            address = VALUES(address),
            business_scope = VALUES(business_scope),
            contact_person = VALUES(contact_person),
            contact_person_title = VALUES(contact_person_title),
            intro = VALUES(intro)
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
        
        // 执行事务
        await executeTransaction(queries)
        
        // 重试成功，删除失败记录
        if (company.id) {
          failedCompanyDB.deleteCompany(company.id)
        }
        
        successCount++
        console.log(`公司 ${company.company_id} 重试成功`)
        
      } catch (error) {
        console.error(`公司 ${company.company_id} 重试失败:`, error)
        errorCount++
        const friendlyError = getMySQLErrorMessage(error)
        errors.push(`公司ID ${company.company_id}: ${friendlyError}`)
        
        // 更新重试次数
        if (company.id) {
          failedCompanyDB.updateRetryCount(company.id, (company.retry_count || 0) + 1)
          stillFailedIds.push(company.id)
        }
      }
    }
    
    console.log(`重试完成 - 成功: ${successCount}, 失败: ${errorCount}`)
    
    return NextResponse.json({
      success: true,
      result: {
        totalProcessed: failedCompanies.length,
        successCount,
        errorCount,
        errors,
        stillFailedIds
      }
    })
    
  } catch (error) {
    console.error('重试失败公司数据失败:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : '重试失败公司数据失败' 
      },
      { status: 500 }
    )
  }
}