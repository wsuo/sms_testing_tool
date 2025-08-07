import { NextRequest, NextResponse } from 'next/server'
import { executeTransaction, testConnection } from '@/lib/mysql'
import { importRecordDB, failedCompanyDB, type FailedCompany } from '@/lib/database'

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

interface ProgressUpdate {
  processed: number
  total: number
  progress: number
  currentBatch: number
  totalBatches: number
  successCount: number
  errorCount: number
  errors: string[]
  completed: boolean
}

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

// 验证数据库连接
async function validateDatabaseConnection(): Promise<void> {
  const isConnected = await testConnection()
  if (!isConnected) {
    throw new Error('无法连接到MySQL数据库，请检查配置')
  }
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()
  
  try {
    console.log('收到流式导入请求')
    const { companies, batchSize = 20 } = await request.json()

    console.log('请求数据:', { companiesLength: companies?.length, batchSize })

    if (!companies || !Array.isArray(companies)) {
      console.error('无效的数据格式')
      return NextResponse.json(
        { error: '无效的数据格式' },
        { status: 400 }
      )
    }

    // 验证数据库连接
    console.log('验证数据库连接...')
    await validateDatabaseConnection()
    console.log('数据库连接验证成功')

    // 创建可读流用于Server-Sent Events
    const stream = new ReadableStream({
      async start(controller) {
        const sendProgress = (progress: ProgressUpdate) => {
          const data = `data: ${JSON.stringify(progress)}\n\n`
          console.log('发送进度更新:', progress)
          controller.enqueue(encoder.encode(data))
        }

        try {
          console.log('开始处理流式导入...')
          const startTime = Date.now()
          const totalRecords = companies.length
          let processedRecords = 0
          let successCount = 0
          let errorCount = 0
          const errors: string[] = []
          const failedCompanies: FailedCompany[] = []
          
          // 创建导入记录
          const importRecordId = importRecordDB.insertRecord({
            total_processed: totalRecords,
            success_count: 0,
            error_count: 0,
            success_rate: 0,
            duration_seconds: 0,
            status: 'processing',
            notes: `开始导入 ${totalRecords} 条公司记录`,
            mysql_update_time: new Date().toISOString()
          })
          
          console.log(`创建导入记录 ID: ${importRecordId}`)

          // 分批处理数据
          const batches = []
          for (let i = 0; i < companies.length; i += batchSize) {
            batches.push(companies.slice(i, i + batchSize))
          }
          
          console.log(`准备处理 ${totalRecords} 条记录，分为 ${batches.length} 批`)

          // 发送初始进度
          sendProgress({
            processed: 0,
            total: totalRecords,
            progress: 0,
            currentBatch: 0,
            totalBatches: batches.length,
            successCount: 0,
            errorCount: 0,
            errors: [],
            completed: false
          })

          // 逐批处理
          for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            const batch = batches[batchIndex]
            const queries: Array<{ sql: string; params: any[] }> = []

            // 为当前批次准备SQL查询
            for (const company of batch) {
              try {
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

                // seller_company_lang表 - 使用 INSERT ... ON DUPLICATE KEY UPDATE
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

              } catch (error) {
                errorCount++
                const friendlyError = getMySQLErrorMessage(error)
                errors.push(`公司ID ${company.company_id}: ${friendlyError}`)
              }
            }

            // 执行当前批次的事务
            if (queries.length > 0) {
              try {
                console.log(`执行批次 ${batchIndex + 1}/${batches.length}，记录数: ${batch.length}`)
                await executeTransaction(queries)
                successCount += batch.length
                console.log(`批次 ${batchIndex + 1} 成功`)
              } catch (error) {
                console.error(`批次 ${batchIndex + 1} 失败:`, error)
                errorCount += batch.length
                const friendlyError = getMySQLErrorMessage(error)
                errors.push(`批次 ${batchIndex + 1} 处理失败: ${friendlyError}`)
                
                // 保存失败的公司数据到SQLite
                for (const company of batch) {
                  const failedCompany: Omit<FailedCompany, 'id' | 'created_at'> = {
                    import_record_id: importRecordId,
                    company_id: company.company_id,
                    company_no: company.company_no,
                    name: company.name,
                    name_en: company.name_en,
                    country: company.country,
                    province: company.province,
                    province_en: company.province_en,
                    city: company.city,
                    city_en: company.city_en,
                    county: company.county,
                    county_en: company.county_en,
                    address: company.address,
                    address_en: company.address_en,
                    business_scope: company.business_scope,
                    business_scope_en: company.business_scope_en,
                    contact_person: company.contact_person,
                    contact_person_en: company.contact_person_en,
                    contact_person_title: company.contact_person_title,
                    contact_person_title_en: company.contact_person_title_en,
                    mobile: company.mobile,
                    phone: company.phone,
                    email: company.email,
                    intro: company.intro,
                    intro_en: company.intro_en,
                    whats_app: company.whats_app,
                    fax: company.fax,
                    postal_code: company.postal_code,
                    company_birth: company.company_birth?.toString(),
                    is_verified: company.is_verified,
                    homepage: company.homepage,
                    error_message: friendlyError,
                    retry_count: 0
                  }
                  failedCompanies.push(failedCompany)
                }
              }
            }

            processedRecords += batch.length
            const progress = Math.round((processedRecords / totalRecords) * 100)

            // 发送进度更新
            sendProgress({
              processed: processedRecords,
              total: totalRecords,
              progress,
              currentBatch: batchIndex + 1,
              totalBatches: batches.length,
              successCount,
              errorCount,
              errors: [...errors],
              completed: processedRecords >= totalRecords
            })

            // 添加小延迟，让前端能看到进度变化
            await new Promise(resolve => setTimeout(resolve, 200))
          }

          // 计算导入持续时间
          const endTime = Date.now()
          const durationSeconds = Math.round((endTime - startTime) / 1000)
          const successRate = totalRecords > 0 ? (successCount / totalRecords) * 100 : 0
          
          // 批量保存失败的公司数据
          if (failedCompanies.length > 0) {
            console.log(`保存 ${failedCompanies.length} 个失败的公司数据到SQLite`)
            failedCompanyDB.insertBatch(failedCompanies)
          }
          
          // 更新导入记录的最终统计
          importRecordDB.updateRecord(importRecordId, {
            success_count: successCount,
            error_count: errorCount,
            success_rate: successRate,
            duration_seconds: durationSeconds,
            status: 'completed',
            notes: `导入完成 - 成功: ${successCount}, 失败: ${errorCount}, 成功率: ${successRate.toFixed(1)}%`
          })
          
          console.log(`导入完成 - 耗时: ${durationSeconds}秒, 成功率: ${successRate.toFixed(1)}%`)

          // 发送完成状态
          sendProgress({
            processed: totalRecords,
            total: totalRecords,
            progress: 100,
            currentBatch: batches.length,
            totalBatches: batches.length,
            successCount,
            errorCount,
            errors,
            completed: true
          })

        } catch (error) {
          console.error('导入过程中发生严重错误:', error)
          
          // 更新导入记录为失败状态
          const friendlyError = getMySQLErrorMessage(error)
          try {
            const endTime = Date.now()
            const durationSeconds = Math.round((endTime - startTime) / 1000)
            
            importRecordDB.updateRecord(importRecordId, {
              status: 'failed',
              duration_seconds: durationSeconds,
              notes: `导入失败: ${friendlyError}`
            })
          } catch (updateError) {
            console.error('更新导入记录失败:', updateError)
          }
          
          const errorData = {
            processed: 0,
            total: companies.length,
            progress: 0,
            currentBatch: 0,
            totalBatches: 0,
            successCount: 0,
            errorCount: companies.length,
            errors: [friendlyError],
            completed: true
          }
          const data = `data: ${JSON.stringify(errorData)}\n\n`
          controller.enqueue(encoder.encode(data))
        } finally {
          controller.close()
        }
      }
    })

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error) {
    console.error('导入失败:', error)
    return NextResponse.json(
      { error: getMySQLErrorMessage(error) },
      { status: 500 }
    )
  }
}