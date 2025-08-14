import { NextRequest, NextResponse } from 'next/server'
import { trainingRecordDB, systemConfigDB } from '@/lib/database'

// 删除培训记录
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const recordId = parseInt(params.id)
    
    if (!recordId || isNaN(recordId)) {
      return NextResponse.json(
        { success: false, message: '无效的记录ID' },
        { status: 400 }
      )
    }
    
    console.log('删除培训记录:', recordId)
    
    // 检查记录是否存在
    const record = trainingRecordDB.findById(recordId)
    if (!record) {
      return NextResponse.json(
        { success: false, message: '记录不存在' },
        { status: 404 }
      )
    }
    
    // 删除记录
    const success = trainingRecordDB.deleteRecord(recordId)
    
    if (success) {
      console.log(`培训记录已删除: ID=${recordId}, 员工=${record.employee_name}`)
      
      return NextResponse.json({
        success: true,
        message: '记录删除成功',
        data: { deletedId: recordId }
      })
    } else {
      return NextResponse.json(
        { success: false, message: '删除操作失败' },
        { status: 500 }
      )
    }
    
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

// 获取单个培训记录详情
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const recordId = parseInt(params.id)
    
    if (!recordId || isNaN(recordId)) {
      return NextResponse.json(
        { success: false, message: '无效的记录ID' },
        { status: 400 }
      )
    }
    
    // 获取合格分数线
    const passScore = systemConfigDB.getTrainingPassScore()
    
    // 获取记录详情
    const record = trainingRecordDB.findById(recordId)
    if (!record) {
      return NextResponse.json(
        { success: false, message: '记录不存在' },
        { status: 404 }
      )
    }
    
    // 解析答题详情
    let answers = []
    try {
      answers = JSON.parse(record.answers)
    } catch (e) {
      console.warn('解析答题详情失败:', e)
    }
    
    return NextResponse.json({
      success: true,
      data: {
        id: record.id,
        employeeName: record.employee_name,
        score: record.score,
        totalQuestions: record.total_questions,
        passed: record.score >= passScore, // 使用动态合格分数线
        sessionDuration: record.session_duration,
        startedAt: record.started_at,
        completedAt: record.completed_at,
        ipAddress: record.ip_address,
        answers: answers
      }
    })
    
  } catch (error) {
    console.error('获取培训记录详情失败:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: '获取记录详情失败',
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}