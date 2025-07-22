import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { outId, aliyunToken } = await request.json()

    if (!outId || !aliyunToken) {
      return NextResponse.json(
        { error: '缺少必需参数' },
        { status: 400 }
      )
    }

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
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
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