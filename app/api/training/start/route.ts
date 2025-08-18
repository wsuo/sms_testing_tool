import { NextRequest, NextResponse } from 'next/server'
import { questionSetDB, questionDB, examCategoryDB } from '@/lib/database'

// 开始答题 - 支持按类别随机分配试卷
export async function POST(request: NextRequest) {
  try {
    const { employeeName, categoryId } = await request.json()
    
    if (!employeeName || !employeeName.trim()) {
      return NextResponse.json(
        { success: false, message: '请输入员工姓名' },
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
    
    // 根据类别随机获取一套试卷
    const questionSet = await questionSetDB.getRandomSetByCategory(categoryId)
    
    if (!questionSet) {
      return NextResponse.json(
        { 
          success: false, 
          message: `暂无 "${category.name}" 类别的可用题库，请联系管理员` 
        },
        { status: 404 }
      )
    }
    
    // 获取试卷的所有题目
    const questions = await questionDB.findBySetId(questionSet.id!)
    
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
        category: {
          id: category.id,
          name: category.name,
          description: category.description,
          color: category.color,
          icon: category.icon
        },
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

// 获取试卷信息 - 支持按类别筛选
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const setId = searchParams.get('setId')
    const categoryId = searchParams.get('categoryId')
    
    if (setId) {
      // 获取指定试卷信息
      const questionSet = await questionSetDB.findById(parseInt(setId))
      
      if (!questionSet) {
        return NextResponse.json(
          { success: false, message: '试卷不存在' },
          { status: 404 }
        )
      }
      
      const questionsCount = await questionDB.countBySetId(questionSet.id!)
      const category = questionSet.category_id ? await examCategoryDB.findById(questionSet.category_id) : null
      
      return NextResponse.json({
        success: true,
        data: {
          questionSet: {
            ...questionSet,
            category: category ? {
              id: category.id,
              name: category.name,
              color: category.color,
              icon: category.icon
            } : null
          },
          questionsCount
        }
      })
    } else {
      // 获取题库列表，支持按类别筛选
      const categories = await examCategoryDB.getActiveCategories()
      let questionSets
      
      if (categoryId && categoryId !== 'all') {
        questionSets = await questionSetDB.findByCategory(parseInt(categoryId))
      } else {
        questionSets = await questionSetDB.findAll()
      }
      
      const setsWithCount = await Promise.all(questionSets.map(async (set) => {
        const questionsCount = await questionDB.countBySetId(set.id!)
        const category = categories.find(c => c.id === set.category_id)
        
        return {
          ...set,
          questionsCount,
          category: category ? {
            id: category.id,
            name: category.name,
            color: category.color,
            icon: category.icon
          } : null
        }
      }))
      
      return NextResponse.json({
        success: true,
        data: {
          categories,
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