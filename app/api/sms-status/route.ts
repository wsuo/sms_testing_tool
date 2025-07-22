import { NextRequest, NextResponse } from 'next/server'

// Parse cookie string to extract token and CSRF token
function parseTokenFromCookie(cookieString: string): { token: string | null, tokenType: string | null, csrfToken: string | null } {
  if (!cookieString) return { token: null, tokenType: null, csrfToken: null }
  
  console.log('Raw cookie string length:', cookieString.length)
  console.log('Cookie string (first 500 chars):', cookieString.substring(0, 500))
  
  let secToken: string | null = null
  let csrfToken: string | null = null
  
  // Try to parse as JSON first (in case it's a JSON string)
  try {
    const parsed = JSON.parse(cookieString)
    if (typeof parsed === 'object') {
      console.log('Cookie appears to be JSON, keys:', Object.keys(parsed).join(', '))
      // Check for tokens in JSON object
      for (const key of ['sec_token', 'secToken', 'token']) {
        if (parsed[key]) {
          secToken = parsed[key]
          break
        }
      }
      for (const key of ['csrf_token', 'csrfToken', 'c_csrf_token', 'login_aliyunid_csrf']) {
        if (parsed[key]) {
          csrfToken = parsed[key]
          break
        }
      }
    }
  } catch (e) {
    // Not JSON, continue with string parsing
    console.log('Cookie is not JSON, parsing as string')
  }
  
  // Parse cookie string for multiple tokens
  const cookies = cookieString.split(/[;,]/).reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split(/[=:]/).map(s => s.trim())
    if (key && value) {
      acc[key] = value
    }
    return acc
  }, {} as Record<string, string>)
  
  console.log('Parsed cookies:', Object.keys(cookies).slice(0, 20).join(', '))
  
  // Find sec_token or alternative tokens
  if (!secToken) {
    secToken = cookies['sec_token'] || cookies['secToken'] || cookies['token'] ||
               cookies['login_aliyunid_csrf'] || cookies['c_csrf_token'] ||
               cookies['login_aliyunid_ticket']
  }
  
  // Find CSRF token
  if (!csrfToken) {
    csrfToken = cookies['csrf_token'] || cookies['csrfToken'] || cookies['c_csrf_token'] || 
                cookies['login_aliyunid_csrf'] || cookies['login_aliyunid_csrf_token']
  }
  
  // If still not found, try regex patterns
  if (!secToken) {
    const secTokenMatch = cookieString.match(/sec_token[=:]?\s*([^;,\s]+)/i)
    if (secTokenMatch) secToken = secTokenMatch[1]
  }
  
  if (!csrfToken) {
    const csrfTokenMatch = cookieString.match(/(?:csrf_token|c_csrf_token|login_aliyunid_csrf)[=:]?\s*([^;,\s]+)/i)
    if (csrfTokenMatch) csrfToken = csrfTokenMatch[1]
  }
  
  console.log('Found sec_token:', secToken ? secToken.substring(0, 20) + '...' : 'null')
  console.log('Found csrf_token:', csrfToken ? csrfToken.substring(0, 20) + '...' : 'null')
  
  return { 
    token: secToken, 
    tokenType: secToken ? (cookies['sec_token'] ? 'sec_token' : 
                          cookies['login_aliyunid_csrf'] ? 'login_aliyunid_csrf' :
                          cookies['c_csrf_token'] ? 'c_csrf_token' :
                          cookies['login_aliyunid_ticket'] ? 'login_aliyunid_ticket' : 'unknown') : null,
    csrfToken: csrfToken
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Request body keys:', Object.keys(body))
    console.log('Request body:', JSON.stringify(body).substring(0, 200))
    
    const { outId, aliyunCookie } = body
    
    console.log('Cookie from request body:', aliyunCookie ? 'Found' : 'Not found')
    console.log('Cookie length:', aliyunCookie ? aliyunCookie.length : 0)
    console.log('OutId:', outId)
    
    if (!outId || !aliyunCookie) {
      console.log('Missing required parameters:', { outId: !!outId, aliyunCookie: !!aliyunCookie })
      return NextResponse.json(
        { error: '缺少必需参数 (outId 和 aliyunCookie)' },
        { status: 400 }
      )
    }
    
    // Decode the cookie string in case it's URL encoded
    const decodedCookie = decodeURIComponent(aliyunCookie)
    console.log('Decoded cookie (first 200 chars):', decodedCookie.substring(0, 200))
    
    // Extract token from cookie string (but we'll use empty sec_token like real requests)
    console.log('Starting cookie parsing...')
    const { token: aliyunToken, tokenType, csrfToken } = parseTokenFromCookie(decodedCookie)
    console.log('Cookie parsing result:', { 
      hasToken: !!aliyunToken, 
      tokenType, 
      hasCsrfToken: !!csrfToken 
    })
    
    // Note: Real Aliyun requests use empty sec_token, authentication is via cookies
    console.log('Using cookie-based authentication (empty sec_token like real requests)')
    console.log(`CSRF token available: ${!!csrfToken}`)

    // Get current date for query
    const currentDate = new Date().toISOString().split('T')[0]
    
    // Generate timestamp for the request
    const timestamp = Date.now()
    
    // Use realistic parameters based on your actual Aliyun request
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
        BizId: outId,
        TemplateCode: ""
      }),
      // Use the actual umid from your real request
      umid: "Ya8cd8a07cf07c6a8158f0dcc0a3d8f3e",
      // Use the actual collina from your real request
      collina: "140%23sd2x0bZ0zzWmLQo2%2BQiQKtN8s9zPIvTQWCVgq9Ou7dYoDoym8pZJoZ%2B86wAOqhzSDlVqlbzxVnc3V51%2FzzrQ1OK7lpTzzPzbVXl%2FlbubbPd6%2FoTkGQrU2X8%2BlpYazDziVn%2FqlWfdOT8I1wba7X53xEZmIggNskuwuqM75RhThaITGjEdGIZrxXuX0b3RS4MEQDR%2B3WYAoRZY5KJ2RnZhTZF%2FgNgZ2XWVjo9aJgVcBpJG%2BnSPF5DEquHwJMVHQZJiohas67IH4RL3eZK5VV4gfLfhj94LGtLIjqSSGOWAkzji3TbDy%2F1SQGDxi0Zj3NLAb9Ydsgle%2FtVICvUUSp7lbDBCBKiXxDhQ%2Ba8hn%2FFWzjUZEJTTURasiEDFCyiaQxLC4BFwomRrqCMyLGyuLEXhro%2FcFFBRSRFi3IVg4cf8HZQtYecA9JrXgSuI1r1qBtLjYlVZAC956FfLK0j8viQggJiILZQW8JDkffI35O81wig4F5xR0Cza9AtsATAIT62M%2F7uYksaDfmKxeyK0v%2FOf2lOoYcwUwuR9JYlbpm3GE3Oxb%2BTYw6tA7gIB9zayrriGLebVHlPVSlXUH7SvPPSgOp4n8IfN47BLXq2VpRZfMRWSMA0LOcbOLWpLyavwikOA2J62aJA8Vc%2FbF1u%3D",
      // Use the actual sec_token from your real request
      sec_token: "hlwNUitqNN2ZzyYDW1H2D6"
    })
    
    console.log('Using real parameters from your SMS query request')
    console.log('sec_token:', "hlwNUitqNN2ZzyYDW1H2D6")
    console.log('Form data keys:', Array.from(formData.keys()).join(', '))

    // Try to find the SMS records by calling the SMS dashboard API
    const response = await fetch(
      `https://dysms.console.aliyun.com/data/api.json?action=QuerySendDetailsByPhoneNumNew&t=${Date.now()}`,
      {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'content-type': 'application/x-www-form-urlencoded',
          'origin': 'https://dysms.console.aliyun.com',
          'priority': 'u=1, i',
          'referer': 'https://dysms.console.aliyun.com/record',
          'sec-ch-ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"macOS"',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-origin',
          'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
          'Cookie': aliyunCookie // Use full cookie string from request body
        },
        body: formData.toString()
      }
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    
    console.log('Aliyun API response code:', data.code)
    console.log('Aliyun API response has data:', !!data.data)
    
    if (data.code !== "200" || !data.data?.List?.SmsSendDetailResponse) {
      console.log('Aliyun API error response:', JSON.stringify(data).substring(0, 500))
      
      // Check for authentication errors
      if (data.code === "403" || data.message?.includes('csrf') || data.message?.includes('token')) {
        return NextResponse.json(
          { 
            error: '阿里云认证失败', 
            details: 'Cookie中的认证信息可能已过期，请重新从阿里云控制台获取',
            apiError: data.message || data.code
          },
          { status: 401 }
        )
      }
      
      return NextResponse.json(
        { 
          error: '阿里云API返回错误', 
          details: data.message || data.msg || '未知错误',
          apiCode: data.code
        },
        { status: 500 }
      )
    }

    // Find the SMS record by OutId
    const smsRecords = data.data?.List?.SmsSendDetailResponse || []
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