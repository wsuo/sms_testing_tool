import { NextRequest, NextResponse } from 'next/server'
import { phoneLookupService } from '@/lib/phone-lookup'

// GET - 获取电话号码查询服务状态
export async function GET(request: NextRequest) {
  try {
    const status = await phoneLookupService.getStatus()
    
    return NextResponse.json({
      success: true,
      data: status
    })
  } catch (error) {
    console.error('Get phone lookup service status failed:', error)
    return NextResponse.json({
      success: false,
      error: '获取服务状态时发生错误'
    }, { status: 500 })
  }
}

// POST - 更新服务配置（如token）
export async function POST(request: NextRequest) {
  try {
    const { tokens } = await request.json()
    
    if (tokens) {
      phoneLookupService.setTokens(tokens)
    }
    
    return NextResponse.json({
      success: true,
      message: '配置更新成功'
    })
  } catch (error) {
    console.error('Update phone lookup service config failed:', error)
    return NextResponse.json({
      success: false,
      error: '更新服务配置时发生错误'
    }, { status: 500 })
  }
}

// DELETE - 清空缓存
export async function DELETE(request: NextRequest) {
  try {
    phoneLookupService.clearCache()
    
    return NextResponse.json({
      success: true,
      message: '缓存清空成功'
    })
  } catch (error) {
    console.error('Clear phone lookup service cache failed:', error)
    return NextResponse.json({
      success: false,
      error: '清空缓存时发生错误'
    }, { status: 500 })
  }
}