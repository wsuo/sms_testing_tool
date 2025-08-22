import { NextRequest, NextResponse } from 'next/server'
import { questionSetDB, questionDB, examCategoryDB } from '@/lib/database'

// 获取题库列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')
    
    let questionSets
    
    if (categoryId && categoryId !== 'all') {
      // 按类别筛选
      questionSets = await questionSetDB.findByCategory(parseInt(categoryId))
    } else {
      // 获取所有题库
      questionSets = await questionSetDB.findAll()
    }
    
    // 获取每个题库的实际题目数量和类别信息
    const categories = await examCategoryDB.getActiveCategories()
    const setsWithDetails = await Promise.all(
      questionSets.map(async (set) => {
        const actualQuestionsCount = await questionDB.countBySetId(set.id!)
        const category = categories.find(c => c.id === set.category_id)
        
        return {
          ...set,
          questionsCount: actualQuestionsCount,
          categoryId: set.category_id,
          categoryName: category?.name || '未分类',
          categoryColor: category?.color || '#6b7280',
          is_active: set.is_active ?? true // 确保返回is_active状态
        }
      })
    )
    
    return NextResponse.json({
      success: true,
      data: setsWithDetails,
      message: `成功获取 ${setsWithDetails.length} 个题库`
    })
    
  } catch (error) {
    console.error('获取题库列表失败:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: '获取题库列表失败',
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}