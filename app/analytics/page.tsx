"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { BarChart, TrendingUp, PieChart, Users, MessageSquare, Clock, Calendar, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { FailureAnalysis } from "@/components/analytics/failure-analysis"

interface AnalyticsData {
  totalSms: number
  successRate: number
  failureRate: number
  carrierStats: { carrier: string; count: number; successRate: number }[]
  templateStats: { template: string; count: number; successRate: number }[]
  dailyStats: { date: string; sent: number; success: number; failed: number }[]
  hourlyStats: { hour: number; count: number }[]
  statusBreakdown: { status: string; count: number; percentage: number }[]
  failureReasons: { errorCode: string; count: number; percentage: number }[]
  carrierFailureStats: { 
    carrier: string; 
    totalFailures: number; 
    failures: { errorCode: string; count: number }[] 
  }[]
  templateFailureStats: { 
    template: string; 
    totalFailures: number; 
    failures: { errorCode: string; count: number }[] 
  }[]
}

export default function AnalyticsPage() {
  const { toast } = useToast()
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState("week")

  useEffect(() => {
    loadAnalyticsData()
  }, [dateRange])

  const loadAnalyticsData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/analytics?range=${dateRange}`)
      if (response.ok) {
        const data = await response.json()
        setAnalyticsData(data.data)
      } else {
        throw new Error('Failed to load analytics')
      }
    } catch (error) {
      console.error('Failed to load analytics:', error)
      toast({
        title: "加载失败",
        description: "无法加载分析数据",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 90) return "text-green-600"
    if (rate >= 70) return "text-yellow-600"
    return "text-red-600"
  }

  const getSuccessRateVariant = (rate: number) => {
    if (rate >= 90) return "default"
    if (rate >= 70) return "secondary"
    return "destructive"
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">数据分析</h1>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!analyticsData) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">数据分析</h1>
            <Link href="/">
              <Button variant="outline">返回首页</Button>
            </Link>
          </div>
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-500">暂无分析数据</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">数据分析</h1>
          <div className="flex items-center gap-4">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">今日</SelectItem>
                <SelectItem value="2days">近2天</SelectItem>
                <SelectItem value="week">近一周</SelectItem>
                <SelectItem value="month">近一月</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={loadAnalyticsData} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新
            </Button>
            <Link href="/">
              <Button variant="outline">返回首页</Button>
            </Link>
          </div>
        </div>

        {/* 概览卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <MessageSquare className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">总发送量</p>
                  <p className="text-2xl font-bold">{analyticsData.totalSms.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className={`h-8 w-8 ${getSuccessRateColor(analyticsData.successRate)}`} />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">成功率</p>
                  <p className={`text-2xl font-bold ${getSuccessRateColor(analyticsData.successRate)}`}>
                    {analyticsData.successRate.toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">运营商数量</p>
                  <p className="text-2xl font-bold">{analyticsData.carrierStats.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">模板数量</p>
                  <p className="text-2xl font-bold">{analyticsData.templateStats.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 详细分析 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 状态分布 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <PieChart className="w-5 h-5 mr-2" />
                状态分布
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.statusBreakdown.map((status) => (
                  <div key={status.status} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{status.status}</span>
                      <span>{status.count} ({status.percentage.toFixed(1)}%)</span>
                    </div>
                    <Progress value={status.percentage} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 运营商统计 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart className="w-5 h-5 mr-2" />
                运营商统计
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.carrierStats.slice(0, 10).map((carrier) => (
                  <div key={carrier.carrier} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{carrier.carrier}</Badge>
                      <span className="text-sm text-gray-600">{carrier.count} 条</span>
                    </div>
                    <Badge variant={getSuccessRateVariant(carrier.successRate)}>
                      {carrier.successRate.toFixed(1)}%
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 模板统计 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="w-5 h-5 mr-2" />
                模板使用统计
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.templateStats.slice(0, 10).map((template) => (
                  <div key={template.template} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium truncate max-w-[200px]">{template.template}</span>
                      <span className="text-sm text-gray-600">{template.count} 次</span>
                    </div>
                    <Badge variant={getSuccessRateVariant(template.successRate)}>
                      {template.successRate.toFixed(1)}%
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 时段分析 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                时段分析
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analyticsData.hourlyStats.map((hour) => (
                  <div key={hour.hour} className="flex items-center gap-4">
                    <span className="text-sm font-medium w-16">
                      {hour.hour.toString().padStart(2, '0')}:00
                    </span>
                    <div className="flex-1">
                      <Progress 
                        value={(hour.count / Math.max(...analyticsData.hourlyStats.map(h => h.count))) * 100}
                        className="h-2"
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">
                      {hour.count}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 日趋势 */}
        {analyticsData.dailyStats.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                日发送趋势
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.dailyStats.map((day) => (
                  <div key={day.date} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{day.date}</span>
                      <div className="flex gap-4 text-sm">
                        <span className="text-blue-600">发送: {day.sent}</span>
                        <span className="text-green-600">成功: {day.success}</span>
                        <span className="text-red-600">失败: {day.failed}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-3 relative overflow-hidden">
                          {/* 成功部分 */}
                          <div 
                            className="bg-green-500 h-full absolute left-0"
                            style={{ width: `${day.sent > 0 ? (day.success / day.sent) * 100 : 0}%` }}
                          ></div>
                          {/* 失败部分 */}
                          <div 
                            className="bg-red-500 h-full absolute"
                            style={{ 
                              left: `${day.sent > 0 ? (day.success / day.sent) * 100 : 0}%`,
                              width: `${day.sent > 0 ? (day.failed / day.sent) * 100 : 0}%`
                            }}
                          ></div>
                          {/* 其他状态部分（发送中等） */}
                          {day.sent > (day.success + day.failed) && (
                            <div 
                              className="bg-yellow-400 h-full absolute"
                              style={{ 
                                left: `${day.sent > 0 ? ((day.success + day.failed) / day.sent) * 100 : 0}%`,
                                width: `${day.sent > 0 ? ((day.sent - day.success - day.failed) / day.sent) * 100 : 0}%`
                              }}
                            ></div>
                          )}
                        </div>
                        <span className="text-xs text-gray-600 w-20">
                          {day.sent > 0 ? ((day.success / day.sent) * 100).toFixed(1) : 0}% 成功
                        </span>
                      </div>
                      {/* 添加图例说明 */}
                      <div className="flex items-center gap-4 text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-2 bg-green-500 rounded"></div>
                          <span>成功 ({day.success})</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-2 bg-red-500 rounded"></div>
                          <span>失败 ({day.failed})</span>
                        </div>
                        {day.sent > (day.success + day.failed) && (
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-2 bg-yellow-400 rounded"></div>
                            <span>其他 ({day.sent - day.success - day.failed})</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 失败原因分析 */}
        <FailureAnalysis 
          failureReasons={analyticsData.failureReasons}
          carrierFailureStats={analyticsData.carrierFailureStats}
          templateFailureStats={analyticsData.templateFailureStats}
          totalFailures={analyticsData.statusBreakdown.find(s => s.status === '发送失败')?.count || 0}
        />
      </div>
    </div>
  )
}