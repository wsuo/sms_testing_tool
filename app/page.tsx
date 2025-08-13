"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { 
  MessageSquare, 
  Upload, 
  TrendingUp,
  Activity,
  Clock,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Kanban,
  Target,
  GraduationCap
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

interface DashboardStats {
  smsStats: {
    totalSent: number
    successRate: number
    pendingCount: number
  }
  projectStats: {
    totalProjects: number
    activeProjects: number
    totalItems: number
    completedItems: number
    completionRate: number
  }
  recentActivity: {
    type: string
    message: string
    timestamp: string
    status: 'success' | 'warning' | 'error'
  }[]
}

export default function PlatformDashboard() {
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    smsStats: {
      totalSent: 0,
      successRate: 0,
      pendingCount: 0
    },
    projectStats: {
      totalProjects: 0,
      activeProjects: 0,
      totalItems: 0,
      completedItems: 0,
      completionRate: 0
    },
    recentActivity: []
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      // Load SMS statistics from analytics API
      const smsResponse = await fetch('/api/analytics?range=week')
      if (smsResponse.ok) {
        const smsResult = await smsResponse.json()
        if (smsResult.success && smsResult.data) {
          const smsData = smsResult.data
          // Calculate pending count from status breakdown
          const pendingStatuses = smsData.statusBreakdown.filter((s: any) => 
            s.status === '发送中' || s.status === '发送中(已停止查询)'
          )
          const pendingCount = pendingStatuses.reduce((sum: number, s: any) => sum + s.count, 0)
          
          setDashboardStats(prev => ({
            ...prev,
            smsStats: {
              totalSent: smsData.totalSms || 0,
              successRate: smsData.successRate || 0,
              pendingCount: pendingCount
            }
          }))
        }
      }

      // Load project progress statistics
      const projectResponse = await fetch('/api/project-progress')
      if (projectResponse.ok) {
        const projectResult = await projectResponse.json()
        if (projectResult.success && projectResult.data) {
          const projectData = projectResult.data.totalStats
          
          setDashboardStats(prev => ({
            ...prev,
            projectStats: {
              totalProjects: projectData.totalProjects || 0,
              activeProjects: projectData.activeProjects || 0,
              totalItems: projectData.totalItems || 0,
              completedItems: projectData.completedItems || 0,
              completionRate: projectData.completionRate || 0
            }
          }))
        }
      }

      // Load recent SMS records for activity
      const recordsResponse = await fetch('/api/sms-records?limit=5&offset=0')
      if (recordsResponse.ok) {
        const recordsResult = await recordsResponse.json()
        if (recordsResult.success && recordsResult.data) {
          const recentRecords = recordsResult.data.slice(0, 3) // 取最近3条记录
          const recentActivity = recentRecords.map((record: any) => {
            let message = ''
            let type = 'SMS'
            let status: 'success' | 'warning' | 'error' = 'success'
            
            if (record.status === '已送达') {
              message = `短信成功发送至 ${record.phone_number}`
              status = 'success'
            } else if (record.status === '发送失败') {
              message = `短信发送失败至 ${record.phone_number}`
              status = 'error'
            } else {
              message = `短信发送中至 ${record.phone_number}`
              status = 'warning'
            }
            
            return {
              type,
              message,
              timestamp: record.created_at,
              status
            }
          })
          
          setDashboardStats(prev => ({
            ...prev,
            recentActivity
          }))
        }
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      // Fallback to empty data
      setDashboardStats(prev => ({
        ...prev,
        smsStats: {
          totalSent: 0,
          successRate: 0,
          pendingCount: 0
        },
        projectStats: {
          totalProjects: 0,
          activeProjects: 0,
          totalItems: 0,
          completedItems: 0,
          completionRate: 0
        },
        recentActivity: []
      }))
    } finally {
      setIsLoading(false)
    }
  }

  const testingTools = [
    {
      name: "短信管理",
      description: "企业短信发送和监控，支持实时状态跟踪、数据分析和批量管理",
      href: "/sms-testing",
      icon: MessageSquare,
      stats: `${dashboardStats.smsStats.totalSent} 条本周发送`,
      color: "bg-blue-500"
    },
    {
      name: "数据管理",
      description: "企业数据导入导出管理，支持Excel格式和数据验证预览",
      href: "/supplier-import",
      icon: Upload,
      stats: "支持导入导出",
      color: "bg-green-500"
    },
    {
      name: "项目管理",
      description: "项目进度跟踪和管理，支持功能点状态监控和团队协作",
      href: "/project-progress",
      icon: Kanban,
      stats: `${dashboardStats.projectStats.activeProjects} 个活跃项目`,
      color: "bg-purple-500"
    }
  ]

  const trainingTools = [
    {
      name: "培训考试",
      description: "员工在线培训考试系统，支持智能组卷和自动评分",
      href: "/training",
      icon: GraduationCap,
      stats: "员工入口 - 无需认证",
      color: "bg-orange-500"
    }
  ]

  const adminTools = [
    {
      name: "培训管理",
      description: "培训考试数据统计分析，支持详细答题报告和成绩管理",
      href: "/training/admin",
      icon: GraduationCap,
      stats: "管理员功能 - 需要认证",
      color: "bg-red-500"
    }
  ]

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">智慧管理平台</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          智能化管理与数据分析平台，提供短信管理、数据处理、培训考试和项目跟踪服务
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总短信发送量</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.smsStats.totalSent}</div>
            <p className="text-xs text-muted-foreground">本周</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">短信成功率</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.smsStats.successRate.toFixed(1)}%</div>
            <Progress value={dashboardStats.smsStats.successRate} className="mt-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">活跃项目</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.projectStats.activeProjects}</div>
            <p className="text-xs text-muted-foreground">总计 {dashboardStats.projectStats.totalProjects} 个项目</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">功能完成率</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.projectStats.completionRate}%</div>
            <Progress value={dashboardStats.projectStats.completionRate} className="mt-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">待处理消息</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.smsStats.pendingCount}</div>
            <p className="text-xs text-muted-foreground">等待状态更新</p>
          </CardContent>
        </Card>
      </div>

      {/* Testing Tools Grid */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">功能模块</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {testingTools.map((tool) => {
            const Icon = tool.icon
            return (
              <Card key={tool.name} className="hover:shadow-lg transition-shadow cursor-pointer">
                <Link href={tool.href}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${tool.color} text-white`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{tool.name}</CardTitle>
                          <CardDescription className="text-sm">{tool.stats}</CardDescription>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{tool.description}</p>
                  </CardContent>
                </Link>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">最近活动</h2>
        <Card>
          <CardContent className="p-6">
            {dashboardStats.recentActivity.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">暂无最近活动</p>
            ) : (
              <div className="space-y-4">
                {dashboardStats.recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                    <div className="flex-shrink-0">
                      {activity.status === 'success' && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                      {activity.status === 'warning' && (
                        <AlertCircle className="h-5 w-5 text-yellow-500" />
                      )}
                      {activity.status === 'error' && (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {activity.type}
                        </Badge>
                        <span className="text-sm font-medium">{activity.message}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
