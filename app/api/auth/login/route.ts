import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    if (!password) {
      return NextResponse.json(
        { success: false, message: '请输入密码' },
        { status: 400 }
      )
    }

    const platformPassword = process.env.PLATFORM_PASSWORD || 'admin123'

    if (password === platformPassword) {
      return NextResponse.json({
        success: true,
        message: '认证成功'
      })
    } else {
      return NextResponse.json(
        { success: false, message: '密码错误' },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error('认证API错误:', error)
    return NextResponse.json(
      { success: false, message: '服务器内部错误' },
      { status: 500 }
    )
  }
}