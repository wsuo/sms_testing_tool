import { NextRequest, NextResponse } from 'next/server'
import { smsRecordDB, SmsRecord } from '@/lib/database'

// GET - 获取SMS记录列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    
    // 原有参数（保持向后兼容）
    const phoneNumber = searchParams.get('phoneNumber')
    const outId = searchParams.get('out_id')
    const status = searchParams.get('status')
    
    // 新增筛选参数
    const searchTerm = searchParams.get('searchTerm')
    const statusFilter = searchParams.get('statusFilter')
    const carrierFilter = searchParams.get('carrierFilter')
    const templateFilter = searchParams.get('templateFilter')
    const dateFilter = searchParams.get('dateFilter')
    
    let records: SmsRecord[]
    let totalCount: number
    
    // 向后兼容的特定查询
    if (outId) {
      // 根据OutId查询单个记录
      const record = smsRecordDB.findByOutId(outId)
      records = record ? [record] : []
      totalCount = records.length
    } else if (phoneNumber) {
      // 根据手机号查询
      records = smsRecordDB.findByPhoneNumber(phoneNumber, limit)
      totalCount = smsRecordDB.countByPhoneNumber(phoneNumber)
    } else if (status) {
      // 根据状态查询
      records = smsRecordDB.findByStatus(status, limit, offset)
      totalCount = smsRecordDB.countByStatus(status)
    } else if (searchTerm || statusFilter || carrierFilter || templateFilter || dateFilter) {
      // 使用新的复合筛选查询
      const filters = {
        searchTerm: searchTerm || undefined,
        status: statusFilter || undefined,
        carrier: carrierFilter || undefined,
        templateName: templateFilter || undefined,
        dateRange: (dateFilter as 'today' | 'week' | 'month') || undefined,
        limit,
        offset
      }
      
      records = smsRecordDB.findWithFilters(filters)
      totalCount = smsRecordDB.countWithFilters({
        searchTerm: filters.searchTerm,
        status: filters.status,
        carrier: filters.carrier,
        templateName: filters.templateName,
        dateRange: filters.dateRange
      })
    } else {
      // 查询所有记录
      records = smsRecordDB.findAll(limit, offset)
      totalCount = smsRecordDB.count()
    }
    
    const totalPages = Math.ceil(totalCount / limit)
    const currentPage = Math.floor(offset / limit) + 1
    
    return NextResponse.json({
      success: true,
      data: records,
      total: totalCount,
      totalPages,
      currentPage,
      pageSize: limit,
      hasNext: currentPage < totalPages,
      hasPrev: currentPage > 1
    })
    
  } catch (error) {
    console.error('Failed to fetch SMS records:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: '获取短信记录失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}

// POST - 创建SMS记录
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // 验证必需字段
    if (!body.out_id || !body.phone_number) {
      return NextResponse.json(
        { 
          success: false, 
          error: '缺少必需参数: out_id 和 phone_number' 
        },
        { status: 400 }
      )
    }
    
    // 检查记录是否已存在
    const existingRecord = smsRecordDB.findByOutId(body.out_id)
    if (existingRecord) {
      return NextResponse.json(
        { 
          success: false, 
          error: `OutId ${body.out_id} 的记录已存在` 
        },
        { status: 409 }
      )
    }
    
    // 创建记录
    const recordId = smsRecordDB.insertRecord({
      out_id: body.out_id,
      phone_number: body.phone_number,
      carrier: body.carrier,
      phone_note: body.phone_note,
      template_code: body.template_code,
      template_name: body.template_name,
      template_params: body.template_params ? JSON.stringify(body.template_params) : undefined,
      content: body.content,
      send_date: body.send_date || new Date().toLocaleString('zh-CN'),
      status: body.status || '发送中',
      error_code: body.error_code
    })
    
    // 返回创建的记录
    const createdRecord = smsRecordDB.findByOutId(body.out_id)
    
    return NextResponse.json({
      success: true,
      data: createdRecord,
      id: recordId
    }, { status: 201 })
    
  } catch (error) {
    console.error('Failed to create SMS record:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: '创建短信记录失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}

// PUT - 更新SMS记录状态
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (!body.out_id) {
      return NextResponse.json(
        { 
          success: false, 
          error: '缺少必需参数: out_id' 
        },
        { status: 400 }
      )
    }
    
    // 准备更新数据
    const updates: Partial<Pick<SmsRecord, 'status' | 'error_code' | 'receive_date' | 'retry_count' | 'last_retry_at' | 'auto_refresh_enabled'>> = {}
    
    if (body.status) updates.status = body.status
    if (body.error_code !== undefined) updates.error_code = body.error_code
    if (body.receive_date) updates.receive_date = body.receive_date
    if (body.retry_count !== undefined) updates.retry_count = body.retry_count
    if (body.last_retry_at) updates.last_retry_at = body.last_retry_at
    if (body.auto_refresh_enabled !== undefined) updates.auto_refresh_enabled = body.auto_refresh_enabled
    
    // 执行更新
    const updated = smsRecordDB.updateStatus(body.out_id, updates)
    
    if (!updated) {
      return NextResponse.json(
        { 
          success: false, 
          error: `未找到OutId为 ${body.out_id} 的记录` 
        },
        { status: 404 }
      )
    }
    
    // 返回更新后的记录
    const updatedRecord = smsRecordDB.findByOutId(body.out_id)
    
    return NextResponse.json({
      success: true,
      data: updatedRecord
    })
    
  } catch (error) {
    console.error('Failed to update SMS record:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: '更新短信记录失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}

// DELETE - 删除SMS记录
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const recordId = searchParams.get('id')
    const outId = searchParams.get('out_id')
    
    if (!recordId && !outId) {
      return NextResponse.json(
        { 
          success: false, 
          error: '缺少必需参数: id 或 out_id' 
        },
        { status: 400 }
      )
    }
    
    let deleted = false
    
    if (recordId) {
      // 按ID删除
      deleted = smsRecordDB.deleteRecord(parseInt(recordId, 10))
    } else if (outId) {
      // 按OutId删除 - 先查找记录ID
      const record = smsRecordDB.findByOutId(outId)
      if (record) {
        deleted = smsRecordDB.deleteRecord(record.id!)
      }
    }
    
    if (!deleted) {
      return NextResponse.json(
        { 
          success: false, 
          error: `未找到要删除的记录` 
        },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: '记录删除成功'
    })
    
  } catch (error) {
    console.error('Failed to delete SMS record:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: '删除短信记录失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}