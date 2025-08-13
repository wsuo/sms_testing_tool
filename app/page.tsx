"use client"

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { useAuth } from '@/contexts/auth-context'
import { ModernToolCard } from '@/components/modern-tool-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  MessageSquare, 
  Kanban, 
  GraduationCap,
  Database,
  TrendingUp,
  Users,
  LogOut,
  Sparkles
} from 'lucide-react'

interface DashboardStats {
  smsStats: {
    totalSent: number
    successRate: number
    pendingCount: number
  }
  projectStats: {
    activeProjects: number
    totalItems: number
    completedItems: number
    completionRate: number
  }
}

export default function ToolboxHomepage() {
  const { isAuthenticated, isLoading, logout } = useAuth()
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    smsStats: { totalSent: 0, successRate: 0, pendingCount: 0 },
    projectStats: { activeProjects: 0, totalItems: 0, completedItems: 0, completionRate: 0 }
  })
  const [statsLoading, setStatsLoading] = useState(true)

  // 加载统计数据
  useEffect(() => {
    const loadStats = async () => {
      try {
        // 并行加载所有统计数据
        const [smsResponse, projectResponse] = await Promise.allSettled([
          fetch('/api/sms-records').then(res => res.ok ? res.json() : null),
          fetch('/api/project-progress').then(res => res.ok ? res.json() : null)
        ])

        const smsData = smsResponse.status === 'fulfilled' ? smsResponse.value : null
        const projectData = projectResponse.status === 'fulfilled' ? projectResponse.value : null

        setDashboardStats({
          smsStats: smsData ? {
            totalSent: smsData.data?.records?.length || 0,
            successRate: 95,
            pendingCount: 0
          } : { totalSent: 0, successRate: 0, pendingCount: 0 },
          projectStats: projectData ? {
            activeProjects: projectData.data?.projects?.length || 0,
            totalItems: projectData.data?.stats?.totalItems || 0,
            completedItems: projectData.data?.stats?.completedItems || 0,
            completionRate: projectData.data?.stats?.completionRate || 0
          } : { activeProjects: 0, totalItems: 0, completedItems: 0, completionRate: 0 }
        })
      } catch (error) {
        console.error('加载统计数据失败:', error)
      } finally {
        setStatsLoading(false)
      }
    }

    loadStats()
  }, [])

  // 统一的工具集合 - 所有工具合并到一个数组
  const allTools = [
    {
      name: "短信管理",
      description: "企业短信发送和监控，支持实时状态跟踪、数据分析和批量管理",
      href: "/sms-testing",
      icon: MessageSquare,
      stats: statsLoading ? "加载中..." : `${dashboardStats.smsStats.totalSent} 条本周发送`,
      color: "bg-blue-500",
      requiresAuth: true,
      category: "通信管理",
      usageCount: dashboardStats.smsStats.totalSent,
      trend: 'up' as const,
      isNew: false
    },
    {
      name: "数据管理", 
      description: "企业数据导入导出管理，支持Excel格式处理和数据验证预览",
      href: "/supplier-import",
      icon: Database,
      stats: "支持导入导出",
      color: "bg-green-500", 
      requiresAuth: true,
      category: "数据处理",
      usageCount: 45,
      trend: 'stable' as const,
      isNew: false
    },
    {
      name: "项目管理",
      description: "项目进度跟踪和管理，支持功能点状态监控和团队协作",
      href: "/project-progress",
      icon: Kanban,
      stats: statsLoading ? "加载中..." : `${dashboardStats.projectStats.activeProjects} 个活跃项目`,
      color: "bg-purple-500",
      requiresAuth: true,
      category: "项目协作",
      usageCount: dashboardStats.projectStats.activeProjects * 10,
      trend: 'up' as const,
      isNew: false
    },
    {
      name: "培训考试",
      description: "员工在线培训考试系统，支持智能组卷和自动评分",
      href: "/training",
      icon: GraduationCap,
      stats: "员工入口 - 免费使用",
      color: "bg-orange-500",
      requiresAuth: false,
      category: "教育培训",
      usageCount: 28,
      trend: 'up' as const,
      isNew: false
    },
    {
      name: "培训管理",
      description: "培训考试数据统计分析，支持详细答题报告和成绩管理",
      href: "/training/admin",
      icon: Users,
      stats: "管理功能 - 需要认证",
      color: "bg-red-500",
      requiresAuth: true,
      category: "教育培训",
      usageCount: 12,
      trend: 'stable' as const,
      isNew: false
    },
    {
      name: "数据监控",
      description: "实时数据监控和分析，提供全面的业务洞察和性能指标",
      href: "/monitor",
      icon: TrendingUp,
      stats: "实时监控",
      color: "bg-indigo-500",
      requiresAuth: true,
      category: "数据分析",
      usageCount: 67,
      trend: 'up' as const,
      isNew: true
    }
  ]

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">正在加载智慧管理平台...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-100 to-gray-50 relative overflow-hidden">
      {/* 动态背景装饰 */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZGVmcz4KICAgIDxwYXR0ZXJuIGlkPSJhIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiPgogICAgICA8Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMSkiLz4KICAgIDwvcGF0dGVybj4KICA8L2RlZnM+CiAgPHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNhKSIvPgo8L3N2Zz4=')] opacity-30" />
      
      {/* 页面头部 */}
      <div className="bg-emerald-50/80 backdrop-blur-xl border-b border-emerald-200/50 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* 品牌标识 */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl overflow-hidden bg-white shadow-lg backdrop-blur-sm">
                <Image
                  src="/logo.png"
                  alt="长颈羚数字科技"
                  width={48}
                  height={48}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-600">智慧管理平台</h1>
                <p className="text-sm text-gray-500">长颈羚数字科技</p>
              </div>
            </div>

            {/* 用户状态 */}
            <div className="flex items-center gap-3">
              {isAuthenticated && (
                <>
                  <Badge variant="default" className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border-emerald-200">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    管理员已登录
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={logout}
                    className="flex items-center gap-2 border-gray-300 text-gray-600 hover:bg-gray-50"
                  >
                    <LogOut className="w-4 h-4" />
                    退出登录
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="container mx-auto px-4 py-12 space-y-16">
        {/* 欢迎区域 */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/70 backdrop-blur-sm rounded-full border border-gray-200">
            <Sparkles className="w-4 h-4 text-yellow-600" />
            <span className="text-sm font-medium text-gray-600">选择您需要的工具开始工作</span>
          </div>
          <h2 className="text-4xl font-bold text-gray-600">
            长颈羚数字化管理工具集
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            集成多种专业工具，助力企业数字化转型，提升工作效率
          </p>
        </div>

        {/* 工具集合 - 统一网格布局 */}
        <section className="space-y-8">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3">
              <h3 className="text-3xl font-bold text-gray-500">数字化管理工具</h3>
              <Badge variant="secondary" className="text-sm bg-gray-100 text-gray-600 border-gray-200">
                {allTools.length} 个工具
              </Badge>
            </div>
            <p className="text-gray-600 max-w-3xl mx-auto">
              每个工具都经过精心设计，专注解决特定的业务需求，让您的工作更加高效便捷
            </p>
          </div>
          
          {/* 统一的3列网格布局 */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {allTools.map((tool) => (
              <ModernToolCard key={tool.href} {...tool} />
            ))}
          </div>
        </section>

        {/* 底部信息 */}
        <footer className="text-center pt-8 space-y-4">
          <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
          <p className="text-sm text-gray-500">
            © 2025 长颈羚数字管理平台 - 企业级管理解决方案
          </p>
          <p className="text-xs text-gray-400">
            开发者：wsuo | 联系邮箱：wangsuoo@qq.com
          </p>
          <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
            <span>🔒 安全认证</span>
            <span>⚡ 高性能</span>
            <span>🎯 专业工具</span>
            <span>🚀 持续更新</span>
          </div>
        </footer>
      </div>
    </div>
  )
}