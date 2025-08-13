import React from 'react'

interface PlatformFooterProps {
  className?: string
}

export function PlatformFooter({ className = "" }: PlatformFooterProps) {
  return (
    <div className={`text-center text-sm text-muted-foreground ${className}`}>
      <p>© 2025 长颈羚数字管理平台 - 企业级管理解决方案</p>
    </div>
  )
}