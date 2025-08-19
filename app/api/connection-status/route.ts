import { NextRequest, NextResponse } from 'next/server'
import { getPlatformPoolStatus, createPlatformPool } from '@/lib/platform-mysql'

export async function GET(request: NextRequest) {
  try {
    // 确保连接池已创建
    createPlatformPool()
    
    const poolStatus = getPlatformPoolStatus()
    
    if (!poolStatus) {
      return NextResponse.json({
        success: false,
        message: '连接池未初始化'
      })
    }
    
    return NextResponse.json({
      success: true,
      data: {
        ...poolStatus,
        timestamp: new Date().toISOString(),
        status: poolStatus.freeConnections > 0 ? 'healthy' : 
                poolStatus.totalConnections === 0 ? 'idle' : 'busy'
      }
    })
  } catch (error) {
    console.error('获取连接池状态失败:', error)
    return NextResponse.json({
      success: false,
      error: '获取连接池状态失败'
    }, { status: 500 })
  }
}