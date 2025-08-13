import { NextRequest, NextResponse } from 'next/server'
import storage from '@/lib/verification-storage'

export async function POST(request: NextRequest) {
  try {
    const { sessionId, pageUrl, code } = await request.json()
    
    if (!sessionId || !pageUrl || !code) {
      return NextResponse.json(
        { success: false, message: '缺少必要参数' },
        { status: 400 }
      )
    }

    const storageKey = `${sessionId}-${pageUrl}`
    const storedData = storage.getVerificationCode(storageKey)
    
    if (!storedData) {
      return NextResponse.json(
        { success: false, message: '验证码不存在或已过期' },
        { status: 404 }
      )
    }

    // 检查是否过期（5分钟）
    const now = Date.now()
    if (now - storedData.timestamp > 5 * 60 * 1000) {
      storage.deleteVerificationCode(storageKey)
      return NextResponse.json(
        { success: false, message: '验证码已过期' },
        { status: 410 }
      )
    }

    // 检查尝试次数（最多5次）
    if (storedData.attempts >= 5) {
      storage.deleteVerificationCode(storageKey)
      return NextResponse.json(
        { success: false, message: '验证失败次数过多，请重新获取验证码' },
        { status: 429 }
      )
    }

    // 验证码比对
    if (code !== storedData.code) {
      storage.incrementAttempts(storageKey)
      return NextResponse.json(
        { 
          success: false, 
          message: `验证码错误，还剩${5 - storedData.attempts - 1}次机会` 
        },
        { status: 401 }
      )
    }

    // 验证成功，删除验证码（一次性使用）
    storage.deleteVerificationCode(storageKey)

    // 生成管理员认证token（12小时有效）
    const authToken = `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    storage.setAuthToken(authToken, sessionId, pageUrl)

    console.log(`管理员认证成功 - SessionID: ${sessionId}, Page: ${pageUrl}, Token: ${authToken}`)

    return NextResponse.json({
      success: true,
      message: '验证成功',
      authToken,
      expiresAt: now + 12 * 60 * 60 * 1000 // 12小时后过期
    })

  } catch (error) {
    console.error('验证码校验失败:', error)
    return NextResponse.json(
      { success: false, message: '验证失败，请重试' },
      { status: 500 }
    )
  }
}

// GET方法用于检查token有效性
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const authToken = url.searchParams.get('token')
    const sessionId = url.searchParams.get('sessionId')
    const pageUrl = url.searchParams.get('pageUrl')
    
    if (!authToken || !sessionId || !pageUrl) {
      return NextResponse.json(
        { success: false, message: '缺少必要参数' },
        { status: 400 }
      )
    }

    const tokenData = storage.getAuthToken(authToken)
    
    if (!tokenData) {
      return NextResponse.json(
        { success: false, message: '认证token不存在' },
        { status: 404 }
      )
    }

    // 检查token是否过期（12小时）
    const now = Date.now()
    if (now - tokenData.timestamp > 12 * 60 * 60 * 1000) {
      storage.deleteAuthToken(authToken)
      return NextResponse.json(
        { success: false, message: '认证已过期' },
        { status: 410 }
      )
    }

    // 检查session和页面匹配
    if (tokenData.sessionId !== sessionId || tokenData.pageUrl !== pageUrl) {
      return NextResponse.json(
        { success: false, message: '认证信息不匹配' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '认证有效',
      expiresAt: tokenData.timestamp + 12 * 60 * 60 * 1000
    })

  } catch (error) {
    console.error('Token验证失败:', error)
    return NextResponse.json(
      { success: false, message: '验证失败' },
      { status: 500 }
    )
  }
}