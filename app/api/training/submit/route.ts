import { NextRequest, NextResponse } from 'next/server'
import { questionDB, trainingRecordDB, systemConfigDB } from '@/lib/database'

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
  const startTime = Date.now()
  
  try {
    const {
      sessionId,
      employeeName,
      setId,
      categoryId, // 新增类别ID
      startedAt,
      answers, // 格式: { questionId: selectedAnswer }
      autoSubmitted = false // 是否为自动提交
    } = await request.json()
    
    console.log(`[${new Date().toISOString()}] 收到答题提交:`, { 
      sessionId, 
      employeeName, 
      setId, 
      categoryId, 
      answersCount: Object.keys(answers).length,
      autoSubmitted: autoSubmitted ? '自动提交' : '手动提交'
    })
    
    // 验证必要参数
    if (!sessionId || !employeeName || !setId || !startedAt || !answers) {
      return NextResponse.json(
        { success: false, message: '提交参数不完整' },
        { status: 400 }
      )
    }
    
    // 获取合格分数线
    const passScore = await systemConfigDB.getTrainingPassScore()
    
    // 获取试卷的所有题目
    const questionStartTime = Date.now()
    const questions = await questionDB.findBySetId(setId)
    console.log(`获取题目耗时: ${Date.now() - questionStartTime}ms, 题目数量: ${questions.length}`)
    
    if (questions.length === 0) {
      return NextResponse.json(
        { success: false, message: '试卷题目不存在' },
        { status: 404 }
      )
    }
    
    // 评分处理
    const scoringStartTime = Date.now()
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
    console.log(`评分处理耗时: ${Date.now() - scoringStartTime}ms`)
    
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
    const dbStartTime = Date.now()
    
    // 转换日期格式为MySQL兼容格式
    const mysqlStartedAt = new Date(startedAt).toISOString().slice(0, 19).replace('T', ' ')
    
    const recordData = {
      employee_name: employeeName.trim(),
      set_id: setId,
      category_id: categoryId || null, // 新增类别ID字段
      answers: JSON.stringify(answerResults),
      score,
      total_questions: questions.length,
      started_at: mysqlStartedAt,
      ip_address: ip,
      session_duration: sessionDuration
    }
    
    const recordId = await trainingRecordDB.insertRecord(recordData)
    console.log(`数据库写入耗时: ${Date.now() - dbStartTime}ms`)
    
    const totalTime = Date.now() - startTime
    console.log(`[${new Date().toISOString()}] 答题记录已保存: ID=${recordId}, 员工=${employeeName}, 分数=${score}/${questions.length}, 总耗时=${totalTime}ms`)
    
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
        passed: score >= passScore, // 使用动态合格分数线
        answerDetails: answerResults,
        completedAt: endTime.toISOString()
      },
      message: score >= passScore ? '恭喜你通过了培训考试！' : `很遗憾，你的成绩未达到及格线（${passScore}分），建议继续学习后重新参加考试。`
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
    
    // 获取合格分数线
    const passScore = await systemConfigDB.getTrainingPassScore()
    
    const records = await trainingRecordDB.findByEmployeeName(employeeName)
    
    return NextResponse.json({
      success: true,
      data: {
        employeeName,
        records: records.map(record => ({
          id: record.id,
          score: record.score,
          totalQuestions: record.total_questions,
          passed: record.score >= passScore, // 使用动态合格分数线
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