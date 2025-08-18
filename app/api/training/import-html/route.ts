import { NextRequest, NextResponse } from 'next/server'
import { questionSetDB, questionDB, examCategoryDB } from '@/lib/database'

// 导入HTML解析的题库数据
export async function POST(request: NextRequest) {
  try {
    const { questionSet, categoryId } = await request.json()
    
    if (!questionSet || !questionSet.questions || questionSet.questions.length === 0) {
      return NextResponse.json(
        { success: false, message: '题库数据不能为空' },
        { status: 400 }
      )
    }
    
    if (!categoryId) {
      return NextResponse.json(
        { success: false, message: '请选择考核类别' },
        { status: 400 }
      )
    }
    
    // 验证考核类别是否存在
    const category = await examCategoryDB.findById(categoryId)
    if (!category) {
      return NextResponse.json(
        { success: false, message: '考核类别不存在' },
        { status: 400 }
      )
    }
    
    const setName = questionSet.name || '未命名题库'
    const setDescription = questionSet.description
    const questions = questionSet.questions
    
    // 检查是否已存在同名题库
    const existingSets = await questionSetDB.findAll()
    const existingSet = existingSets.find(set => set.name === setName && set.category_id === categoryId)
    
    let setId: number
    
    if (existingSet) {
      // 如果存在，清空原有题目并更新题库信息
      console.log(`更新现有题库 "${setName}"`)
      
      // 删除原有题目
      const existingQuestions = await questionDB.findBySetId(existingSet.id!)
      for (const q of existingQuestions) {
        await questionDB.deleteQuestion(q.id!)
      }
      
      // 更新题库信息
      await questionSetDB.updateQuestionSet(existingSet.id!, {
        name: setName,
        description: setDescription,
        category_id: categoryId,
        total_questions: questions.length,
        is_active: true
      })
      
      setId = existingSet.id!
    } else {
      // 创建新题库
      setId = await questionSetDB.insertQuestionSet({
        name: setName,
        description: setDescription,
        category_id: categoryId,
        total_questions: questions.length,
        is_active: true
      })
      console.log(`创建新题库: ID=${setId}`)
    }
    
    // 准备题目数据
    let insertedCount = 0
    const errors: string[] = []
    
    for (const q of questions) {
      try {
        await questionDB.insertQuestion({
          set_id: setId,
          question_number: q.questionNumber,
          section: q.section || '通用知识',
          question_text: q.questionText,
          option_a: q.optionA,
          option_b: q.optionB,
          option_c: q.optionC,
          option_d: q.optionD,
          correct_answer: q.correctAnswer,
          explanation: q.explanation
        })
        insertedCount++
      } catch (error) {
        console.error(`插入第${q.questionNumber}题失败:`, error)
        errors.push(`第${q.questionNumber}题插入失败`)
      }
    }
    
    if (insertedCount === 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: '所有题目都导入失败',
          errors 
        },
        { status: 500 }
      )
    }
    
    console.log(`成功导入 ${insertedCount} 道题目到题库 "${setName}"`)
    
    return NextResponse.json({
      success: true,
      data: {
        setId,
        setName,
        categoryId,
        categoryName: category.name,
        questionsCount: insertedCount,
        totalQuestions: questions.length,
        errors: errors.length > 0 ? errors : undefined
      },
      message: errors.length > 0 
        ? `部分导入成功：${insertedCount}/${questions.length} 题导入成功`
        : `导入成功：${insertedCount} 道题目`
    })
    
  } catch (error) {
    console.error('导入HTML题库失败:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: '导入题库失败',
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}