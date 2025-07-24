import { NextRequest, NextResponse } from 'next/server'
import { phoneLookupService } from '@/lib/phone-lookup'

// POST - 查询手机号码的运营商信息
export async function POST(request: NextRequest) {
  try {
    const { phoneNumber } = await request.json()

    if (!phoneNumber) {
      return NextResponse.json({
        success: false,
        error: '手机号码不能为空'
      }, { status: 400 })
    }

    // 验证手机号码格式
    const phoneRegex = /^1[3-9]\d{9}$/
    if (!phoneRegex.test(phoneNumber.trim())) {
      return NextResponse.json({
        success: false,
        error: '请输入有效的手机号码格式'
      }, { status: 400 })
    }

    // 使用新的电话号码查询服务
    const result = await phoneLookupService.lookup(phoneNumber.trim())

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || '查询运营商信息失败'
      }, { status: 500 })
    }

    // 转换为API响应格式
    const { data } = result
    if (!data) {
      return NextResponse.json({
        success: false,
        error: '未返回查询结果'
      }, { status: 500 })
    }

    // 生成智能备注（如果没有的话）
    let note = data.note
    if (!note) {
      const { carrier, province, city } = data
      if (carrier && province && city) {
        note = `${carrier} - ${province}${city === province ? '' : city}`
      } else if (carrier && province) {
        note = `${carrier} - ${province}`
      } else if (carrier) {
        note = carrier
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        carrier: data.carrier,
        province: data.province,
        city: data.city,
        note: note || '',
        provider: result.provider // 添加provider信息用于调试
      }
    })
  } catch (error) {
    console.error('Phone number lookup failed:', error)
    return NextResponse.json({
      success: false,
      error: '查询运营商信息时发生错误'
    }, { status: 500 })
  }
}