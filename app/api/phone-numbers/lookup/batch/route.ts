import { NextRequest, NextResponse } from 'next/server'
import { phoneLookupService } from '@/lib/phone-lookup'

// POST - 批量查询手机号码的运营商信息
export async function POST(request: NextRequest) {
  try {
    const { phoneNumbers } = await request.json()

    if (!phoneNumbers || !Array.isArray(phoneNumbers)) {
      return NextResponse.json({
        success: false,
        error: '手机号码列表不能为空'
      }, { status: 400 })
    }

    if (phoneNumbers.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          results: [],
          totalCount: 0,
          successCount: 0,
          failureCount: 0
        }
      })
    }

    if (phoneNumbers.length > 50) {
      return NextResponse.json({
        success: false,
        error: '一次最多只能查询50个手机号码'
      }, { status: 400 })
    }

    // 验证所有手机号码格式
    const phoneRegex = /^1[3-9]\d{9}$/
    const invalidNumbers = phoneNumbers.filter(phone => 
      typeof phone !== 'string' || !phoneRegex.test(phone.trim())
    )

    if (invalidNumbers.length > 0) {
      return NextResponse.json({
        success: false,
        error: `以下手机号码格式无效: ${invalidNumbers.slice(0, 5).join(', ')}${invalidNumbers.length > 5 ? '...' : ''}`
      }, { status: 400 })
    }

    // 使用新的电话号码批量查询服务
    const trimmedNumbers = phoneNumbers.map(phone => phone.trim())
    const batchResult = await phoneLookupService.batchLookup(trimmedNumbers)

    // 转换为API响应格式
    const results = []
    for (const [phoneNumber, result] of batchResult.results.entries()) {
      if (result.success && result.data) {
        // 生成智能备注（如果没有的话）
        let note = result.data.note
        if (!note) {
          const { carrier, province, city } = result.data
          if (carrier && province && city) {
            note = `${carrier} - ${province}${city === province ? '' : city}`
          } else if (carrier && province) {
            note = `${carrier} - ${province}`
          } else if (carrier) {
            note = carrier
          }
        }

        results.push({
          phoneNumber,
          success: true,
          data: {
            carrier: result.data.carrier,
            province: result.data.province,
            city: result.data.city,
            note: note || ''
          },
          provider: result.provider
        })
      } else {
        results.push({
          phoneNumber,
          success: false,
          error: result.error || '查询失败',
          provider: result.provider
        })
      }
    }

    return NextResponse.json({
      success: batchResult.success,
      data: {
        results,
        totalCount: batchResult.totalCount,
        successCount: batchResult.successCount,
        failureCount: batchResult.failureCount,
        provider: batchResult.provider
      }
    })
  } catch (error) {
    console.error('Batch phone number lookup failed:', error)
    return NextResponse.json({
      success: false,
      error: '批量查询运营商信息时发生错误'
    }, { status: 500 })
  }
}