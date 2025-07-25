import { useState, useCallback } from "react"
import * as Sentry from "@sentry/nextjs"
import { useToast } from "@/hooks/use-toast"

export interface TokenState {
  adminToken: string
  refreshToken: string
  showAdminToken: boolean
  showRefreshToken: boolean
  show401Error: boolean
}

export interface TokenActions {
  setAdminToken: (token: string) => void
  setRefreshToken: (token: string) => void
  setShowAdminToken: (show: boolean) => void
  setShowRefreshToken: (show: boolean) => void
  setShow401Error: (show: boolean) => void
  saveTokens: () => void
  refreshAccessToken: () => Promise<{ success: boolean; newToken?: string }>
  callAdminApi: (url: string, options?: RequestInit, tokenOverride?: string) => Promise<Response>
  loadTokensFromStorage: () => void
}

export const useTokenManagement = (): TokenState & TokenActions => {
  const { toast } = useToast()
  
  // Token management states
  const [adminToken, setAdminToken] = useState("")
  const [refreshToken, setRefreshToken] = useState("")
  
  // Password visibility states
  const [showAdminToken, setShowAdminToken] = useState(false)
  const [showRefreshToken, setShowRefreshToken] = useState(false)
  
  // 401 error state
  const [show401Error, setShow401Error] = useState(false)

  // Refresh token utility function
  const refreshAccessToken = useCallback(async (): Promise<{ success: boolean; newToken?: string }> => {
    // 优先使用localStorage中的refreshToken，避免React state异步更新问题
    const currentRefreshToken = refreshToken || localStorage.getItem("sms-refresh-token")
    
    if (!currentRefreshToken) {
      return { success: false }
    }

    try {
      const refreshUrl = `/admin-api/system/auth/refresh-token?refreshToken=${currentRefreshToken}`
      
      const response = await fetch(refreshUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        
        if (data.code === 0 && data.data) {
          // Update tokens
          setAdminToken(data.data.accessToken)
          setRefreshToken(data.data.refreshToken)
          
          // Save to localStorage
          localStorage.setItem("sms-admin-token", data.data.accessToken)
          localStorage.setItem("sms-refresh-token", data.data.refreshToken)
          
          return { success: true, newToken: data.data.accessToken }
        }
      }
    } catch (error) {
      console.error("Token刷新异常:", error)
      Sentry.captureException(error, {
        tags: { operation: 'token_refresh' },
        extra: { refreshTokenExists: !!currentRefreshToken }
      })
    }
    
    return { success: false }
  }, [refreshToken])

  // Generic API call with automatic token refresh
  const callAdminApi = useCallback(async (url: string, options: RequestInit = {}, tokenOverride?: string) => {
    const makeRequest = async (token: string) => {
      const headers = {
        ...options.headers,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      }
      return await fetch(url, {
        ...options,
        headers,
      })
    }

    const tokenToUse = tokenOverride || adminToken
    
    // First attempt with current token
    let response = await makeRequest(tokenToUse)
    
    // Check if response body contains 401 error
    if (response.ok) {
      const responseClone = response.clone()
      try {
        const data = await responseClone.json()
        if (data.code === 401) {
          const refreshResult = await refreshAccessToken()
          if (refreshResult.success && refreshResult.newToken) {
            // 同步状态到React state
            setAdminToken(refreshResult.newToken)
            response = await makeRequest(refreshResult.newToken)
          }
        }
      } catch (e) {
        // If parsing fails, continue with original response
      }
    }

    // If HTTP 401, try to refresh and retry
    if (response.status === 401) {
      const refreshResult = await refreshAccessToken()
      if (refreshResult.success && refreshResult.newToken) {
        // 同步状态到React state
        setAdminToken(refreshResult.newToken)
        response = await makeRequest(refreshResult.newToken)
      }
    }

    return response
  }, [adminToken, refreshAccessToken])

  // Save tokens to localStorage and validate configuration
  const saveTokens = useCallback(() => {
    if (!adminToken.trim()) {
      toast({
        title: "错误",
        description: "请填写管理后台令牌",
        variant: "destructive",
      })
      return
    }

    localStorage.setItem("sms-admin-token", adminToken)
    if (refreshToken.trim()) {
      localStorage.setItem("sms-refresh-token", refreshToken)
    }
    
    setShow401Error(false)

    toast({
      title: "成功",
      description: "令牌配置已保存",
    })
  }, [adminToken, refreshToken, toast])

  // Load tokens from localStorage
  const loadTokensFromStorage = useCallback(() => {
    const savedAdminToken = localStorage.getItem("sms-admin-token")
    const savedRefreshToken = localStorage.getItem("sms-refresh-token")

    if (savedAdminToken) {
      setAdminToken(savedAdminToken)
    }
    if (savedRefreshToken) {
      setRefreshToken(savedRefreshToken)
    }
  }, [])

  return {
    // State
    adminToken,
    refreshToken,
    showAdminToken,
    showRefreshToken,
    show401Error,
    
    // Actions
    setAdminToken,
    setRefreshToken,
    setShowAdminToken,
    setShowRefreshToken,
    setShow401Error,
    saveTokens,
    refreshAccessToken,
    callAdminApi,
    loadTokensFromStorage,
  }
}