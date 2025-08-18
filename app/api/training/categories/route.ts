import { NextRequest, NextResponse } from 'next/server'
import { examCategoryDB } from '@/lib/database'

// 获取考核类别列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeStats = searchParams.get('includeStats') === 'true'
    
    if (includeStats) {
      // 获取带统计信息的类别列表
      const categories = await examCategoryDB.getCategoryStats()
      
      return NextResponse.json({
        success: true,
        data: categories,
        message: `成功获取 ${categories.length} 个考核类别（含统计信息）`
      })
    } else {
      // 获取基本的类别列表
      const categories = await examCategoryDB.getActiveCategories()
      
      return NextResponse.json({
        success: true,
        data: categories,
        message: `成功获取 ${categories.length} 个考核类别`
      })
    }
    
  } catch (error) {
    console.error('获取考核类别失败:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: '获取考核类别失败',
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}

// 创建新的考核类别
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, icon, color, sortOrder } = body
    
    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, message: '类别名称不能为空' },
        { status: 400 }
      )
    }
    
    // 检查名称是否已存在
    const existingCategories = await examCategoryDB.findAll()
    const nameExists = existingCategories.some(cat => cat.name === name.trim())
    
    if (nameExists) {
      return NextResponse.json(
        { success: false, message: '类别名称已存在' },
        { status: 400 }
      )
    }
    
    const categoryId = await examCategoryDB.insertCategory({
      name: name.trim(),
      description: description?.trim() || null,
      icon: icon || 'BookOpen',
      color: color || '#3b82f6',
      sort_order: sortOrder || 0,
      is_active: true
    })
    
    return NextResponse.json({
      success: true,
      data: { id: categoryId },
      message: `考核类别 "${name}" 创建成功`
    })
    
  } catch (error) {
    console.error('创建考核类别失败:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: '创建考核类别失败',
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}

// 更新考核类别
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, description, icon, color, sortOrder, isActive } = body
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: '类别ID不能为空' },
        { status: 400 }
      )
    }
    
    // 检查类别是否存在
    const existingCategory = await examCategoryDB.findById(id)
    if (!existingCategory) {
      return NextResponse.json(
        { success: false, message: '考核类别不存在' },
        { status: 404 }
      )
    }
    
    // 如果修改名称，检查是否与其他类别重复
    if (name && name.trim() !== existingCategory.name) {
      const allCategories = await examCategoryDB.findAll()
      const nameExists = allCategories.some(cat => cat.id !== id && cat.name === name.trim())
      
      if (nameExists) {
        return NextResponse.json(
          { success: false, message: '类别名称已存在' },
          { status: 400 }
        )
      }
    }
    
    const updates: any = {}
    if (name !== undefined) updates.name = name.trim()
    if (description !== undefined) updates.description = description?.trim() || null
    if (icon !== undefined) updates.icon = icon
    if (color !== undefined) updates.color = color
    if (sortOrder !== undefined) updates.sort_order = sortOrder
    if (isActive !== undefined) updates.is_active = isActive
    
    const success = await examCategoryDB.updateCategory(id, updates)
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: `考核类别更新成功`
      })
    } else {
      return NextResponse.json(
        { success: false, message: '更新失败，可能没有改变任何数据' },
        { status: 400 }
      )
    }
    
  } catch (error) {
    console.error('更新考核类别失败:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: '更新考核类别失败',
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}

// 删除考核类别（软删除）
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: '类别ID不能为空' },
        { status: 400 }
      )
    }
    
    const categoryId = parseInt(id)
    
    // 检查类别是否存在
    const existingCategory = await examCategoryDB.findById(categoryId)
    if (!existingCategory) {
      return NextResponse.json(
        { success: false, message: '考核类别不存在' },
        { status: 404 }
      )
    }
    
    // 检查是否有关联的题库或考试记录
    const stats = await examCategoryDB.getCategoryStats()
    const categoryStats = stats.find(stat => stat.id === categoryId)
    
    if (categoryStats && (categoryStats.question_sets_count > 0 || categoryStats.exam_records_count > 0)) {
      return NextResponse.json(
        { 
          success: false, 
          message: `无法删除类别 "${existingCategory.name}"，因为还有 ${categoryStats.question_sets_count} 个题库或 ${categoryStats.exam_records_count} 个考试记录`
        },
        { status: 400 }
      )
    }
    
    const success = await examCategoryDB.deleteCategory(categoryId)
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: `考核类别 "${existingCategory.name}" 已删除`
      })
    } else {
      return NextResponse.json(
        { success: false, message: '删除失败' },
        { status: 500 }
      )
    }
    
  } catch (error) {
    console.error('删除考核类别失败:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: '删除考核类别失败',
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}