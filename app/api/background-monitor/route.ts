import { NextRequest, NextResponse } from 'next/server'
import simplifiedSmsMonitor from '@/lib/simplified-sms-monitor'

// GET - 获取后台服务状态
export async function GET(request: NextRequest) {
  try {
    const status = simplifiedSmsMonitor.getStatus()
    
    return NextResponse.json({
      success: true,
      data: {
        isRunning: status.isRunning,
        lastCheck: status.lastCheck,
        message: status.isRunning ? '监控服务运行中' : '监控服务空闲'
      }
    })
  } catch (error) {
    console.error('获取后台服务状态失败:', error)
    return NextResponse.json(
      { success: false, error: '获取服务状态失败' },
      { status: 500 }
    )
  }
}

// POST - 控制后台服务
export async function POST(request: NextRequest) {
  try {
    const { action, outId, phoneNumber } = await request.json()
    
    switch (action) {
      case 'process_pending':
        // 手动处理待监控的SMS
        const result = await simplifiedSmsMonitor.processPendingMessages()
        return NextResponse.json({
          success: true,
          message: `处理完成，共处理 ${result.processed} 条，更新 ${result.updated} 条`,
          data: result
        })
        
      case 'add_sms':
        // 添加SMS到监控
        if (outId && phoneNumber) {
          const added = await simplifiedSmsMonitor.addSmsForMonitoring(outId, phoneNumber)
          return NextResponse.json({
            success: true,
            message: added ? `SMS ${outId} 已添加到监控` : `SMS ${outId} 不需要监控或已存在`
          })
        } else {
          return NextResponse.json(
            { success: false, error: '缺少outId或phoneNumber参数' },
            { status: 400 }
          )
        }
        
      case 'status':
        // 获取状态
        const status = simplifiedSmsMonitor.getStatus()
        return NextResponse.json({
          success: true,
          data: status
        })
        
      default:
        return NextResponse.json(
          { success: false, error: '无效的操作' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('后台服务操作失败:', error)
    return NextResponse.json(
      { success: false, error: '操作失败' },
      { status: 500 }
    )
  }
}