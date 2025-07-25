import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database'

// GET - 获取所有自动测试计划
export async function GET(request: NextRequest) {
  try {
    const db = getDatabase()
    
    // 确保auto_test_plans表存在
    db.exec(`
      CREATE TABLE IF NOT EXISTS auto_test_plans (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        template_id TEXT NOT NULL,
        template_name TEXT,
        phone_numbers TEXT NOT NULL, -- JSON array
        schedule TEXT NOT NULL, -- JSON object
        status TEXT NOT NULL DEFAULT 'inactive',
        progress TEXT NOT NULL DEFAULT '{"total":0,"completed":0,"success":0,"failed":0}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_run DATETIME,
        next_run DATETIME
      )
    `)
    
    // 查询所有自动测试计划
    const stmt = db.prepare(`
      SELECT * FROM auto_test_plans 
      ORDER BY created_at DESC
    `)
    const plans = stmt.all()
    
    return NextResponse.json({
      success: true,
      data: plans.map(plan => ({
        ...plan,
        schedule: JSON.parse(plan.schedule || '{}'),
        phoneNumbers: JSON.parse(plan.phone_numbers || '[]'),
        progress: JSON.parse(plan.progress || '{"total":0,"completed":0,"success":0,"failed":0}')
      }))
    })
    
  } catch (error) {
    console.error('Failed to fetch auto test plans:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: '获取自动测试计划失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}

// POST - 创建新的自动测试计划
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, templateId, phoneNumbers, scheduleType, startTime, interval, endTime } = body
    
    if (!name || !templateId || !phoneNumbers || phoneNumbers.length === 0) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      )
    }
    
    const db = getDatabase()
    
    // 初始化自动测试计划表
    db.exec(`
      CREATE TABLE IF NOT EXISTS auto_test_plans (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        template_id TEXT NOT NULL,
        template_name TEXT,
        phone_numbers TEXT NOT NULL, -- JSON array
        schedule TEXT NOT NULL, -- JSON object
        status TEXT NOT NULL DEFAULT 'inactive',
        progress TEXT NOT NULL DEFAULT '{"total":0,"completed":0,"success":0,"failed":0}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_run DATETIME,
        next_run DATETIME
      )
    `)
    
    // 获取模板名称
    let templateName = ''
    try {
      const adminToken = request.headers.get('authorization')?.replace('Bearer ', '') || 
                        request.headers.get('x-admin-token') || ''
      
      if (adminToken) {
        const templateResponse = await fetch(`https://wxapp.agrochainhub.com/admin-api/system/sms-template/get?id=${templateId}`, {
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (templateResponse.ok) {
          const templateData = await templateResponse.json()
          if (templateData.code === 0 && templateData.data) {
            templateName = templateData.data.name || ''
          }
        }
      }
    } catch (e) {
      console.error('Failed to fetch template name:', e)
    }
    
    const planId = `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const schedule = {
      type: scheduleType,
      startTime: startTime || undefined,
      interval: interval || undefined,
      endTime: endTime || undefined
    }
    
    const progress = {
      total: phoneNumbers.length,
      completed: 0,
      success: 0,
      failed: 0
    }
    
    // 计算下次运行时间
    let nextRun = null
    if (scheduleType === 'immediate') {
      nextRun = new Date().toISOString()
    } else if (scheduleType === 'scheduled' && startTime) {
      nextRun = new Date(startTime).toISOString()
    } else if (scheduleType === 'recurring' && startTime) {
      nextRun = new Date(startTime).toISOString()
    }
    
    const stmt = db.prepare(`
      INSERT INTO auto_test_plans 
      (id, name, description, template_id, template_name, phone_numbers, schedule, status, progress, next_run)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    stmt.run(
      planId,
      name,
      description || '',
      templateId,
      templateName,
      JSON.stringify(phoneNumbers),
      JSON.stringify(schedule),
      scheduleType === 'immediate' ? 'active' : 'inactive',
      JSON.stringify(progress),
      nextRun
    )
    
    return NextResponse.json({
      success: true,
      data: { id: planId }
    })
    
  } catch (error) {
    console.error('Failed to create auto test plan:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: '创建自动测试计划失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}