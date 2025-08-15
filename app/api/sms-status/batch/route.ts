import { NextRequest, NextResponse } from 'next/server'
import { smsRecordDB } from '@/lib/database'

interface BatchStatusRequest {
  outIds: string[]  // 要查询的SMS OutId列表
}

interface BatchStatusResponse {
  success: boolean
  data: Array<{
    outId: string
    status: string
    errorCode?: string
    receiveDate?: string
    sendDate?: string
    phoneNumber: string
    retryCount?: number
    lastRetryAt?: string
    createdAt?: string
  }>
  message?: string
}

// POST - 批量查询SMS状态
export async function POST(request: NextRequest): Promise<NextResponse<BatchStatusResponse>> {
  try {
    const { outIds }: BatchStatusRequest = await request.json()

    if (!outIds || !Array.isArray(outIds) || outIds.length === 0) {
      return NextResponse.json({
        success: false,
        data: [],
        message: '请提供有效的outIds数组'
      }, { status: 400 })
    }

    // 限制批量查询数量，防止性能问题
    if (outIds.length > 50) {
      return NextResponse.json({
        success: false,
        data: [],
        message: '单次查询SMS数量不能超过50个'
      }, { status: 400 })
    }

    console.log(`批量查询SMS状态，数量: ${outIds.length}`)

    // 从数据库批量查询SMS记录
    const results: Array<{
      outId: string
      status: string
      errorCode?: string
      receiveDate?: string
      sendDate?: string
      phoneNumber: string
      retryCount?: number
      lastRetryAt?: string
      createdAt?: string
    }> = []

    // 并发查询所有SMS记录
    const queryPromises = outIds.map(async (outId) => {
      try {
        const record = await smsRecordDB.findByOutId(outId)
        if (record) {
          return {
            outId: record.out_id,
            status: record.status,
            errorCode: record.error_code,
            receiveDate: record.receive_date,
            sendDate: record.send_date || record.created_at,
            phoneNumber: record.phone_number,
            retryCount: record.retry_count,
            lastRetryAt: record.last_retry_at,
            createdAt: record.created_at
          }
        } else {
          // 如果记录不存在，返回未找到状态
          return {
            outId,
            status: '记录不存在',
            phoneNumber: '',
          }
        }
      } catch (error) {
        console.error(`查询SMS记录失败: ${outId}`, error)
        return {
          outId,
          status: '查询失败',
          phoneNumber: '',
          errorCode: 'QUERY_ERROR'
        }
      }
    })

    // 等待所有查询完成
    const queryResults = await Promise.all(queryPromises)
    results.push(...queryResults)

    // 统计结果
    const statusCounts = results.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    console.log(`批量查询完成，结果统计:`, statusCounts)

    return NextResponse.json({
      success: true,
      data: results,
      message: `成功查询 ${results.length} 条SMS状态`
    })

  } catch (error) {
    console.error('批量查询SMS状态失败:', error)
    return NextResponse.json({
      success: false,
      data: [],
      message: '批量查询失败'
    }, { status: 500 })
  }
}

// GET - 获取所有发送中的SMS状态（用于前端界面显示）
export async function GET(request: NextRequest): Promise<NextResponse<BatchStatusResponse>> {
  try {
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const status = url.searchParams.get('status') || '发送中'

    console.log(`查询${status}状态的SMS记录，限制: ${limit}条`)

    // 查询指定状态的SMS记录
    let records: any[] = []
    
    if (status === '发送中') {
      records = await smsRecordDB.findPendingRecords()
    } else {
      records = await smsRecordDB.findWithFilters({ 
        status: status === 'all' ? undefined : status, 
        limit 
      })
    }

    // 限制返回数量
    if (records.length > limit) {
      records = records.slice(0, limit)
    }

    const results = records.map(record => ({
      outId: record.out_id,
      status: record.status,
      errorCode: record.error_code,
      receiveDate: record.receive_date,
      sendDate: record.send_date || record.created_at,
      phoneNumber: record.phone_number,
      retryCount: record.retry_count,
      lastRetryAt: record.last_retry_at,
      createdAt: record.created_at
    }))

    console.log(`查询到 ${results.length} 条${status}状态的SMS记录`)

    return NextResponse.json({
      success: true,
      data: results,
      message: `查询到 ${results.length} 条${status}状态的SMS记录`
    })

  } catch (error) {
    console.error('获取SMS状态列表失败:', error)
    return NextResponse.json({
      success: false,
      data: [],
      message: '获取SMS状态失败'
    }, { status: 500 })
  }
}