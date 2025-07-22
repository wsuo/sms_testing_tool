import { NextRequest, NextResponse } from 'next/server'
import Dysmsapi, * as $Dysmsapi from '@alicloud/dysmsapi20170525'
import OpenApi, * as $OpenApi from '@alicloud/openapi-client'

// 创建阿里云SMS客户端
function createClient(): Dysmsapi {
  const config = new $OpenApi.Config({})
  
  // 从环境变量获取AccessKey
  config.accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID
  config.accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET
  
  // 设置endpoint
  config.endpoint = 'dysmsapi.aliyuncs.com'
  
  return new Dysmsapi(config)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Request body:', JSON.stringify(body).substring(0, 200))
    
    const { outId, phoneNumber } = body
    
    if (!outId || !phoneNumber) {
      console.log('Missing required parameters:', { outId: !!outId, phoneNumber: !!phoneNumber })
      return NextResponse.json(
        { error: '缺少必需参数 (outId 和 phoneNumber)' },
        { status: 400 }
      )
    }

    // 检查环境变量是否配置
    if (!process.env.ALIYUN_ACCESS_KEY_ID || !process.env.ALIYUN_ACCESS_KEY_SECRET) {
      console.error('Aliyun credentials not configured')
      return NextResponse.json(
        { error: '阿里云访问凭证未配置，请设置环境变量 ALIYUN_ACCESS_KEY_ID 和 ALIYUN_ACCESS_KEY_SECRET' },
        { status: 500 }
      )
    }

    console.log('Using Aliyun SMS SDK to query send details')
    console.log('OutId (BizId):', outId)
    console.log('Phone Number:', phoneNumber)
    
    // 创建客户端
    const client = createClient()
    
    // 获取当前日期 (yyyyMMdd格式)
    const sendDate = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    
    // 创建查询请求
    const queryReq = new $Dysmsapi.QuerySendDetailsRequest({
      phoneNumber: phoneNumber,
      bizId: outId, // outId对应bizId
      sendDate: sendDate,
      pageSize: 50,
      currentPage: 1,
    })

    console.log('Query parameters:', {
      phoneNumber,
      bizId: outId,
      sendDate,
      pageSize: 50,
      currentPage: 1
    })

    // 调用API查询
    const queryResp = await client.querySendDetails(queryReq)
    
    console.log('Aliyun API response code:', queryResp.body.code)
    console.log('Aliyun API response message:', queryResp.body.message)
    
    if (queryResp.body.code !== 'OK') {
      console.error('Aliyun API error:', queryResp.body.message)
      return NextResponse.json(
        { 
          error: '阿里云API调用失败', 
          details: queryResp.body.message,
          apiCode: queryResp.body.code
        },
        { status: 500 }
      )
    }

    // 获取短信发送详情
    const smsDetails = queryResp.body.smsSendDetailDTOs?.smsSendDetailDTO || []
    console.log('Found SMS records:', smsDetails.length)

    // 查找匹配的记录（通过OutId/BizId匹配）
    const targetRecord = smsDetails.find((record: any) => {
      return String(record.outId) === String(outId)
    })

    if (!targetRecord) {
      console.log('No matching record found for OutId:', outId)
      const allOutIds = smsDetails.map((record: any) => record.outId)
      console.log('Available OutIds:', allOutIds)
      
      return NextResponse.json(
        { 
          error: `未找到OutId为${outId}的短信记录`,
          details: `在 ${smsDetails.length} 条记录中未找到匹配项`,
          availableOutIds: allOutIds.slice(0, 10)
        },
        { status: 404 }
      )
    }

    console.log('Found target record:', {
      outId: targetRecord.outId,
      sendStatus: targetRecord.sendStatus,
      phoneNum: targetRecord.phoneNum
    })

    // 映射阿里云状态到中文
    const mapSendStatus = (sendStatus: number, errCode?: string) => {
      if (errCode && errCode !== "DELIVRD") {
        return "发送失败"
      }
      
      switch (sendStatus) {
        case 1:
          return "发送中"
        case 3:
          return "已送达"
        case 2:
        default:
          return "发送失败"
      }
    }

    const status = mapSendStatus(targetRecord.sendStatus, targetRecord.errCode)
    
    return NextResponse.json({
      status,
      errorCode: targetRecord.errCode && targetRecord.errCode !== "DELIVRD" ? targetRecord.errCode : undefined,
      receiveDate: targetRecord.receiveDate || undefined,
      sendDate: targetRecord.sendDate || undefined,
    })

  } catch (error) {
    console.error('查询阿里云短信状态失败:', error)
    return NextResponse.json(
      { 
        error: '服务器内部错误', 
        details: error instanceof Error ? error.message : '未知错误' 
      },
      { status: 500 }
    )
  }
}