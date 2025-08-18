import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'API正常工作',
    timestamp: new Date().toISOString()
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    return NextResponse.json({
      success: true,
      message: 'POST请求正常工作',
      body,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'POST请求解析失败',
      error: error instanceof Error ? error.message : '未知错误'
    })
  }
}