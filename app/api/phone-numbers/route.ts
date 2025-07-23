import { NextRequest, NextResponse } from 'next/server'
import { phoneNumberDB, PhoneNumber } from '@/lib/database'

// GET - 获取手机号码列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const carrier = searchParams.get('carrier')
    
    let phoneNumbers: PhoneNumber[]
    
    if (carrier) {
      // 根据运营商查询
      phoneNumbers = phoneNumberDB.findByCarrier(carrier)
    } else {
      // 查询所有记录
      phoneNumbers = phoneNumberDB.findAll(limit, offset)
    }
    
    return NextResponse.json({
      success: true,
      data: phoneNumbers,
      total: phoneNumbers.length
    })
    
  } catch (error) {
    console.error('Failed to fetch phone numbers:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: '获取手机号码失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}

// POST - 添加新的手机号码
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { number, carrier, note } = body
    
    // 验证必需字段
    if (!number || !carrier) {
      return NextResponse.json(
        { 
          success: false, 
          error: '手机号码和运营商不能为空' 
        },
        { status: 400 }
      )
    }
    
    // 验证运营商类型
    if (!['中国移动', '中国电信', '中国联通', '其他'].includes(carrier)) {
      return NextResponse.json(
        { 
          success: false, 
          error: '无效的运营商类型' 
        },
        { status: 400 }
      )
    }
    
    // 验证手机号码格式
    if (!/^1[3-9]\d{9}$/.test(number)) {
      return NextResponse.json(
        { 
          success: false, 
          error: '无效的手机号码格式' 
        },
        { status: 400 }
      )
    }
    
    // 检查号码是否已存在
    if (phoneNumberDB.exists(number)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `手机号码 ${number} 已存在` 
        },
        { status: 409 }
      )
    }
    
    // 创建记录
    const phoneNumberId = phoneNumberDB.insertPhoneNumber({
      number,
      carrier,
      note: note || undefined
    })
    
    // 返回创建的记录
    const createdPhoneNumber = phoneNumberDB.findById(phoneNumberId)
    
    return NextResponse.json({
      success: true,
      data: createdPhoneNumber
    }, { status: 201 })
    
  } catch (error) {
    console.error('Failed to create phone number:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: '添加手机号码失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}

// PUT - 更新手机号码
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, number, carrier, note } = body
    
    if (!id) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'ID不能为空' 
        },
        { status: 400 }
      )
    }
    
    // 检查记录是否存在
    const existingRecord = phoneNumberDB.findById(parseInt(id, 10))
    if (!existingRecord) {
      return NextResponse.json(
        { 
          success: false, 
          error: '手机号码记录不存在' 
        },
        { status: 404 }
      )
    }
    
    // 验证手机号码格式（如果提供）
    if (number && !/^1[3-9]\d{9}$/.test(number)) {
      return NextResponse.json(
        { 
          success: false, 
          error: '无效的手机号码格式' 
        },
        { status: 400 }
      )
    }
    
    // 验证运营商类型（如果提供）
    if (carrier && !['中国移动', '中国电信', '中国联通', '其他'].includes(carrier)) {
      return NextResponse.json(
        { 
          success: false, 
          error: '无效的运营商类型' 
        },
        { status: 400 }
      )
    }
    
    // 检查新手机号是否与其他记录重复
    if (number && phoneNumberDB.exists(number, parseInt(id, 10))) {
      return NextResponse.json(
        { 
          success: false, 
          error: `手机号码 ${number} 已存在` 
        },
        { status: 409 }
      )
    }
    
    // 准备更新数据
    const updates: Partial<Pick<PhoneNumber, 'number' | 'carrier' | 'note'>> = {}
    
    if (number !== undefined) updates.number = number
    if (carrier !== undefined) updates.carrier = carrier
    if (note !== undefined) updates.note = note
    
    // 执行更新
    const updated = phoneNumberDB.updatePhoneNumber(parseInt(id, 10), updates)
    
    if (!updated) {
      return NextResponse.json(
        { 
          success: false, 
          error: '更新失败' 
        },
        { status: 500 }
      )
    }
    
    // 返回更新后的记录
    const updatedRecord = phoneNumberDB.findById(parseInt(id, 10))
    
    return NextResponse.json({
      success: true,
      data: updatedRecord
    })
    
  } catch (error) {
    console.error('Failed to update phone number:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: '更新手机号码失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}

// DELETE - 删除手机号码
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'ID不能为空' 
        },
        { status: 400 }
      )
    }
    
    const phoneNumberId = parseInt(id, 10)
    
    // 检查记录是否存在
    const existingRecord = phoneNumberDB.findById(phoneNumberId)
    if (!existingRecord) {
      return NextResponse.json(
        { 
          success: false, 
          error: '手机号码记录不存在' 
        },
        { status: 404 }
      )
    }
    
    // 删除记录
    const deleted = phoneNumberDB.deletePhoneNumber(phoneNumberId)
    
    if (!deleted) {
      return NextResponse.json(
        { 
          success: false, 
          error: '删除失败' 
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: '手机号码删除成功'
    })
    
  } catch (error) {
    console.error('Failed to delete phone number:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: '删除手机号码失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}