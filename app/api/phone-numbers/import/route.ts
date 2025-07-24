import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { phoneNumberDB } from '@/lib/database'
import carrierLookupService from '@/lib/carrier-lookup-service'

interface ImportProgress {
  processed: number
  total: number
  success: number
  failed: number
  errors: string[]
}

interface ImportResult {
  success: boolean
  data?: ImportProgress
  error?: string
}

// POST - Excel批量导入手机号码
export async function POST(request: NextRequest): Promise<NextResponse<ImportResult>> {
  try {
    // 解析multipart/form-data
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({
        success: false,
        error: '请选择要导入的Excel文件'
      }, { status: 400 })
    }

    // 验证文件类型
    const validExtensions = ['.xlsx', '.xls', '.csv']
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
    
    if (!validExtensions.includes(fileExtension)) {
      return NextResponse.json({
        success: false,
        error: '仅支持 .xlsx、.xls 或 .csv 格式的文件'
      }, { status: 400 })
    }

    // 验证文件大小 (最大10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({
        success: false,
        error: '文件大小不能超过10MB'
      }, { status: 400 })
    }

    console.log(`开始导入Excel文件: ${file.name} (${file.size} bytes)`)

    // 读取文件内容
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    
    // 获取第一个工作表
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) {
      return NextResponse.json({
        success: false,
        error: 'Excel文件中没有找到工作表'
      }, { status: 400 })
    }

    const worksheet = workbook.Sheets[sheetName]
    
    // 将工作表转换为JSON数组
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]
    
    if (rawData.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Excel文件为空'
      }, { status: 400 })
    }

    // 解析手机号码（假设第一列是手机号码，没有表头）
    const phoneNumbers: string[] = []
    
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i]
      if (row && row[0]) {
        const phoneNumber = String(row[0]).trim()
        
        // 验证手机号码格式
        if (/^1[3-9]\d{9}$/.test(phoneNumber)) {
          phoneNumbers.push(phoneNumber)
        } else {
          console.warn(`第 ${i + 1} 行的手机号码格式无效: ${phoneNumber}`)
        }
      }
    }

    if (phoneNumbers.length === 0) {
      return NextResponse.json({
        success: false,
        error: '没有找到有效的手机号码'
      }, { status: 400 })
    }

    // 去重
    const uniquePhoneNumbers = [...new Set(phoneNumbers)]
    console.log(`找到 ${phoneNumbers.length} 个手机号码，去重后 ${uniquePhoneNumbers.length} 个`)

    // 检查数据库中已存在的号码
    const existingNumbers = new Set<string>()
    for (const phoneNumber of uniquePhoneNumbers) {
      if (phoneNumberDB.exists(phoneNumber)) {
        existingNumbers.add(phoneNumber)
      }
    }

    // 过滤掉已存在的号码
    const newPhoneNumbers = uniquePhoneNumbers.filter(num => !existingNumbers.has(num))
    
    if (newPhoneNumbers.length === 0) {
      return NextResponse.json({
        success: false,
        error: `所有手机号码都已存在，跳过的号码数量: ${existingNumbers.size}`
      }, { status: 400 })
    }

    console.log(`需要导入 ${newPhoneNumbers.length} 个新手机号码`)

    // 分批查询运营商信息并导入
    const progress: ImportProgress = {
      processed: 0,
      total: newPhoneNumbers.length,
      success: 0,
      failed: 0,
      errors: []
    }

    const batchSize = 5 // 每批处理5个号码，避免API请求过于频繁
    
    for (let i = 0; i < newPhoneNumbers.length; i += batchSize) {
      const batch = newPhoneNumbers.slice(i, i + batchSize)
      
      // 批量查询运营商信息
      const lookupResults = await carrierLookupService.batchLookupCarriers(batch)
      
      // 处理每个号码
      for (const phoneNumber of batch) {
        try {
          const lookupResult = lookupResults.get(phoneNumber)
          
          let carrier = '其他'
          let province = ''
          let city = ''
          let note = ''
          
          if (lookupResult?.success && lookupResult.data) {
            carrier = lookupResult.data.carrier
            province = lookupResult.data.province || ''
            city = lookupResult.data.city || ''
            
            // 自动生成备注（省份+城市）
            if (province && city) {
              note = `${province} ${city}`
            }
          } else if (lookupResult?.error) {
            console.warn(`查询 ${phoneNumber} 运营商信息失败: ${lookupResult.error}`)
          }
          
          // 插入数据库
          phoneNumberDB.insertPhoneNumber({
            number: phoneNumber,
            carrier,
            province,
            city,
            note
          })
          
          progress.success++
          
        } catch (error) {
          const errorMsg = `${phoneNumber}: ${error instanceof Error ? error.message : '未知错误'}`
          progress.errors.push(errorMsg)
          progress.failed++
          console.error(`导入手机号码失败: ${errorMsg}`)
        }
        
        progress.processed++
      }
      
      // 批次间添加延迟，避免请求过于频繁
      if (i + batchSize < newPhoneNumbers.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    console.log(`导入完成: 成功 ${progress.success}，失败 ${progress.failed}`)

    // 构建结果消息
    let message = `导入完成！成功导入 ${progress.success} 个手机号码`
    if (progress.failed > 0) {
      message += `，失败 ${progress.failed} 个`
    }
    if (existingNumbers.size > 0) {
      message += `，跳过已存在的 ${existingNumbers.size} 个`
    }

    return NextResponse.json({
      success: true,
      data: {
        ...progress,
        message,
        skipped: existingNumbers.size
      }
    })

  } catch (error) {
    console.error('Excel导入失败:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '导入失败'
    }, { status: 500 })
  }
}