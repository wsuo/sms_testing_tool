import { NextRequest, NextResponse } from 'next/server'
import { phoneNumberDB, PhoneNumber } from '@/lib/database'
import { phoneLookupService } from '@/lib/phone-lookup'

// GET - 获取手机号码列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    
    // 原有参数（保持向后兼容）
    const carrier = searchParams.get('carrier')
    const number = searchParams.get('number')
    
    // 新增筛选参数
    const searchTerm = searchParams.get('searchTerm')
    
    // 如果查询特定手机号码
    if (number) {
      const phoneNumber = phoneNumberDB.findByNumber(number)
      return NextResponse.json({
        success: true,
        data: phoneNumber
      })
    }
    
    let phoneNumbers: PhoneNumber[]
    let totalCount: number
    
    // 使用新的复合筛选查询
    if (searchTerm || (carrier && carrier !== 'all')) {
      const filters = {
        searchTerm: searchTerm || undefined,
        carrier: carrier || undefined,
        limit,
        offset
      }
      
      phoneNumbers = phoneNumberDB.findWithFilters(filters)
      totalCount = phoneNumberDB.countWithFilters({
        searchTerm: filters.searchTerm,
        carrier: filters.carrier
      })
    } else {
      // 查询所有记录
      phoneNumbers = phoneNumberDB.findAll(limit, offset)
      totalCount = phoneNumberDB.count()
    }
    
    const totalPages = Math.ceil(totalCount / limit)
    const currentPage = Math.floor(offset / limit) + 1
    
    return NextResponse.json({
      success: true,
      data: phoneNumbers,
      total: totalCount,
      totalPages,
      currentPage,
      pageSize: limit,
      hasNext: currentPage < totalPages,
      hasPrev: currentPage > 1
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

// POST - 添加新的手机号码（自动查询运营商信息）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { number, carrier, province, city, note, autoLookup = true } = body
    
    // 验证必需字段
    if (!number) {
      return NextResponse.json(
        { 
          success: false, 
          error: '手机号码不能为空' 
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
    
    let finalCarrier = carrier
    let finalProvince = province
    let finalCity = city
    let finalNote = note
    
    // 如果启用自动查询并且缺少运营商信息，则自动查询
    if (autoLookup && (!carrier || !province || !city)) {
      try {
        console.log(`正在查询手机号码 ${number} 的运营商信息...`)
        const lookupResult = await phoneLookupService.lookup(number)
        
        if (lookupResult.success && lookupResult.data) {
          finalCarrier = finalCarrier || lookupResult.data.carrier
          finalProvince = finalProvince || lookupResult.data.province
          finalCity = finalCity || lookupResult.data.city
          
          // 如果没有提供备注，自动生成备注（省份+城市）
          if (!finalNote && finalProvince && finalCity) {
            finalNote = `${finalProvince} ${finalCity}`
          }
          
          console.log(`查询成功: ${finalCarrier} ${finalProvince} ${finalCity}`)
        } else {
          console.warn(`查询运营商信息失败: ${lookupResult.error}`)
          // 查询失败时使用默认值或传入的值
          finalCarrier = finalCarrier || '其他'
        }
      } catch (error) {
        console.error('运营商查询异常:', error)
        // 查询异常时使用默认值或传入的值
        finalCarrier = finalCarrier || '其他'
      }
    }
    
    // 验证运营商类型
    if (finalCarrier && !['中国移动', '中国电信', '中国联通', '其他'].includes(finalCarrier)) {
      return NextResponse.json(
        { 
          success: false, 
          error: '无效的运营商类型' 
        },
        { status: 400 }
      )
    }
    
    // 创建记录
    const phoneNumberId = phoneNumberDB.insertPhoneNumber({
      number,
      carrier: finalCarrier || '其他',
      province: finalProvince,
      city: finalCity,
      note: finalNote
    })
    
    // 返回创建的记录
    const createdPhoneNumber = phoneNumberDB.findById(phoneNumberId)
    
    return NextResponse.json({
      success: true,
      data: createdPhoneNumber,
      message: autoLookup ? '手机号码添加成功，已自动查询运营商信息' : '手机号码添加成功'
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
    const { id, number, carrier, province, city, note } = body
    
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
    const updates: Partial<Pick<PhoneNumber, 'number' | 'carrier' | 'province' | 'city' | 'note'>> = {}
    
    if (number !== undefined) updates.number = number
    if (carrier !== undefined) updates.carrier = carrier
    if (province !== undefined) updates.province = province
    if (city !== undefined) updates.city = city
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