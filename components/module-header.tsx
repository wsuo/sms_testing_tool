"use client"

import React from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Home, 
  Settings, 
  LogOut, 
  Lock, 
  Unlock,
  ArrowLeft,
  LucideIcon 
} from 'lucide-react'

interface ModuleHeaderProps {
  title: string
  description?: string
  icon?: LucideIcon
  showBackButton?: boolean
  showAuthStatus?: boolean
  className?: string
}

export function ModuleHeader({
  title,
  description,
  icon: Icon,
  showBackButton = true,
  showAuthStatus = true,
  className = ""
}: ModuleHeaderProps) {
  const router = useRouter()
  const { isAuthenticated, logout } = useAuth()

  const handleBackHome = () => {
    router.push('/')
  }

  const handleGoBack = () => {
    router.back()
  }

  return (
    <div className={`bg-white/90 backdrop-blur-sm border-b fixed top-0 left-0 right-0 z-40 ${className}`}>
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* 左侧：导航和标题 */}
          <div className="flex items-center gap-4">
            {/* 导航按钮 */}
            <div className="flex items-center gap-2">
              {showBackButton && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGoBack}
                    className="flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    返回
                  </Button>
                  <div className="w-px h-6 bg-border" />
                </>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackHome}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">工具箱</span>
              </Button>
            </div>

            <Separator orientation="vertical" className="h-8" />

            {/* 模块信息 */}
            <div className="flex items-center gap-3">
              {Icon && (
                <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-lg">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold text-foreground">{title}</h1>
                {description && (
                  <p className="text-sm text-muted-foreground">{description}</p>
                )}
              </div>
            </div>
          </div>

          {/* 右侧：用户状态和操作 */}
          {showAuthStatus && (
            <div className="flex items-center gap-3">
              {/* 认证状态 */}
              <Badge 
                variant={isAuthenticated ? "default" : "secondary"}
                className="flex items-center gap-2"
              >
                {isAuthenticated ? (
                  <>
                    <Unlock className="w-3 h-3" />
                    <span className="hidden sm:inline">管理员模式</span>
                    <span className="sm:hidden">已认证</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3 h-3" />
                    <span className="hidden sm:inline">游客模式</span>
                    <span className="sm:hidden">游客</span>
                  </>
                )}
              </Badge>

              {/* 登出按钮 */}
              {isAuthenticated && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={logout}
                  className="flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">退出</span>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}