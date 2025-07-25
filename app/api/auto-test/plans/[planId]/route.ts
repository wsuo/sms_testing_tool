import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database'

interface Params {
  params: {
    planId: string
  }
}

// DELETE - 删除自动测试计划
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { planId } = params
    
    const db = getDatabase()
    
    // 检查计划是否存在且不在运行中
    const stmt = db.prepare('SELECT status FROM auto_test_plans WHERE id = ?')
    const plan = stmt.get(planId) as any
    
    if (!plan) {
      return NextResponse.json(
        { success: false, error: '计划不存在' },
        { status: 404 }
      )
    }
    
    if (plan.status === 'running') {
      return NextResponse.json(
        { success: false, error: '无法删除正在运行的计划' },
        { status: 400 }
      )
    }
    
    // 删除计划
    const deleteStmt = db.prepare('DELETE FROM auto_test_plans WHERE id = ?')
    const result = deleteStmt.run(planId)
    
    if (result.changes === 0) {
      return NextResponse.json(
        { success: false, error: '删除失败' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: '计划已删除'
    })
    
  } catch (error) {
    console.error('Failed to delete auto test plan:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: '删除自动测试计划失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}