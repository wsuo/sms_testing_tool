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
    
    // Generate dynamic values based on current session
    const timestamp = Date.now()
    const sessionId = Math.random().toString(36).substr(2, 9)
    const traceId = `7a40fe8c${timestamp}${Math.floor(Math.random() * 1000000)}`
    
    // Extract session-specific values from cookie
    const cnaMatch = decodedCookie.match(/cna=([^;]+)/i)
    const cna = cnaMatch ? cnaMatch[1] : 'unknown'
    
    // Use _uab_collina value from cookie as base for collina generation
    const uabCollinaMatch = decodedCookie.match(/_uab_collina=([^;]+)/i)
    const uabCollina = uabCollinaMatch ? uabCollinaMatch[1] : ''
    
    // Generate a more dynamic collina based on session
    const dynamicCollina = uabCollina ? `140%23${uabCollina}` : "140%23LCFojPGgzzWOpzo22xK%2BwtSrOSUKMVIpuk1lUcNlDSXkqrjtYIFCl4n5sEi1QyllSbahoD4ckT%2F7StOfPrXFX6hqzzc%2BuXU4niTzzZ8Kba7ulFzx2DD3VtgqDDDx2CeT4EhvzWXiqUuFoG15adb61pxJNibiL2kKllfzzDrVtv%2FqWtQm2wswyINIPtrPHpcDmKliqMYF0s7Mnuxub8j3x5KXJ9e1aodjhhlW15SR1QJY7UhcYEefDKYbNvNNFIAoyIaAS6WNibTJqBPmkbrWNLxsqMnXlk%2BcyL8WnqpCx9dJUekbpMHrsGAVnKQoJMsDpsun%2BU%2BKH5yq4kdUzQkqhSdpjhVDzv5BIo4zLSQe49f3yn7rYTiStnJ5dxgkh6riiK4J2nB7yTqCMbciuyRrR0ITcv0sz9O%2BoOni2aB3xGkiRSAIy139PcXETbT40Xe2yOuVmMOA%2BNRF0XlvLqMq4rGPHwxWKr1iaiacuJWpxncd0t1HFvBeQkWFatovoP%2BcPtVN2UbFsNWtbQJalWNqsCfK7ci0NZToABvWMAPTLCEEscJ22IhvchO145N6Ui3mmBDyeDaWw7LQU1g84M8aS8aNRBl9fCPXdI6dSt3L8YcYGNWXafcjFshl%2F%2Bsee2evOFJKOoGwkZrOXoJYmD2aGfu8ZxNSA9KMO%2B%2FmM8o%2B8Boe79srdpzCPzg4%2BI0O16V5G1mAWqFXIRT5PSCRxS5HzHY4UUK3t8cN5JX9jug%2FWcvia8UXVOs7mGbvF29A6%2FV1J0fub8mwvjiOctBZFI1VuAfLn1lkbjc9wUGbhTu%2FUN%2BhrrJZBi9gdnCbFawj8isIu3D1xXlM993wbilQPTYr3iR7hXAXa4cvzF%3D%3D"
    
    // Get the correct sec_token from cookie (login_aliyunid_csrf value)
    const secTokenMatch = decodedCookie.match(/login_aliyunid_csrf=([^;]+)/i)
    const latestSecToken = secTokenMatch ? secTokenMatch[1] : "hlwNUitqNN2ZzyYDW1H2D6"
    
    console.log('Generated dynamic values:')
    console.log('- cna:', cna)
    console.log('- uab_collina:', uabCollina)
    console.log('- dynamic_collina prefix:', dynamicCollina.substring(0, 50) + '...')
    console.log('- sec_token from login_aliyunid_csrf:', latestSecToken)
    console.log('- sessionId:', sessionId)
    console.log('- traceId:', traceId)
    
    // Use parameters that match your real request exactly
    const formData = new URLSearchParams({
      action: 'QuerySendDetailsByPhoneNumNew',
      product: 'dysms20170620',
      params: JSON.stringify({
        PageNo: 1,
        PageSize: 10, // Use same PageSize as real request
        PhoneNum: "",
        SendDate: currentDate,
        SendStatus: "",
        SignName: "",
        ErrorCode: "",
        BizId: "", // Leave BizId empty like real request
        TemplateCode: ""
      }),
      // Use the actual umid from your real request
      umid: "Ya8cd8a07cf07c6a8158f0dcc0a3d8f3e",
      // Use dynamic collina based on session
      collina: dynamicCollina,
      // Use sec_token from cookie
      sec_token: latestSecToken
    })
    
    console.log('Using dynamic parameters based on current session:')
    console.log('- PageSize: 10 (matching real request)')
    console.log('- BizId: empty (matching real request)')
    console.log('- collina: dynamic based on _uab_collina')
    console.log('- sec_token from login_aliyunid_csrf:', latestSecToken?.substring(0, 20) + '...')
    console.log('- sessionId (dynamic):', sessionId)
    console.log('- traceId (dynamic):', traceId)
    console.log('Form data keys:', Array.from(formData.keys()).join(', '))

    // Try to find the SMS records by calling the SMS dashboard API
    const response = await fetch(
      `https://dysms.console.aliyun.com/data/api.json?action=QuerySendDetailsByPhoneNumNew&t=${Date.now()}`,
      {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'bx-v': '2.5.31',
          'content-type': 'application/x-www-form-urlencoded',
          'eagleeye-pappname': 'eb362az63s@0b3b1f5d42665b1',
          'eagleeye-sessionid': sessionId,
          'eagleeye-traceid': traceId,
          'priority': 'u=1, i',
          'sec-ch-ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"macOS"',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-origin',
          'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
          'Referer': 'https://dysms.console.aliyun.com/record',
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

    // Find the SMS record by OutId - since BizId is empty, we need to search through all records
    const smsRecords = data.data?.List?.SmsSendDetailResponse || []
    console.log('Total SMS records found:', smsRecords.length)
    
    // Log all OutIds for debugging
    const allOutIds = smsRecords.map((record: any) => record.OutId)
    console.log('All OutIds in response:', allOutIds)
    
    const targetRecord = smsRecords.find((record: any) => {
      // Convert both to strings for comparison since OutId can be number or string
      return String(record.OutId) === String(outId)
    })
    
    console.log('Looking for OutId:', outId, 'Type:', typeof outId)
    console.log('Found target record:', !!targetRecord)
    
    if (!targetRecord) {
      console.log('No matching record found for OutId:', outId)
      console.log('Available OutIds:', allOutIds)
      return NextResponse.json(
        { 
          error: `未找到OutId为${outId}的短信记录`,
          details: `在 ${smsRecords.length} 条记录中未找到匹配项`,
          availableOutIds: allOutIds.slice(0, 10) // Show first 10 for debugging
        },
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