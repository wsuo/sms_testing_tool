import { NextRequest, NextResponse } from 'next/server'
import { questionDB, trainingRecordDB } from '@/lib/database'

interface AnswerItem {
  questionId: number
  questionNumber: number
  questionText: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  selectedAnswer: string
  correctAnswer: string
  isCorrect: boolean
  explanation?: string
}

// 提交答题结果
export async function POST(request: NextRequest) {
  try {
    const {
      sessionId,
      employeeName,
      setId,
      startedAt,
      answers // 格式: { questionId: selectedAnswer }
    } = await request.json()
    
    // 验证必要参数
    if (!sessionId || !employeeName || !setId || !startedAt || !answers) {
      return NextResponse.json(
        { success: false, message: '提交参数不完整' },
        { status: 400 }
      )
    }
    
    console.log('收到答题提交:', { sessionId, employeeName, setId, answersCount: Object.keys(answers).length })
    
    // 获取试卷的所有题目
    const questions = questionDB.findBySetId(setId)
    
    if (questions.length === 0) {
      return NextResponse.json(
        { success: false, message: '试卷题目不存在' },
        { status: 404 }
      )
    }
    
    // 评分处理
    const answerResults: AnswerItem[] = []
    let correctCount = 0
    
    for (const question of questions) {
      const selectedAnswer = answers[question.id!]
      const isCorrect = selectedAnswer === question.correct_answer
      
      if (isCorrect) {
        correctCount++
      }
      
      answerResults.push({
        questionId: question.id!,
        questionNumber: question.question_number,
        questionText: question.question_text,
        optionA: question.option_a,
        optionB: question.option_b,
        optionC: question.option_c,
        optionD: question.option_d,
        selectedAnswer: selectedAnswer || '',
        correctAnswer: question.correct_answer,
        isCorrect,
        explanation: question.explanation || ''
      })
    }
    
    // 计算分数 (满分100分)
    const score = Math.round((correctCount / questions.length) * 100)
    
    // 计算答题时长
    const startTime = new Date(startedAt)
    const endTime = new Date()
    const sessionDuration = Math.round((endTime.getTime() - startTime.getTime()) / 1000)
    
    // 获取用户IP
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown'
    
    // 保存答题记录
    const recordData = {
      employee_name: employeeName.trim(),
      set_id: setId,
      answers: JSON.stringify(answerResults),
      score,
      total_questions: questions.length,
      started_at: startedAt,
      ip_address: ip,
      session_duration: sessionDuration
    }
    
    const recordId = trainingRecordDB.insertRecord(recordData)
    
    console.log(`答题记录已保存: ID=${recordId}, 员工=${employeeName}, 分数=${score}/${questions.length}`)
    
    // 返回答题结果
    return NextResponse.json({
      success: true,
      data: {
        recordId,
        sessionId,
        employeeName,
        score,
        totalQuestions: questions.length,
        correctAnswers: correctCount,
        wrongAnswers: questions.length - correctCount,
        accuracy: Math.round((correctCount / questions.length) * 100),
        sessionDuration,
        passed: score >= 60, // 60分及格
        answerDetails: answerResults,
        completedAt: endTime.toISOString()
      },
      message: score >= 60 ? '恭喜你通过了培训考试！' : '很遗憾，你的成绩未达到及格线，建议继续学习后重新参加考试。'
    })
    
  } catch (error) {
    console.error('提交答题结果失败:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: '提交答题结果失败',
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}

// 获取答题历史 (可选功能)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeName = searchParams.get('employeeName')
    
    if (!employeeName) {
      return NextResponse.json(
        { success: false, message: '请提供员工姓名' },
        { status: 400 }
      )
    }
    
    const records = trainingRecordDB.findByEmployeeName(employeeName)
    
    return NextResponse.json({
      success: true,
      data: {
        employeeName,
        records: records.map(record => ({
          id: record.id,
          score: record.score,
          totalQuestions: record.total_questions,
          passed: record.score >= 60,
          sessionDuration: record.session_duration,
          completedAt: record.completed_at,
          setId: record.set_id
        })),
        totalAttempts: records.length,
        bestScore: records.length > 0 ? Math.max(...records.map(r => r.score)) : 0
      }
    })
    
  } catch (error) {
    console.error('获取答题历史失败:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: '获取答题历史失败',
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}