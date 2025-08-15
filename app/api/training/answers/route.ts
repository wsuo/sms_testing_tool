import { NextRequest, NextResponse } from 'next/server'
import { questionDB } from '@/lib/database'

// 获取题目正确答案的特殊API（仅用于内部功能）
export async function POST(request: NextRequest) {
  try {
    const { sessionId, setId } = await request.json()
    
    if (!sessionId || !setId) {
      return NextResponse.json(
        { success: false, message: '缺少必要参数' },
        { status: 400 }
      )
    }
    
    // 获取题库中的所有题目及其正确答案
    const questions = await questionDB.findBySetId(setId)
    
    if (!questions || questions.length === 0) {
      return NextResponse.json(
        { success: false, message: '未找到题目数据' },
        { status: 404 }
      )
    }
    
    // 提取正确答案
    const correctAnswers = questions.map(question => ({
      questionId: question.id,
      questionNumber: question.question_number,
      correctAnswer: question.correct_answer
    }))
    
    return NextResponse.json({
      success: true,
      data: {
        correctAnswers,
        sessionId
      }
    })
    
  } catch (error) {
    console.error('获取正确答案失败:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: '获取答案失败',
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}