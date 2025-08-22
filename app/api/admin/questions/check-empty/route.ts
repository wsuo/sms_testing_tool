import { NextRequest, NextResponse } from 'next/server'
import { QuestionDB, QuestionSetDB } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    console.log('检查数据库中的题目选项是否为空...')
    
    const questionDB = new QuestionDB()
    
    // 获取所有题库的所有题目
    const searchParams = request.nextUrl.searchParams
    const setId = searchParams.get('setId')
    
    let allQuestions = []
    
    if (setId) {
      // 查询特定题库
      allQuestions = await questionDB.findBySetId(parseInt(setId))
    } else {
      // 查询所有题库 - 需要先获取所有题库ID
      const questionSetDB = new QuestionSetDB()
      const allSets = await questionSetDB.findAll()
      
      for (const set of allSets) {
        const questions = await questionDB.findBySetId(set.id!)
        allQuestions.push(...questions)
      }
    }
    
    console.log(`总题目数量: ${allQuestions.length}`)
    
    let emptyOptionsCount = 0
    let problemQuestions = []
    
    for (const question of allQuestions) {
      const emptyOptions = []
      
      if (!question.option_a || question.option_a.trim() === '') {
        emptyOptions.push('A')
      }
      if (!question.option_b || question.option_b.trim() === '') {
        emptyOptions.push('B')
      }
      if (!question.option_c || question.option_c.trim() === '') {
        emptyOptions.push('C')
      }
      if (!question.option_d || question.option_d.trim() === '') {
        emptyOptions.push('D')
      }
      
      if (emptyOptions.length > 0) {
        emptyOptionsCount++
        problemQuestions.push({
          id: question.id,
          setId: question.set_id,
          questionNumber: question.question_number,
          questionText: question.question_text.substring(0, 80) + (question.question_text.length > 80 ? '...' : ''),
          emptyOptions: emptyOptions,
          optionA: question.option_a || '',
          optionB: question.option_b || '',
          optionC: question.option_c || '',
          optionD: question.option_d || '',
          correctAnswer: question.correct_answer,
          explanation: question.explanation
        })
      }
    }
    
    // 按题库分组统计
    const byQuestionSet = problemQuestions.reduce((acc, q) => {
      if (!acc[q.setId]) {
        acc[q.setId] = []
      }
      acc[q.setId].push(q)
      return acc
    }, {} as Record<number, typeof problemQuestions>)
    
    const summary = Object.entries(byQuestionSet).map(([setId, questions]) => ({
      setId: parseInt(setId),
      count: questions.length,
      questions: questions
    }))
    
    return NextResponse.json({
      success: true,
      totalQuestions: allQuestions.length,
      normalQuestions: allQuestions.length - emptyOptionsCount,
      problemQuestions: emptyOptionsCount,
      details: problemQuestions,
      summary: summary
    })
    
  } catch (error) {
    console.error('检查空选项失败:', error)
    return NextResponse.json({ 
      success: false, 
      error: '检查失败: ' + (error instanceof Error ? error.message : '未知错误')
    }, { status: 500 })
  }
}