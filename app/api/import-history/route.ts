import { NextRequest, NextResponse } from 'next/server'
import { importRecordDB, failedCompanyDB } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    // 获取导入历史记录
    const records = await importRecordDB.findAll(limit, offset)
    const totalCount = await importRecordDB.count()
    
    // 为每个记录添加失败数据数量
    const recordsWithFailedCount = await Promise.all(records.map(async record => ({
      ...record,
      failed_count: record.id ? await failedCompanyDB.countByImportRecordId(record.id) : 0
    })))
    
    return NextResponse.json({
      success: true,
      data: recordsWithFailedCount,
      total: totalCount,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      hasMore: offset + limit < totalCount
    })
  } catch (error) {
    console.error('获取导入历史失败:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : '获取导入历史失败' 
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = parseInt(searchParams.get('id') || '0')
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少导入记录ID' },
        { status: 400 }
      )
    }
    
    // 删除导入记录（会级联删除失败的公司数据）
    const deleted = await importRecordDB.deleteRecord(id)
    
    if (deleted) {
      return NextResponse.json({ success: true, message: '导入记录已删除' })
    } else {
      return NextResponse.json(
        { success: false, error: '导入记录不存在' },
        { status: 404 }
      )
    }
  } catch (error) {
    console.error('删除导入记录失败:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : '删除导入记录失败' 
      },
      { status: 500 }
    )
  }
}