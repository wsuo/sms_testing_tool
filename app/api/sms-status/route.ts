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
    
    // 创建查询请求 - 不使用bizId，通过手机号码和日期查询
    const queryReq = new $Dysmsapi.QuerySendDetailsRequest({
      phoneNumber: phoneNumber,
      sendDate: sendDate,
      pageSize: 50,
      currentPage: 1,
    })

    console.log('Query parameters:', {
      phoneNumber,
      sendDate,
      pageSize: 50,
      currentPage: 1,
      note: 'Querying by phone number and date only'
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

    // 查找匹配的记录（通过OutId匹配，注意OutId是外部流水扩展字段）
    const targetRecord = smsDetails.find((record: any) => {
      // 检查OutId字段匹配
      if (record.outId && String(record.outId) === String(outId)) {
        return true
      }
      // 如果没有OutId，可能需要通过其他方式匹配，比如时间和内容
      // 但这里暂时只通过OutId匹配
      return false
    })

    if (!targetRecord) {
      console.log('No matching record found for OutId:', outId)
      const allOutIds = smsDetails.map((record: any) => record.outId)
      const allRecords = smsDetails.map((record: any) => ({
        outId: record.outId,
        phoneNum: record.phoneNum,
        sendDate: record.sendDate,
        sendStatus: record.sendStatus
      }))
      
      console.log('Available OutIds:', allOutIds)
      console.log('All records preview:', allRecords.slice(0, 3))
      
      // 不返回404，而是返回"发送中"状态
      // 因为找不到记录通常意味着短信已提交至运营商网关但尚未收到回执
      return NextResponse.json({
        status: "发送中",
        errorCode: undefined,
        receiveDate: undefined,
        sendDate: undefined,
        note: "短信已提交至运营商网关，尚未收到回执",
        retryable: true
      })
    }

    console.log('Found target record:', {
      outId: targetRecord.outId,
      sendStatus: targetRecord.sendStatus,
      phoneNum: targetRecord.phoneNum,
      errCode: targetRecord.errCode
    })

    // 映射阿里云状态到中文
    const mapSendStatus = (sendStatus: number, errCode?: string) => {
      // 根据阿里云文档，DELIVERED表示发送成功
      if (errCode && errCode !== "DELIVERED") {
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
    
    console.log('Status mapping result:', {
      sendStatus: targetRecord.sendStatus,
      errCode: targetRecord.errCode,
      mappedStatus: status
    })
    
    return NextResponse.json({
      status,
      errorCode: targetRecord.errCode && targetRecord.errCode !== "DELIVERED" ? targetRecord.errCode : undefined,
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