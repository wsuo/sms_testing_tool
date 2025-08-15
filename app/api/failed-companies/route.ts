import { NextRequest, NextResponse } from 'next/server'
import { failedCompanyDB } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const importRecordId = searchParams.get('import_record_id')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    let companies = []
    let totalCount = 0
    
    if (importRecordId) {
      // 获取指定导入记录的失败公司
      companies = await failedCompanyDB.findByImportRecordId(parseInt(importRecordId))
      totalCount = await failedCompanyDB.countByImportRecordId(parseInt(importRecordId))
    } else {
      // 获取所有失败公司
      companies = await failedCompanyDB.findAll(limit, offset)
      totalCount = await failedCompanyDB.count()
    }
    
    return NextResponse.json({
      success: true,
      data: companies,
      total: totalCount,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      hasMore: offset + limit < totalCount
    })
  } catch (error) {
    console.error('获取失败公司数据失败:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : '获取失败公司数据失败' 
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
        { success: false, error: '缺少公司记录ID' },
        { status: 400 }
      )
    }
    
    // 删除失败公司记录
    const deleted = await failedCompanyDB.deleteCompany(id)
    
    if (deleted) {
      return NextResponse.json({ success: true, message: '失败公司记录已删除' })
    } else {
      return NextResponse.json(
        { success: false, error: '失败公司记录不存在' },
        { status: 404 }
      )
    }
  } catch (error) {
    console.error('删除失败公司记录失败:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : '删除失败公司记录失败' 
      },
      { status: 500 }
    )
  }
}