"use client"

import React, { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { AuthDialog } from '@/components/auth-dialog'
import { Badge } from '@/components/ui/badge'
import { LucideIcon, Lock, Unlock, ArrowRight, Zap, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModernToolCardProps {
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
  usageCount?: number
  trend?: 'up' | 'down' | 'stable'
}

export function ModernToolCard({
  name,
  description,
  href,
  icon: Icon,
  stats,
  color,
  requiresAuth = false,
  category,
  isNew = false,
  isComingSoon = false,
  usageCount = 0,
  trend = 'stable'
}: ModernToolCardProps) {
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const { isAuthenticated } = useAuth()
  const router = useRouter()

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    
    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    
    const rotateX = ((y - centerY) / centerY) * -10
    const rotateY = ((x - centerX) / centerX) * 10
    
    setMousePosition({ x: rotateX, y: rotateY })
  }

  const handleMouseEnter = () => {
    setIsHovered(true)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    setMousePosition({ x: 0, y: 0 })
  }

  const handleClick = () => {
    if (isComingSoon) return
    
    if (requiresAuth && !isAuthenticated) {
      setShowAuthDialog(true)
    } else {
      router.push(href)
    }
  }

  const handleAuthSuccess = () => {
    router.push(href)
  }

  // 根据工具类型获取渐变色 - 使用绿色系
  const getGradientColors = (color: string) => {
    const colorMap: { [key: string]: { from: string; to: string; shadow: string } } = {
      'bg-blue-500': { from: 'from-green-400', to: 'to-emerald-400', shadow: 'shadow-green-500/25' },
      'bg-green-500': { from: 'from-green-400', to: 'to-emerald-400', shadow: 'shadow-green-500/25' },
      'bg-purple-500': { from: 'from-green-400', to: 'to-teal-400', shadow: 'shadow-green-500/25' },
      'bg-orange-500': { from: 'from-yellow-400', to: 'to-green-400', shadow: 'shadow-green-500/25' },
      'bg-red-500': { from: 'from-pink-400', to: 'to-green-400', shadow: 'shadow-green-500/25' },
      'bg-indigo-500': { from: 'from-blue-400', to: 'to-green-400', shadow: 'shadow-green-500/25' }
    }
    return colorMap[color] || colorMap['bg-green-500']
  }

  const gradientColors = getGradientColors(color)

  return (
    <>
      <div
        ref={cardRef}
        className={cn(
          "group relative w-full h-80 cursor-pointer transform-gpu transition-all duration-500 ease-out",
          "perspective-1000",
          isComingSoon && "cursor-not-allowed opacity-70"
        )}
        style={{
          transform: isHovered 
            ? `rotateX(${mousePosition.x}deg) rotateY(${mousePosition.y}deg) translateZ(20px)` 
            : 'rotateX(0deg) rotateY(0deg) translateZ(0px)'
        }}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        {/* 主卡片容器 - 玻璃态效果 */}
        <div className={cn(
          "relative w-full h-full rounded-2xl overflow-hidden",
          "backdrop-blur-xl bg-white/75 border border-emerald-200/40",
          "shadow-lg transition-all duration-500",
          isHovered && `shadow-xl ${gradientColors.shadow}`
        )}>
          
          {/* 淡绿色蒙版层 - 营造泛着背景色的效果 */}
          <div className="absolute inset-0 bg-emerald-50/20" />
          
          {/* 动态渐变背景 */}
          <div className={cn(
            "absolute inset-0 opacity-0 transition-opacity duration-500",
            `bg-gradient-to-br ${gradientColors.from} ${gradientColors.to}`,
            isHovered && "opacity-10"
          )} />
          
          {/* 流动边框动画 */}
          <div className={cn(
            "absolute inset-0 rounded-2xl transition-all duration-500",
            "bg-gradient-to-r from-transparent via-white/30 to-transparent",
            "opacity-0 group-hover:opacity-100"
          )} style={{
            background: isHovered 
              ? `linear-gradient(45deg, transparent, ${color.replace('bg-', 'rgb(var(--')}), transparent)`
              : undefined
          }} />

          {/* 内容区域 */}
          <div className="relative p-6 h-full flex flex-col">
            
            {/* 顶部区域 - 图标和状态 */}
            <div className="flex items-start justify-between mb-6">
              {/* 图标容器 - 3D浮动效果 */}
              <div className={cn(
                "relative w-16 h-16 rounded-2xl flex items-center justify-center",
                "transition-all duration-500 transform-gpu",
                `bg-gradient-to-br ${gradientColors.from} ${gradientColors.to}`,
                "shadow-lg group-hover:shadow-2xl group-hover:scale-110 group-hover:-translate-y-2"
              )}>
                <Icon className="w-8 h-8 text-white drop-shadow-lg" />
                
                {/* 图标光晕效果 */}
                <div className={cn(
                  "absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500",
                  `bg-gradient-to-br ${gradientColors.from} ${gradientColors.to}`,
                  "blur-xl group-hover:opacity-50"
                )} />
              </div>

              {/* 状态标识区域 */}
              <div className="flex flex-col items-end gap-2">
                {/* 认证状态 */}
                <Badge 
                  variant={requiresAuth ? (isAuthenticated ? "default" : "secondary") : "outline"} 
                  className="text-xs backdrop-blur-sm bg-white/70 border-emerald-200 text-gray-600"
                >
                  {requiresAuth ? (
                    isAuthenticated ? (
                      <><Unlock className="w-3 h-3 mr-1" />已认证</>
                    ) : (
                      <><Lock className="w-3 h-3 mr-1" />需认证</>
                    )
                  ) : (
                    <><Unlock className="w-3 h-3 mr-1" />免费</>
                  )}
                </Badge>

                {/* 新功能标识 */}
                {isNew && (
                  <Badge variant="destructive" className="text-xs">
                    <Zap className="w-3 h-3 mr-1" />新功能
                  </Badge>
                )}

                {/* 即将推出 */}
                {isComingSoon && (
                  <Badge variant="outline" className="text-xs">
                    即将推出
                  </Badge>
                )}
              </div>
            </div>

            {/* 工具信息区域 */}
            <div className="flex-1 space-y-4">
              {/* 标题和分类 */}
              <div>
                <h3 className="text-xl font-bold text-gray-600 group-hover:text-gray-700 transition-all duration-300">
                  {name}
                </h3>
                {category && (
                  <p className="text-xs text-gray-500 font-medium mt-1">
                    {category}
                  </p>
                )}
              </div>
              
              {/* 描述 */}
              <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
                {description}
              </p>
            </div>

            {/* 底部统计区域 */}
            <div className="mt-auto space-y-3">
              {/* 使用统计 */}
              {(stats || usageCount > 0) && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-gray-500 font-medium">
                      {stats || `${usageCount} 次使用`}
                    </div>
                    {trend !== 'stable' && (
                      <TrendingUp className={cn(
                        "w-3 h-3",
                        trend === 'up' ? "text-emerald-500 rotate-0" : "text-red-500 rotate-180"
                      )} />
                    )}
                  </div>
                  
                  {/* 进入箭头 */}
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all duration-300" />
                </div>
              )}

              {/* 进度条（可选） */}
              {usageCount > 0 && (
                <div className="w-full h-1 bg-emerald-100 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full transition-all duration-1000",
                      `bg-gradient-to-r ${gradientColors.from} ${gradientColors.to}`
                    )}
                    style={{ width: `${Math.min((usageCount / 100) * 100, 100)}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* 移除底部发光条 */}
        </div>

        {/* 外部光晕效果 */}
        <div className={cn(
          "absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 pointer-events-none",
          `shadow-2xl ${gradientColors.shadow}`,
          "group-hover:opacity-60 blur-xl"
        )} />
      </div>

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