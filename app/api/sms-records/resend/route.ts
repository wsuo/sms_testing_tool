import { NextRequest, NextResponse } from 'next/server'
import { smsRecordDB } from '@/lib/database'

// POST - 重发SMS
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { out_id, admin_token } = body
    
    // 验证必需参数
    if (!out_id) {
      return NextResponse.json(
        { 
          success: false, 
          error: '缺少必需参数: out_id' 
        },
        { status: 400 }
      )
    }

    if (!admin_token) {
      return NextResponse.json(
        { 
          success: false, 
          error: '缺少管理后台令牌' 
        },
        { status: 400 }
      )
    }

    // 检查记录是否可以重发
    const canResendResult = smsRecordDB.canResend(out_id)
    if (!canResendResult.canResend) {
      return NextResponse.json(
        { 
          success: false, 
          error: canResendResult.reason || '无法重发此记录' 
        },
        { status: 400 }
      )
    }

    // 获取原记录信息
    const originalRecord = smsRecordDB.findByOutId(out_id)
    if (!originalRecord) {
      return NextResponse.json(
        { 
          success: false, 
          error: '未找到原始记录' 
        },
        { status: 404 }
      )
    }

    // 准备重发数据
    const resendData = {
      content: originalRecord.content || '',
      params: originalRecord.template_params ? JSON.parse(originalRecord.template_params) : [],
      mobile: originalRecord.phone_number,
      templateCode: originalRecord.template_code || '',
      templateParams: originalRecord.template_params ? JSON.parse(originalRecord.template_params) : {}
    }

    console.log('重发SMS数据:', {
      outId: out_id,
      phone: originalRecord.phone_number,
      templateCode: originalRecord.template_code,
      retryCount: originalRecord.retry_count || 0
    })

    // 调用管理后台API重新发送
    const sendResponse = await fetch('https://wxapp.agrochainhub.com/admin-api/system/sms-template/send-sms', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${admin_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resendData)
    })

    if (!sendResponse.ok) {
      console.error('管理后台API调用失败:', sendResponse.status, sendResponse.statusText)
      return NextResponse.json(
        { 
          success: false, 
          error: '管理后台API调用失败',
          details: `HTTP ${sendResponse.status}: ${sendResponse.statusText}`
        },
        { status: 500 }
      )
    }

    const sendResult = await sendResponse.json()
    
    // 检查API响应
    if (sendResult.code !== 0) {
      console.error('重发失败，API错误:', sendResult)
      return NextResponse.json(
        { 
          success: false, 
          error: '重发失败',
          details: sendResult.msg || '管理后台返回错误'
        },
        { status: 400 }
      )
    }

    const newOutId = sendResult.data ? String(sendResult.data) : `resend-${Date.now()}`

    // 增加原记录的重试计数
    const incrementSuccess = smsRecordDB.incrementRetryCount(out_id)
    if (!incrementSuccess) {
      console.warn('更新重试计数失败，但重发成功')
    }

    // 创建新的重发记录
    try {
      const newRecordId = smsRecordDB.insertRecord({
        out_id: newOutId,
        phone_number: originalRecord.phone_number,
        carrier: originalRecord.carrier,
        phone_note: originalRecord.phone_note,
        template_code: originalRecord.template_code,
        template_name: originalRecord.template_name,
        template_params: originalRecord.template_params,
        content: originalRecord.content,
        send_date: new Date().toLocaleString('zh-CN'),
        status: '发送中',
        error_code: undefined,
        retry_count: (originalRecord.retry_count || 0) + 1
      })

      console.log('重发记录创建成功:', {
        originalOutId: out_id,
        newOutId: newOutId,
        newRecordId: newRecordId,
        retryCount: (originalRecord.retry_count || 0) + 1
      })

    } catch (dbError) {
      console.error('创建重发记录失败:', dbError)
      // 不阻断流程，重发已经成功
    }

    // 获取更新后的原记录
    const updatedOriginalRecord = smsRecordDB.findByOutId(out_id)
    const newRecord = smsRecordDB.findByOutId(newOutId)

    return NextResponse.json({
      success: true,
      data: {
        original_record: updatedOriginalRecord,
        new_record: newRecord,
        new_out_id: newOutId,
        retry_count: (originalRecord.retry_count || 0) + 1
      },
      message: `重发成功，新OutId: ${newOutId}`
    })

  } catch (error) {
    console.error('重发SMS失败:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: '重发SMS失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}

// GET - 获取可重发的记录列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    
    const resendableRecords = smsRecordDB.findResendableRecords(limit, offset)
    
    // 为每条记录检查是否可以重发
    const recordsWithCanResend = resendableRecords.map(record => {
      const canResendResult = smsRecordDB.canResend(record.out_id)
      return {
        ...record,
        can_resend: canResendResult.canResend,
        resend_reason: canResendResult.reason
      }
    })
    
    return NextResponse.json({
      success: true,
      data: recordsWithCanResend,
      total: recordsWithCanResend.length
    })
    
  } catch (error) {
    console.error('获取可重发记录失败:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: '获取可重发记录失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}