"use client"

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { useAuth } from '@/contexts/auth-context'
import { ModernToolCard } from '@/components/modern-tool-card'
import { PlatformFooter } from '@/components/platform-footer'
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
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center relative overflow-hidden">
        {/* 动态背景装饰 */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-200/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-teal-200/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-200/20 rounded-full blur-3xl animate-pulse delay-500"></div>
        </div>
        
        {/* 主要内容 */}
        <div className="relative z-10 text-center space-y-8">
          {/* Logo区域 */}
          <div className="space-y-4">
            <div className="relative mx-auto w-16 h-16 sm:w-20 sm:h-20">
              {/* 外圈旋转动画 */}
              <div className="absolute inset-0 border-4 border-emerald-200 rounded-full animate-spin"></div>
              <div className="absolute inset-2 border-4 border-teal-300 rounded-full animate-spin animate-reverse"></div>
              <div className="absolute inset-4 border-4 border-cyan-400 rounded-full animate-pulse"></div>
              {/* 中心图标 */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full shadow-lg animate-bounce delay-300"></div>
              </div>
            </div>
            
            {/* 品牌标题 */}
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent animate-pulse">
                AgriTech Solutions
              </h1>
              <p className="text-base sm:text-lg text-gray-600 font-medium px-4">
                农业科技智慧管理平台
              </p>
            </div>
          </div>
          
          {/* 加载状态文字 */}
          <div className="space-y-3">
            <p className="text-emerald-700 text-lg font-medium animate-pulse">
              正在初始化系统...
            </p>
            
            {/* 进度指示器 */}
            <div className="w-64 mx-auto">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full animate-pulse-slow relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                </div>
              </div>
            </div>
            
            {/* 功能模块提示 */}
            <div className="grid grid-cols-2 gap-4 mt-8 text-sm text-gray-500 max-w-sm mx-auto">
              <div className="flex items-center space-x-2 animate-fadeIn">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-ping"></div>
                <span>短信测试</span>
              </div>
              <div className="flex items-center space-x-2 animate-fadeIn delay-200">
                <div className="w-2 h-2 bg-teal-400 rounded-full animate-ping delay-100"></div>
                <span>数据监控</span>
              </div>
              <div className="flex items-center space-x-2 animate-fadeIn delay-400">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-ping delay-200"></div>
                <span>项目管理</span>
              </div>
              <div className="flex items-center space-x-2 animate-fadeIn delay-600">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping delay-300"></div>
                <span>数据分析</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-50/70 to-gray-50 relative overflow-hidden">
      {/* 动态背景装饰 */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZGVmcz4KICAgIDxwYXR0ZXJuIGlkPSJhIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiPgogICAgICA8Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMSkiLz4KICAgIDwvcGF0dGVybj4KICA8L2RlZnM+CiAgPHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNhKSIvPgo8L3N2Zz4=')] opacity-30 pointer-events-none" />
      
      {/* 页面头部 */}
      <div className="bg-emerald-50/40 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* 品牌标识 */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl overflow-hidden bg-white shadow-lg backdrop-blur-sm">
                <Image
                  src="/logo.png"
                  alt="长颈羚数字科技"
                  width={48}
                  height={48}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-gray-600">智慧管理平台</h1>
                <p className="text-xs sm:text-sm text-gray-500">长颈羚数字科技</p>
              </div>
            </div>

            {/* 用户状态 */}
            <div className="flex items-center gap-2 sm:gap-3">
              {isAuthenticated && (
                <>
                  <Badge variant="default" className="hidden sm:flex items-center gap-2 bg-gray-100 text-gray-700 border-gray-200">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    管理员已登录
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={logout}
                    className="flex items-center gap-1 sm:gap-2 border-gray-300 text-gray-600 hover:bg-gray-50 min-h-[44px] touch-manipulation"
                  >
                    <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">退出登录</span>
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
          
          {/* 统一的移动端响应式网格布局 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {allTools.map((tool) => (
              <ModernToolCard key={tool.href} {...tool} />
            ))}
          </div>
        </section>

        {/* 底部信息 */}
        <footer className="text-center pt-8 space-y-4">
          <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
          <PlatformFooter className="text-sm text-gray-500" />
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