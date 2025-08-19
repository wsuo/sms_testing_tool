import { NextRequest, NextResponse } from 'next/server'
import { questionSetDB, trainingRecordDB } from '@/lib/database'

// 删除题库
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const setId = parseInt(params.id)
    
    if (isNaN(setId)) {
      return NextResponse.json(
        { success: false, message: '无效的题库ID' },
        { status: 400 }
      )
    }
    
    // 检查题库是否存在
    const questionSet = await questionSetDB.findById(setId)
    
    if (!questionSet) {
      return NextResponse.json(
        { success: false, message: '题库不存在' },
        { status: 404 }
      )
    }
    
    // 检查是否有相关的考试记录
    const relatedRecords = await trainingRecordDB.findBySetId(setId)
    
    if (relatedRecords.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: `无法删除题库 "${questionSet.name}"，因为还有 ${relatedRecords.length} 个相关的考试记录。请先删除相关考试记录。`
        },
        { status: 400 }
      )
    }
    
    // 删除题库中的所有题目
    await questionSetDB.deleteQuestionsBySetId(setId)
    
    // 删除题库
    const deleteResult = await questionSetDB.deleteQuestionSet(setId)
    
    if (deleteResult) {
      return NextResponse.json({
        success: true,
        message: `题库 "${questionSet.name}" 已成功删除`
      })
    } else {
      return NextResponse.json(
        { success: false, message: '删除失败' },
        { status: 500 }
      )
    }
    
  } catch (error) {
    console.error('删除题库失败:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: '删除题库失败',
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}