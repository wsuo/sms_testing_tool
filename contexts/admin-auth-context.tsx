"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'

interface AdminAuthContextType {
  isAdminAuthenticated: boolean
  authToken: string | null
  authExpiration: number | null
  isLoading: boolean
  sendVerificationCode: () => Promise<{ success: boolean; message?: string; sendTime?: string }>
  verifyCode: (code: string) => Promise<{ success: boolean; message?: string }>
  clearAuth: () => void
  isVerificationSent: boolean
  lastSendTime: string | null
  canResend: boolean
  resendCountdown: number
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined)

interface AdminAuthProviderProps {
  children: ReactNode
}

export function AdminAuthProvider({ children }: AdminAuthProviderProps) {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false)
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [authExpiration, setAuthExpiration] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isVerificationSent, setIsVerificationSent] = useState(false)
  const [lastSendTime, setLastSendTime] = useState<string | null>(null)
  const [canResend, setCanResend] = useState(true)
  const [resendCountdown, setResendCountdown] = useState(0)

  const router = useRouter()
  const pathname = usePathname()

  // 生成会话ID
  const getSessionId = useCallback(() => {
    let sessionId = sessionStorage.getItem('admin-session-id')
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      sessionStorage.setItem('admin-session-id', sessionId)
    }
    return sessionId
  }, [])

  // 清理认证状态
  const clearAuth = useCallback(() => {
    setIsAdminAuthenticated(false)
    setAuthToken(null)
    setAuthExpiration(null)
    setIsVerificationSent(false)
    setLastSendTime(null)
    setCanResend(true)
    setResendCountdown(0)
    sessionStorage.removeItem('admin-auth-token')
    sessionStorage.removeItem('admin-auth-expiration')
    sessionStorage.removeItem('admin-auth-page')
  }, [])

  // 检查认证状态
  const checkAuth = useCallback(async () => {
    try {
      const token = sessionStorage.getItem('admin-auth-token')
      const expiration = sessionStorage.getItem('admin-auth-expiration')
      const authPage = sessionStorage.getItem('admin-auth-page')

      if (!token || !expiration || !authPage) {
        setIsAdminAuthenticated(false)
        return
      }

      // 检查是否过期
      const exp = parseInt(expiration)
      if (Date.now() > exp) {
        clearAuth()
        return
      }

      // 检查是否在同一页面（页面切换后需要重新认证）
      if (authPage !== pathname) {
        clearAuth()
        return
      }

      // 验证token有效性
      const sessionId = getSessionId()
      const response = await fetch(`/api/auth/verify-code?token=${token}&sessionId=${sessionId}&pageUrl=${pathname}`)
      
      if (response.ok) {
        setIsAdminAuthenticated(true)
        setAuthToken(token)
        setAuthExpiration(exp)
      } else {
        clearAuth()
      }
    } catch (error) {
      console.error('检查管理员认证状态失败:', error)
      clearAuth()
    } finally {
      setIsLoading(false)
    }
  }, [pathname, getSessionId, clearAuth])

  // 发送验证码
  const sendVerificationCode = useCallback(async () => {
    if (!canResend) {
      return { success: false, message: '请稍后再试' }
    }

    try {
      const sessionId = getSessionId()
      const response = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          pageUrl: pathname,
          userAgent: navigator.userAgent
        })
      })

      const result = await response.json()

      if (result.success) {
        setIsVerificationSent(true)
        setLastSendTime(result.sendTime)
        setCanResend(false)
        setResendCountdown(60)

        // 开始倒计时
        const countdownInterval = setInterval(() => {
          setResendCountdown(prev => {
            if (prev <= 1) {
              setCanResend(true)
              clearInterval(countdownInterval)
              return 0
            }
            return prev - 1
          })
        }, 1000)

        return { success: true, message: result.message, sendTime: result.sendTime }
      } else {
        return { success: false, message: result.message }
      }
    } catch (error) {
      console.error('发送验证码失败:', error)
      return { success: false, message: '网络错误，请重试' }
    }
  }, [canResend, getSessionId, pathname])

  // 验证验证码
  const verifyCode = useCallback(async (code: string) => {
    try {
      const sessionId = getSessionId()
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          pageUrl: pathname,
          code: code.trim()
        })
      })

      const result = await response.json()

      if (result.success) {
        setIsAdminAuthenticated(true)
        setAuthToken(result.authToken)
        setAuthExpiration(result.expiresAt)
        setIsVerificationSent(false)
        
        // 保存到sessionStorage
        sessionStorage.setItem('admin-auth-token', result.authToken)
        sessionStorage.setItem('admin-auth-expiration', result.expiresAt.toString())
        sessionStorage.setItem('admin-auth-page', pathname)

        return { success: true, message: result.message }
      } else {
        return { success: false, message: result.message }
      }
    } catch (error) {
      console.error('验证码校验失败:', error)
      return { success: false, message: '网络错误，请重试' }
    }
  }, [getSessionId, pathname])

  // 监听页面变化，页面切换时清除认证
  useEffect(() => {
    const currentAuthPage = sessionStorage.getItem('admin-auth-page')
    if (currentAuthPage && currentAuthPage !== pathname) {
      clearAuth()
    }
  }, [pathname, clearAuth])

  // 监听页面关闭/刷新事件
  useEffect(() => {
    const handleBeforeUnload = () => {
      clearAuth()
    }

    // 移除visibilitychange监听，因为它会在切换标签页时误触发
    // 只保留页面刷新/关闭时的清理
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [clearAuth])

  // 初始化检查认证状态
  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  // 自动检查token过期
  useEffect(() => {
    if (authExpiration) {
      const checkInterval = setInterval(() => {
        if (Date.now() > authExpiration) {
          clearAuth()
        }
      }, 60000) // 每分钟检查一次

      return () => clearInterval(checkInterval)
    }
  }, [authExpiration, clearAuth])

  const contextValue: AdminAuthContextType = {
    isAdminAuthenticated,
    authToken,
    authExpiration,
    isLoading,
    sendVerificationCode,
    verifyCode,
    clearAuth,
    isVerificationSent,
    lastSendTime,
    canResend,
    resendCountdown
  }

  return (
    <AdminAuthContext.Provider value={contextValue}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext)
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider')
  }
  return context
}