import { NextRequest, NextResponse } from 'next/server'
import { systemConfigDB } from '@/lib/database'

// 允许公开访问的配置项
const PUBLIC_CONFIG_KEYS = [
  'exam_time_limit', // 考试时间限制
  'training_pass_score' // 培训合格分数
]

// 获取公开系统配置
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')
    
    if (!key) {
      return NextResponse.json(
        { success: false, message: '缺少配置项key参数' },
        { status: 400 }
      )
    }

    // 检查是否为允许公开访问的配置项
    if (!PUBLIC_CONFIG_KEYS.includes(key)) {
      return NextResponse.json(
        { success: false, message: '该配置项不允许公开访问' },
        { status: 403 }
      )
    }
    
    // 获取配置项
    const value = await systemConfigDB.getConfig(key)
    if (value === null) {
      // 如果配置项不存在，返回默认值
      let defaultValue = ''
      switch (key) {
        case 'exam_time_limit':
          defaultValue = '35' // 默认35分钟
          break
        case 'training_pass_score':
          defaultValue = '60' // 默认60分
          break
      }
      
      return NextResponse.json({
        success: true,
        data: { key, value: defaultValue, isDefault: true }
      })
    }
    
    return NextResponse.json({
      success: true,
      data: { key, value, isDefault: false }
    })
    
  } catch (error) {
    console.error('获取公开配置失败:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: '获取配置失败',
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}