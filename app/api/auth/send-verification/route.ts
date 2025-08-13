import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import storage from '@/lib/verification-storage'

export async function POST(request: NextRequest) {
  try {
    const { sessionId, pageUrl, userAgent } = await request.json()
    
    if (!sessionId || !pageUrl) {
      return NextResponse.json(
        { success: false, message: '缺少必要参数' },
        { status: 400 }
      )
    }

    // 获取客户端IP
    const clientIP = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
    const limitKey = `${clientIP}-${sessionId}`

    // 检查发送频率限制
    const lastSent = storage.getSendLimit(limitKey)
    if (lastSent && Date.now() - lastSent < 60 * 1000) {
      return NextResponse.json(
        { success: false, message: '发送过于频繁，请稍后再试' },
        { status: 429 }
      )
    }

    // 生成6位随机验证码
    const code = Math.random().toString().slice(2, 8).padStart(6, '0')
    const timestamp = Date.now()

    // 存储验证码
    const storageKey = `${sessionId}-${pageUrl}`
    storage.setVerificationCode(storageKey, code)
    storage.setSendLimit(limitKey)

    // 配置邮件传输器
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: parseInt(process.env.MAIL_PORT || '587'),
      secure: false, // STARTTLS
      auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD
      },
      tls: {
        rejectUnauthorized: false
      }
    })

    // 格式化时间戳
    const sendTime = new Date(timestamp).toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })

    // 发送邮件
    const mailOptions = {
      from: process.env.MAIL_FROM,
      to: 'wangsuoo@qq.com', // 管理员邮箱
      subject: '长颈羚数字管理平台 - 管理员验证码',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">长颈羚数字管理平台</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">管理员安全验证</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="display: inline-block; background: #f8f9fa; padding: 20px 40px; border-radius: 8px; border-left: 4px solid #667eea;">
                <h2 style="margin: 0; color: #333; font-size: 32px; letter-spacing: 8px; font-weight: bold;">${code}</h2>
              </div>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 15px 0; color: #333; font-size: 16px;">验证信息</h3>
              <p style="margin: 8px 0; color: #666; font-size: 14px;"><strong>页面：</strong>${pageUrl}</p>
              <p style="margin: 8px 0; color: #666; font-size: 14px;"><strong>发送时间：</strong>${sendTime}</p>
              <p style="margin: 8px 0; color: #666; font-size: 14px;"><strong>客户端IP：</strong>${clientIP}</p>
              <p style="margin: 8px 0; color: #666; font-size: 14px;"><strong>会话ID：</strong>${sessionId}</p>
            </div>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #856404; font-size: 14px;">
                <strong>⚠️ 安全提醒：</strong><br>
                • 验证码有效期为5分钟<br>
                • 请勿将验证码分享给他人<br>
                • 如非本人操作，请立即检查系统安全
              </p>
            </div>
            
            <p style="color: #888; font-size: 12px; text-align: center; margin-top: 30px;">
              此邮件由系统自动发送，请勿直接回复
            </p>
          </div>
        </div>
      `
    }

    await transporter.sendMail(mailOptions)

    console.log(`验证码已发送 - SessionID: ${sessionId}, Page: ${pageUrl}, Code: ${code}, Time: ${sendTime}`)

    return NextResponse.json({
      success: true,
      message: '验证码已发送到管理员邮箱',
      timestamp: timestamp,
      sendTime: sendTime
    })

  } catch (error) {
    console.error('发送验证码失败:', error)
    return NextResponse.json(
      { success: false, message: '发送验证码失败，请稍后重试' },
      { status: 500 }
    )
  }
}