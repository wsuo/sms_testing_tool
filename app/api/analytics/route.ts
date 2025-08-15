import { NextRequest, NextResponse } from 'next/server'
import { smsRecordDB } from '@/lib/database'

// GET - 获取分析数据
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') || 'week'
    
    // 构建时间过滤条件
    const dateFilter = getDateFilter(range)
    
    // 获取基础统计数据
    const allRecords = await smsRecordDB.findWithFilters({ dateRange: dateFilter as any, limit: 10000 })
    const totalSms = allRecords.length
    const successCount = allRecords.filter(r => r.status === '已送达').length
    const failedCount = allRecords.filter(r => r.status === '发送失败').length
    
    const successRate = totalSms > 0 ? (successCount / totalSms) * 100 : 0
    const failureRate = totalSms > 0 ? (failedCount / totalSms) * 100 : 0
    
    // 运营商统计
    const carrierMap = new Map<string, { count: number; success: number }>()
    allRecords.forEach(record => {
      const carrier = record.carrier || '未知运营商'
      if (!carrierMap.has(carrier)) {
        carrierMap.set(carrier, { count: 0, success: 0 })
      }
      const stats = carrierMap.get(carrier)!
      stats.count++
      if (record.status === '已送达') {
        stats.success++
      }
    })
    
    const carrierStats = Array.from(carrierMap.entries()).map(([carrier, stats]) => ({
      carrier,
      count: stats.count,
      successRate: stats.count > 0 ? (stats.success / stats.count) * 100 : 0
    })).sort((a, b) => b.count - a.count)
    
    // 模板统计
    const templateMap = new Map<string, { count: number; success: number }>()
    allRecords.forEach(record => {
      const template = record.template_name || '未知模板'
      if (!templateMap.has(template)) {
        templateMap.set(template, { count: 0, success: 0 })
      }
      const stats = templateMap.get(template)!
      stats.count++
      if (record.status === '已送达') {
        stats.success++
      }
    })
    
    const templateStats = Array.from(templateMap.entries()).map(([template, stats]) => ({
      template,
      count: stats.count,
      successRate: stats.count > 0 ? (stats.success / stats.count) * 100 : 0
    })).sort((a, b) => b.count - a.count)
    
    // 状态分布
    const statusMap = new Map<string, number>()
    allRecords.forEach(record => {
      const status = record.status
      statusMap.set(status, (statusMap.get(status) || 0) + 1)
    })
    
    const statusBreakdown = Array.from(statusMap.entries()).map(([status, count]) => ({
      status,
      count,
      percentage: totalSms > 0 ? (count / totalSms) * 100 : 0
    })).sort((a, b) => b.count - a.count)
    
    // 时段分析 (按小时统计)
    const hourlyMap = new Map<number, number>()
    for (let i = 0; i < 24; i++) {
      hourlyMap.set(i, 0)
    }
    
    allRecords.forEach(record => {
      if (record.created_at) {
        const date = new Date(record.created_at)
        const hour = date.getHours()
        hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1)
      }
    })
    
    const hourlyStats = Array.from(hourlyMap.entries()).map(([hour, count]) => ({
      hour,
      count
    })).sort((a, b) => a.hour - b.hour)
    
    // 日趋势分析
    const dailyMap = new Map<string, { sent: number; success: number; failed: number }>()
    allRecords.forEach(record => {
      if (record.created_at) {
        const date = new Date(record.created_at)
        const dateKey = date.toISOString().split('T')[0] // YYYY-MM-DD
        if (!dailyMap.has(dateKey)) {
          dailyMap.set(dateKey, { sent: 0, success: 0, failed: 0 })
        }
        const stats = dailyMap.get(dateKey)!
        stats.sent++
        if (record.status === '已送达') {
          stats.success++
        } else if (record.status === '发送失败') {
          stats.failed++
        }
      }
    })
    
    const dailyStats = Array.from(dailyMap.entries()).map(([date, stats]) => ({
      date,
      ...stats
    })).sort((a, b) => a.date.localeCompare(b.date))
    
    // 失败原因统计
    const failedRecords = allRecords.filter(r => r.status === '发送失败' && r.error_code)
    const errorCodeMap = new Map<string, number>()
    
    failedRecords.forEach(record => {
      const errorCode = record.error_code || 'UNKNOWN'
      errorCodeMap.set(errorCode, (errorCodeMap.get(errorCode) || 0) + 1)
    })
    
    const failureReasons = Array.from(errorCodeMap.entries()).map(([errorCode, count]) => ({
      errorCode,
      count,
      percentage: failedCount > 0 ? (count / failedCount) * 100 : 0
    })).sort((a, b) => b.count - a.count)
    
    // 按运营商统计失败原因
    const carrierFailureMap = new Map<string, Map<string, number>>()
    failedRecords.forEach(record => {
      const carrier = record.carrier || '未知运营商'
      const errorCode = record.error_code || 'UNKNOWN'
      
      if (!carrierFailureMap.has(carrier)) {
        carrierFailureMap.set(carrier, new Map())
      }
      const errorMap = carrierFailureMap.get(carrier)!
      errorMap.set(errorCode, (errorMap.get(errorCode) || 0) + 1)
    })
    
    const carrierFailureStats = Array.from(carrierFailureMap.entries()).map(([carrier, errorMap]) => {
      const failures = Array.from(errorMap.entries()).map(([errorCode, count]) => ({
        errorCode,
        count
      })).sort((a, b) => b.count - a.count)
      
      return {
        carrier,
        totalFailures: failures.reduce((sum, f) => sum + f.count, 0),
        failures
      }
    }).sort((a, b) => b.totalFailures - a.totalFailures)
    
    // 按模板统计失败原因
    const templateFailureMap = new Map<string, Map<string, number>>()
    failedRecords.forEach(record => {
      const template = record.template_name || '未知模板'
      const errorCode = record.error_code || 'UNKNOWN'
      
      if (!templateFailureMap.has(template)) {
        templateFailureMap.set(template, new Map())
      }
      const errorMap = templateFailureMap.get(template)!
      errorMap.set(errorCode, (errorMap.get(errorCode) || 0) + 1)
    })
    
    const templateFailureStats = Array.from(templateFailureMap.entries()).map(([template, errorMap]) => {
      const failures = Array.from(errorMap.entries()).map(([errorCode, count]) => ({
        errorCode,
        count
      })).sort((a, b) => b.count - a.count)
      
      return {
        template,
        totalFailures: failures.reduce((sum, f) => sum + f.count, 0),
        failures
      }
    }).sort((a, b) => b.totalFailures - a.totalFailures)
    
    const analyticsData = {
      totalSms,
      successRate,
      failureRate,
      carrierStats,
      templateStats,
      statusBreakdown,
      hourlyStats,
      dailyStats,
      failureReasons,
      carrierFailureStats,
      templateFailureStats
    }
    
    return NextResponse.json({
      success: true,
      data: analyticsData
    })
    
  } catch (error) {
    console.error('Failed to generate analytics:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: '生成分析数据失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}

function getDateFilter(range: string): 'today' | '2days' | 'week' | 'month' | undefined {
  switch (range) {
    case 'today':
      return 'today'
    case '2days':
      return '2days'
    case 'week':
      return 'week'
    case 'month':
      return 'month'
    default:
      return 'week'
  }
}