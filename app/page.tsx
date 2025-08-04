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
  AlertCircle
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
    recentActivity: []
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      // Load SMS statistics
      const smsResponse = await fetch('/api/analytics?range=week')
      if (smsResponse.ok) {
        const smsData = await smsResponse.json()
        setDashboardStats(prev => ({
          ...prev,
          smsStats: {
            totalSent: smsData.totalSms || 0,
            successRate: smsData.successRate || 0,
            pendingCount: smsData.pendingCount || 0
          }
        }))
      }

      // Mock recent activity data
      setDashboardStats(prev => ({
        ...prev,
        recentActivity: [
          {
            type: 'SMS',
            message: 'Bulk SMS sent to 50 recipients',
            timestamp: new Date().toISOString(),
            status: 'success'
          },
          {
            type: 'Import',
            message: 'Company data imported successfully',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            status: 'success'
          }
        ]
      }))
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const testingTools = [
    {
      name: "短信测试",
      description: "发送和监控短信消息，支持实时状态跟踪、数据分析和自动化测试",
      href: "/sms-testing",
      icon: MessageSquare,
      stats: `${dashboardStats.smsStats.totalSent} 条本周发送`,
      color: "bg-blue-500"
    },
    {
      name: "数据管理",
      description: "导入和导出公司数据，支持Excel格式和数据验证预览",
      href: "/supplier-import",
      icon: Upload,
      stats: "支持导入导出",
      color: "bg-green-500"
    }
  ]

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => (
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
        <h1 className="text-4xl font-bold tracking-tight">Testing Platform Dashboard</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Comprehensive testing tools for SMS, data management, and automated workflows
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total SMS Sent</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.smsStats.totalSent}</div>
            <p className="text-xs text-muted-foreground">This week</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.smsStats.successRate.toFixed(1)}%</div>
            <Progress value={dashboardStats.smsStats.successRate} className="mt-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Messages</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.smsStats.pendingCount}</div>
            <p className="text-xs text-muted-foreground">Awaiting status</p>
          </CardContent>
        </Card>
      </div>

      {/* Testing Tools Grid */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Testing Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        <h2 className="text-2xl font-semibold">Recent Activity</h2>
        <Card>
          <CardContent className="p-6">
            {dashboardStats.recentActivity.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No recent activity</p>
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
