import { NextRequest, NextResponse } from 'next/server'
import { phoneNumberDB } from '@/lib/database'

// GET - 获取运营商列表
export async function GET(request: NextRequest) {
  try {
    const carriers = await phoneNumberDB.getUniqueCarriers()
    
    return NextResponse.json({
      success: true,
      data: carriers
    })
    
  } catch (error) {
    console.error('Failed to fetch carriers:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: '获取运营商列表失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}