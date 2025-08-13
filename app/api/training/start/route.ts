import { NextRequest, NextResponse } from 'next/server'
import { questionSetDB, questionDB } from '@/lib/database'

// 开始答题 - 随机分配试卷
export async function POST(request: NextRequest) {
  try {
    const { employeeName } = await request.json()
    
    if (!employeeName || !employeeName.trim()) {
      return NextResponse.json(
        { success: false, message: '请输入员工姓名' },
        { status: 400 }
      )
    }
    
    // 随机获取一套试卷
    const questionSet = questionSetDB.getRandomSet()
    
    if (!questionSet) {
      return NextResponse.json(
        { success: false, message: '暂无可用题库，请联系管理员' },
        { status: 404 }
      )
    }
    
    // 获取试卷的所有题目
    const questions = questionDB.findBySetId(questionSet.id!)
    
    if (questions.length === 0) {
      return NextResponse.json(
        { success: false, message: '试卷题目为空，请联系管理员' },
        { status: 404 }
      )
    }
    
    // 返回题目信息（不包含正确答案）
    const questionsForExam = questions.map(q => ({
      id: q.id,
      questionNumber: q.question_number,
      section: q.section,
      questionText: q.question_text,
      optionA: q.option_a,
      optionB: q.option_b,
      optionC: q.option_c,
      optionD: q.option_d,
      explanation: q.explanation
    }))
    
    return NextResponse.json({
      success: true,
      data: {
        sessionId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // 生成会话ID
        employeeName: employeeName.trim(),
        questionSet: {
          id: questionSet.id,
          name: questionSet.name,
          description: questionSet.description,
          totalQuestions: questions.length
        },
        questions: questionsForExam,
        startedAt: new Date().toISOString()
      }
    })
    
  } catch (error) {
    console.error('开始答题失败:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: '开始答题失败',
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}

// 获取试卷信息
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const setId = searchParams.get('setId')
    
    if (setId) {
      // 获取指定试卷信息
      const questionSet = questionSetDB.findById(parseInt(setId))
      
      if (!questionSet) {
        return NextResponse.json(
          { success: false, message: '试卷不存在' },
          { status: 404 }
        )
      }
      
      const questionsCount = questionDB.countBySetId(questionSet.id!)
      
      return NextResponse.json({
        success: true,
        data: {
          questionSet,
          questionsCount
        }
      })
    } else {
      // 获取所有试卷列表
      const questionSets = questionSetDB.findAll()
      const setsWithCount = questionSets.map(set => ({
        ...set,
        questionsCount: questionDB.countBySetId(set.id!)
      }))
      
      return NextResponse.json({
        success: true,
        data: {
          questionSets: setsWithCount,
          totalSets: questionSets.length
        }
      })
    }
    
  } catch (error) {
    console.error('获取试卷信息失败:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: '获取试卷信息失败',
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}