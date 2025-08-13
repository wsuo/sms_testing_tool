"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { AuthDialog } from '@/components/auth-dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LucideIcon, Lock, Unlock, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ToolCardProps {
  name: string
  description: string
  href: string
  icon: LucideIcon
  stats?: string
  color: string
  requiresAuth?: boolean
  category?: string
  isNew?: boolean
  isComingSoon?: boolean
}

export function ToolCard({
  name,
  description,
  href,
  icon: Icon,
  stats,
  color,
  requiresAuth = false,
  category,
  isNew = false,
  isComingSoon = false
}: ToolCardProps) {
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const { isAuthenticated } = useAuth()
  const router = useRouter()

  const handleClick = () => {
    if (isComingSoon) {
      return
    }

    if (requiresAuth && !isAuthenticated) {
      setShowAuthDialog(true)
    } else {
      router.push(href)
    }
  }

  const handleAuthSuccess = () => {
    router.push(href)
  }

  return (
    <>
      <Card 
        className={cn(
          "group relative overflow-hidden cursor-pointer transition-all duration-300",
          "border-2 border-border/50 bg-card",
          "hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-2 hover:border-primary/30",
          isComingSoon ? "opacity-60 cursor-not-allowed" : "",
          "transform-gpu" // 启用GPU加速
        )}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* 背景渐变效果 */}
        <div className="absolute inset-0 bg-gradient-to-br from-background/80 to-primary/5 opacity-0 group-hover:opacity-100 transition-all duration-300" />

        {/* 顶部装饰条 */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <CardContent className="relative p-6 space-y-5">
          {/* 头部：图标和状态 */}
          <div className="flex items-start justify-between">
            {/* 图标容器 */}
            <div className={cn(
              "flex items-center justify-center w-16 h-16 rounded-2xl transition-all duration-300",
              color,
              "shadow-lg group-hover:shadow-2xl group-hover:scale-105"
            )}>
              <Icon className="w-8 h-8 text-white" />
            </div>
            
            {/* 状态标识区域 */}
            <div className="flex flex-col items-end gap-2">
              {/* 认证状态 */}
              <div className="flex items-center">
                {requiresAuth ? (
                  <Badge 
                    variant={isAuthenticated ? "default" : "secondary"} 
                    className="text-xs flex items-center gap-1"
                  >
                    {isAuthenticated ? (
                      <>
                        <Unlock className="w-3 h-3" />
                        已认证
                      </>
                    ) : (
                      <>
                        <Lock className="w-3 h-3" />
                        需要认证
                      </>
                    )}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                    <Unlock className="w-3 h-3" />
                    免费使用
                  </Badge>
                )}
              </div>

              {/* 新功能标识 */}
              {isNew && (
                <Badge variant="destructive" className="text-xs">
                  新功能
                </Badge>
              )}

              {/* 即将推出标识 */}
              {isComingSoon && (
                <Badge variant="outline" className="text-xs">
                  即将推出
                </Badge>
              )}
            </div>
          </div>

          {/* 工具信息 */}
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors duration-300">
                {name}
              </h3>
              {category && (
                <p className="text-xs text-muted-foreground font-medium mt-1">
                  {category}
                </p>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground leading-relaxed min-h-[2.5rem]">
              {description}
            </p>

            {/* 统计信息 */}
            {stats && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-muted-foreground font-medium">
                  {stats}
                </p>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
              </div>
            )}
          </div>
        </CardContent>

        {/* 底部装饰条 */}
        <div className={cn(
          "absolute bottom-0 left-0 right-0 h-1 transition-all duration-300",
          color,
          "opacity-0 group-hover:opacity-100"
        )} />
      </Card>

      {/* 认证对话框 */}
      <AuthDialog
        isOpen={showAuthDialog}
        onClose={() => setShowAuthDialog(false)}
        onSuccess={handleAuthSuccess}
        title={`访问 ${name}`}
        description={`${name} 需要管理员权限，请输入密码以继续`}
      />
    </>
  )
}