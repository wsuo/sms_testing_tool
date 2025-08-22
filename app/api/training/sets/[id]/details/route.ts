import { NextRequest, NextResponse } from 'next/server'
import { questionSetDB } from '@/lib/database'

// 获取题库详情（包含所有题目）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const setId = parseInt(id)
    
    if (isNaN(setId)) {
      return NextResponse.json(
        { success: false, message: '无效的题库ID' },
        { status: 400 }
      )
    }
    
    // 获取题库基本信息
    const questionSet = await questionSetDB.findById(setId)
    
    if (!questionSet) {
      return NextResponse.json(
        { success: false, message: '题库不存在' },
        { status: 404 }
      )
    }
    
    // 获取题库中的所有题目
    const questions = await questionSetDB.getQuestionsBySetId(setId)
    
    const response = {
      ...questionSet,
      questions: questions,
      questionsCount: questions.length
    }
    
    return NextResponse.json({
      success: true,
      data: response,
      message: `成功获取题库 "${questionSet.name}" 的详情，共 ${questions.length} 题`
    })
    
  } catch (error) {
    console.error('获取题库详情失败:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: '获取题库详情失败',
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}