import { NextRequest, NextResponse } from 'next/server'
import { trainingRecordDB, questionSetDB, systemConfigDB } from '@/lib/database'

// 获取培训记录统计数据
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // 获取筛选参数
    const employeeName = searchParams.get('employeeName') || undefined
    const setIdParam = searchParams.get('setId')
    const setId = setIdParam && setIdParam !== 'all' ? parseInt(setIdParam) : undefined
    const minScore = searchParams.get('minScore') ? parseInt(searchParams.get('minScore')!) : undefined
    const maxScore = searchParams.get('maxScore') ? parseInt(searchParams.get('maxScore')!) : undefined
    const dateRange = (searchParams.get('dateRange') as 'today' | 'week' | 'month' | 'all') || 'all'
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')
    
    const offset = (page - 1) * pageSize
    
    // 获取合格分数线
    const passScore = systemConfigDB.getTrainingPassScore()

    const filters = {
      employeeName,
      setId,
      minScore,
      maxScore,
      dateRange,
      limit: pageSize,
      offset
    }
    
    // 获取培训记录
    const records = trainingRecordDB.findWithFilters(filters)
    const totalRecords = trainingRecordDB.countWithFilters({
      employeeName,
      setId,
      minScore,
      maxScore,
      dateRange
    })
    
    // 获取试卷信息映射
    const questionSets = questionSetDB.findAll()
    const setMap = questionSets.reduce((map, set) => {
      map[set.id!] = set
      return map
    }, {} as { [key: number]: any })
    
    // 处理记录数据，添加试卷信息
    const processedRecords = records.map(record => {
      const questionSet = setMap[record.set_id]
      return {
        id: record.id,
        employeeName: record.employee_name,
        questionSet: questionSet ? {
          id: questionSet.id,
          name: questionSet.name,
          description: questionSet.description
        } : null,
        score: record.score,
        totalQuestions: record.total_questions,
        passed: record.score >= passScore, // 使用动态合格分数线
        sessionDuration: record.session_duration,
        startedAt: record.started_at,
        completedAt: record.completed_at,
        ipAddress: record.ip_address,
        answers: JSON.parse(record.answers)
      }
    })
    
    // 获取统计数据
    const stats = trainingRecordDB.getTrainingStats()
    const scoreDistribution = trainingRecordDB.getScoreDistribution()
    
    return NextResponse.json({
      success: true,
      data: {
        records: processedRecords,
        pagination: {
          page,
          pageSize,
          total: totalRecords,
          totalPages: Math.ceil(totalRecords / pageSize)
        },
        statistics: {
          ...stats,
          scoreDistribution
        },
        questionSets,
        filters: {
          employeeName,
          setId,
          minScore,
          maxScore,
          dateRange
        }
      }
    })
    
  } catch (error) {
    console.error('获取培训统计数据失败:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: '获取统计数据失败',
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}

// 删除培训记录 (管理员功能)
export async function DELETE(request: NextRequest) {
  try {
    const { recordIds } = await request.json()
    
    if (!recordIds || !Array.isArray(recordIds) || recordIds.length === 0) {
      return NextResponse.json(
        { success: false, message: '请提供要删除的记录ID' },
        { status: 400 }
      )
    }
    
    // 这里应该实现删除记录的逻辑
    // 注意：删除操作需要谨慎处理，可能需要额外的权限检查
    let deletedCount = 0
    
    for (const recordId of recordIds) {
      // 假设有删除方法，实际需要在数据库类中实现
      // deletedCount += trainingRecordDB.deleteRecord(recordId)
      console.log(`管理员请求删除记录: ${recordId}`)
    }
    
    return NextResponse.json({
      success: true,
      data: {
        deletedCount,
        message: `已删除 ${deletedCount} 条记录`
      }
    })
    
  } catch (error) {
    console.error('删除培训记录失败:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: '删除记录失败',
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}