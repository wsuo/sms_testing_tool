import { NextRequest, NextResponse } from 'next/server'
import { systemConfigDB } from '@/lib/database'

// 获取系统配置
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')
    
    if (key) {
      // 获取单个配置项
      const value = await systemConfigDB.getConfig(key)
      if (value === null) {
        return NextResponse.json(
          { success: false, message: '配置项不存在' },
          { status: 404 }
        )
      }
      
      return NextResponse.json({
        success: true,
        data: { key, value }
      })
    } else {
      // 获取所有配置项
      const configs = await systemConfigDB.getAllConfigs()
      return NextResponse.json({
        success: true,
        data: configs
      })
    }
  } catch (error) {
    console.error('获取系统配置失败:', error)
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

// 更新系统配置
export async function POST(request: NextRequest) {
  try {
    const { key, value, description } = await request.json()
    
    if (!key || value === undefined) {
      return NextResponse.json(
        { success: false, message: '缺少必要参数：key 和 value' },
        { status: 400 }
      )
    }
    
    // 特殊处理培训合格分数
    if (key === 'training_pass_score') {
      const numValue = parseInt(value, 10)
      if (isNaN(numValue) || numValue < 0 || numValue > 100) {
        return NextResponse.json(
          { success: false, message: '合格分数必须是0-100之间的数字' },
          { status: 400 }
        )
      }
      
      const success = await systemConfigDB.setTrainingPassScore(numValue)
      if (!success) {
        throw new Error('更新合格分数配置失败')
      }
    } else {
      // 更新其他配置
      const success = await systemConfigDB.setConfig(key, value.toString(), description)
      if (!success) {
        throw new Error('更新配置失败')
      }
    }
    
    console.log(`系统配置已更新: ${key} = ${value}`)
    
    return NextResponse.json({
      success: true,
      data: { key, value },
      message: '配置更新成功'
    })
    
  } catch (error) {
    console.error('更新系统配置失败:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : '更新配置失败'
      },
      { status: 500 }
    )
  }
}

// 删除系统配置
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')
    
    if (!key) {
      return NextResponse.json(
        { success: false, message: '缺少必要参数：key' },
        { status: 400 }
      )
    }
    
    // 禁止删除重要配置
    const protectedKeys = ['training_pass_score']
    if (protectedKeys.includes(key)) {
      return NextResponse.json(
        { success: false, message: '此配置项不允许删除' },
        { status: 403 }
      )
    }
    
    const success = await systemConfigDB.deleteConfig(key)
    if (!success) {
      return NextResponse.json(
        { success: false, message: '配置项不存在或删除失败' },
        { status: 404 }
      )
    }
    
    console.log(`系统配置已删除: ${key}`)
    
    return NextResponse.json({
      success: true,
      message: '配置删除成功'
    })
    
  } catch (error) {
    console.error('删除系统配置失败:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : '删除配置失败'
      },
      { status: 500 }
    )
  }
}