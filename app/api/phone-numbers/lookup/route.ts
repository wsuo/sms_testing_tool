import { NextRequest, NextResponse } from 'next/server'
import carrierLookupService from '@/lib/carrier-lookup-service'

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

    // 调用运营商查询服务
    const lookupResult = await carrierLookupService.lookupCarrier(phoneNumber.trim())

    if (!lookupResult.success) {
      return NextResponse.json({
        success: false,
        error: lookupResult.error || '查询运营商信息失败'
      }, { status: 500 })
    }

    // 生成智能备注
    const { carrier, province, city } = lookupResult.data!
    let note = ''
    if (carrier && province && city) {
      note = `${carrier} - ${province}${city === province ? '' : city}`
    } else if (carrier && province) {
      note = `${carrier} - ${province}`
    } else if (carrier) {
      note = carrier
    }

    return NextResponse.json({
      success: true,
      data: {
        carrier: lookupResult.data.carrier,
        province: lookupResult.data.province,
        city: lookupResult.data.city,
        note: note
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