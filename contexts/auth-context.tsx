"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  login: (password: string) => Promise<{ success: boolean; message?: string }>
  logout: () => void
  checkAuth: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // 检查认证状态
  const checkAuth = () => {
    try {
      // 检查cookie中的认证token
      const authToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('platform-auth='))
        ?.split('=')[1]

      // 检查localStorage中的认证状态
      const localAuth = localStorage.getItem('platform-authenticated')
      
      setIsAuthenticated(!!(authToken && localAuth === 'true'))
    } catch (error) {
      console.error('检查认证状态失败:', error)
      setIsAuthenticated(false)
    } finally {
      setIsLoading(false)
    }
  }

  // 登录
  const login = async (password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password })
      })

      const result = await response.json()

      if (result.success) {
        // 设置认证状态
        setIsAuthenticated(true)
        localStorage.setItem('platform-authenticated', 'true')
        
        return { success: true }
      } else {
        return { success: false, message: result.message || '认证失败' }
      }
    } catch (error) {
      console.error('登录失败:', error)
      return { success: false, message: '网络连接失败，请重试' }
    }
  }

  // 登出
  const logout = () => {
    // 清除cookie
    document.cookie = 'platform-auth=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
    
    // 清除localStorage
    localStorage.removeItem('platform-authenticated')
    
    // 更新状态
    setIsAuthenticated(false)
  }

  // 组件挂载时检查认证状态
  useEffect(() => {
    checkAuth()
  }, [])

  const contextValue: AuthContextType = {
    isAuthenticated,
    isLoading,
    login,
    logout,
    checkAuth
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

// 自定义Hook
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}