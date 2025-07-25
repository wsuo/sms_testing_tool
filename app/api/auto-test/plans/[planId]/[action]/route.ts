import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database'

interface Params {
  params: {
    planId: string
    action: string
  }
}

// POST - 控制自动测试计划
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { planId, action } = params
    
    if (!['start', 'pause', 'stop'].includes(action)) {
      return NextResponse.json(
        { success: false, error: '无效的操作类型' },
        { status: 400 }
      )
    }
    
    const db = getDatabase()
    
    // 获取计划信息
    const stmt = db.prepare('SELECT * FROM auto_test_plans WHERE id = ?')
    const plan = stmt.get(planId) as any
    
    if (!plan) {
      return NextResponse.json(
        { success: false, error: '计划不存在' },
        { status: 404 }
      )
    }
    
    let newStatus = plan.status
    let nextRun = plan.next_run
    
    switch (action) {
      case 'start':
        if (plan.status === 'inactive' || plan.status === 'paused') {
          newStatus = 'active'
          // 如果是立即执行或者已经到了执行时间，直接开始运行
          const schedule = JSON.parse(plan.schedule || '{}')
          if (schedule.type === 'immediate' || (schedule.startTime && new Date(schedule.startTime) <= new Date())) {
            newStatus = 'running'
            nextRun = new Date().toISOString()
          }
        }
        break
      case 'pause':
        if (plan.status === 'running' || plan.status === 'active') {
          newStatus = 'paused'
        }
        break
      case 'stop':
        if (plan.status === 'running' || plan.status === 'paused' || plan.status === 'active') {
          newStatus = 'inactive'
          nextRun = null
        }
        break
    }
    
    // 更新计划状态
    const updateStmt = db.prepare(`
      UPDATE auto_test_plans 
      SET status = ?, next_run = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    
    updateStmt.run(newStatus, nextRun, planId)
    
    return NextResponse.json({
      success: true,
      data: { status: newStatus }
    })
    
  } catch (error) {
    console.error('Failed to control auto test plan:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: '控制自动测试计划失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}