import { NextRequest, NextResponse } from 'next/server'

// Parse cookie string to extract token
function parseTokenFromCookie(cookieString: string): { token: string | null, tokenType: string | null } {
  if (!cookieString) return { token: null, tokenType: null }
  
  console.log('Parsing cookie string (first 200 chars):', cookieString.substring(0, 200))
  
  // 查找可能的token字段
  const tokenPatterns = [
    { pattern: /sec_token[=:]([^;,\s]+)/i, type: 'sec_token' },
    { pattern: /c_csrf_token[=:]([^;,\s]+)/i, type: 'c_csrf_token' },
    { pattern: /csrf_token[=:]([^;,\s]+)/i, type: 'csrf_token' },
    { pattern: /login_aliyunid_csrf[=:]([^;,\s]+)/i, type: 'login_aliyunid_csrf' }
  ]
  
  for (const { pattern, type } of tokenPatterns) {
    const match = cookieString.match(pattern)
    if (match && match[1]) {
      console.log(`Found ${type}:`, match[1].substring(0, 20) + '...')
      return { token: match[1], tokenType: type }
    }
  }
  
  // 列出所有找到的cookie键，帮助调试
  const allKeys = cookieString.match(/([^=;,\s]+)=/g)
  if (allKeys) {
    console.log('Available cookie keys:', allKeys.slice(0, 10).join(', '))
  }
  
  return { token: null, tokenType: null }
}

export async function POST(request: NextRequest) {
  try {
    const { outId } = await request.json()
    
    // Get aliyun cookie from cookie
    const aliyunCookieString = request.cookies.get('sms-aliyun-cookie')?.value
    
    console.log('Cookie from request:', aliyunCookieString ? 'Found' : 'Not found')
    
    if (!outId || !aliyunCookieString) {
      return NextResponse.json(
        { error: '缺少必需参数' },
        { status: 400 }
      )
    }
    
    // Decode the cookie string in case it's URL encoded
    const decodedCookie = decodeURIComponent(aliyunCookieString)
    console.log('Decoded cookie (first 200 chars):', decodedCookie.substring(0, 200))
    
    // Extract token from cookie string
    const { token: aliyunToken, tokenType } = parseTokenFromCookie(decodedCookie)
    
    if (!aliyunToken) {
      console.log('Token not found in cookie, available keys listed above')
      return NextResponse.json(
        { error: '无法从Cookie中提取有效的token (尝试了sec_token, c_csrf_token等)' },
        { status: 400 }
      )
    }
    
    console.log(`Using ${tokenType} as authentication token`)

    // Get current date for query
    const currentDate = new Date().toISOString().split('T')[0]
    
    // Prepare form data for Aliyun API
    const formData = new URLSearchParams({
      action: 'QuerySendDetailsByPhoneNumNew',
      product: 'dysms20170620',
      params: JSON.stringify({
        PageNo: 1,
        PageSize: 50,
        PhoneNum: "",
        SendDate: currentDate,
        SendStatus: "",
        SignName: "",
        ErrorCode: "",
        BizId: "",
        TemplateCode: ""
      }),
      umid: "Yb47d925189abd3f95a194bd66162a5a2",
      collina: "140",
      sec_token: aliyunToken
    })

    const response = await fetch(
      `https://dysms.console.aliyun.com/data/api.json?action=QuerySendDetailsByPhoneNumNew&t=${Date.now()}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Cookie': aliyunCookieString // Add full cookie string
        },
        body: formData.toString()
      }
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    
    if (data.code !== "200" || !data.data?.List?.SmsSendDetailResponse) {
      return NextResponse.json(
        { error: '阿里云API返回错误', details: data },
        { status: 500 }
      )
    }

    // Find the SMS record by OutId
    const smsRecords = data.data.List.SmsSendDetailResponse
    const targetRecord = smsRecords.find((record: any) => record.OutId === outId)
    
    if (!targetRecord) {
      return NextResponse.json(
        { error: `未找到OutId为${outId}的短信记录` },
        { status: 404 }
      )
    }

    // Map Aliyun SendStatus to Chinese status
    const mapSendStatus = (sendStatus: number, errCode?: string) => {
      if (errCode && errCode !== "DELIVERED") {
        return "发送失败"
      }
      
      switch (sendStatus) {
        case 1:
          return "发送中"
        case 3:
          return "已送达"
        default:
          return "发送失败"
      }
    }

    // Map the status and return formatted data
    const status = mapSendStatus(targetRecord.SendStatus, targetRecord.ErrCode)
    
    return NextResponse.json({
      status,
      errorCode: targetRecord.ErrCode && targetRecord.ErrCode !== "DELIVERED" ? targetRecord.ErrCode : undefined,
      receiveDate: targetRecord.ReceiveDateStr || undefined,
    })

  } catch (error) {
    console.error('查询阿里云短信状态失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误', details: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    )
  }
}