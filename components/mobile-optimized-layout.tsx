"use client"

import React, { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface MobileOptimizedLayoutProps {
  children: ReactNode
  title?: string
  className?: string
}

export function MobileOptimizedLayout({ children, title, className = "" }: MobileOptimizedLayoutProps) {
  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 ${className}`}>
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {title && (
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{title}</h1>
            <div className="h-1 w-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded"></div>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

interface ResponsiveFilterBarProps {
  children: ReactNode
  className?: string
}

export function ResponsiveFilterBar({ children, className = "" }: ResponsiveFilterBarProps) {
  return (
    <Card className={`mb-6 ${className}`}>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {children}
        </div>
      </CardContent>
    </Card>
  )
}

interface TouchFriendlyButtonProps {
  children: ReactNode
  onClick?: () => void
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  disabled?: boolean
  className?: string
}

export function TouchFriendlyButton({ 
  children, 
  onClick, 
  variant = "default", 
  size = "default",
  disabled = false,
  className = ""
}: TouchFriendlyButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      disabled={disabled}
      className={`min-h-[44px] touch-manipulation active:scale-95 transition-transform ${className}`}
    >
      {children}
    </Button>
  )
}

interface MobileOptimizedInputProps {
  type?: string
  placeholder?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  className?: string
  inputMode?: "text" | "numeric" | "decimal" | "tel" | "search" | "email" | "url"
  pattern?: string
  maxLength?: number
  disabled?: boolean
}

export function MobileOptimizedInput({
  type = "text",
  placeholder,
  value,
  onChange,
  className = "",
  inputMode,
  pattern,
  maxLength,
  disabled = false
}: MobileOptimizedInputProps) {
  return (
    <Input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      inputMode={inputMode}
      pattern={pattern}
      maxLength={maxLength}
      disabled={disabled}
      className={`min-h-[44px] touch-manipulation text-base ${className}`}
    />
  )
}

interface ResponsiveGridProps {
  children: ReactNode
  cols?: {
    default?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
  }
  gap?: number
  className?: string
}

export function ResponsiveGrid({ 
  children, 
  cols = { default: 1, sm: 2, lg: 3 }, 
  gap = 4,
  className = ""
}: ResponsiveGridProps) {
  const gridCols = `grid-cols-${cols.default || 1} ${
    cols.sm ? `sm:grid-cols-${cols.sm}` : ''
  } ${
    cols.md ? `md:grid-cols-${cols.md}` : ''
  } ${
    cols.lg ? `lg:grid-cols-${cols.lg}` : ''
  } ${
    cols.xl ? `xl:grid-cols-${cols.xl}` : ''
  }`.trim()
  
  return (
    <div className={`grid ${gridCols} gap-${gap} ${className}`}>
      {children}
    </div>
  )
}

interface MobileCardProps {
  children: ReactNode
  className?: string
  hover?: boolean
}

export function MobileCard({ children, className = "", hover = true }: MobileCardProps) {
  return (
    <Card className={`${hover ? 'hover:shadow-lg transition-shadow duration-200' : ''} ${className}`}>
      <CardContent className="p-4 sm:p-6">
        {children}
      </CardContent>
    </Card>
  )
}