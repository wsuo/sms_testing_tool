import { NextRequest, NextResponse } from 'next/server'
import { phoneNumberDB } from '@/lib/database'

// GET - 搜索手机号码
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const searchTerm = searchParams.get('q') || ''
    const carrier = searchParams.get('carrier')
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    
    // 限制每页最大数量，但允许更大的限制用于组件内部使用
    // 如果请求1000条或更多，说明是组件内部调用，允许更大限制
    const actualLimit = limit >= 1000 ? limit : Math.min(limit, 50)
    
    let phoneNumbers
    let totalCount
    
    if (searchTerm.trim() || (carrier && carrier !== 'all')) {
      // 使用筛选查询
      const filters = {
        searchTerm: searchTerm.trim() || undefined,
        carrier: carrier && carrier !== 'all' ? carrier : undefined,
        limit: actualLimit,
        offset
      }
      
      phoneNumbers = phoneNumberDB.findWithFilters(filters)
      totalCount = phoneNumberDB.countWithFilters({
        searchTerm: filters.searchTerm,
        carrier: filters.carrier
      })
    } else {
      // 查询所有记录，但限制数量
      phoneNumbers = phoneNumberDB.findAll(actualLimit, offset)
      totalCount = phoneNumberDB.count()
    }
    
    const totalPages = Math.ceil(totalCount / actualLimit)
    const currentPage = Math.floor(offset / actualLimit) + 1
    
    return NextResponse.json({
      success: true,
      data: phoneNumbers,
      pagination: {
        total: totalCount,
        totalPages,
        currentPage,
        pageSize: actualLimit,
        hasNext: currentPage < totalPages,
        hasPrev: currentPage > 1
      }
    })
    
  } catch (error) {
    console.error('Failed to search phone numbers:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: '搜索手机号码失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}