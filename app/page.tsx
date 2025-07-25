"use client"

import React, { useState, useEffect, useCallback } from "react"
import * as Sentry from "@sentry/nextjs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { RefreshCw, Send, Settings, Phone, MessageSquare, Clock, Eye, EyeOff, RotateCcw, BarChart, Timer } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import PhoneNumberManagerModal from "@/components/phone-number-manager-modal"
import BulkSendModal from "@/components/bulk-send-modal"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import Link from "next/link"
import smsMonitorService, { SmsStatusUpdate } from "@/lib/sms-monitor-service"

interface SmsTemplate {
  id: string
  name: string
  content: string
  params: string[]
  code: string
}

interface SmsStatus {
  outId: string
  status: string
  errorCode?: string
  receiveDate?: string
  sendDate?: string
  phoneNumber: string
}

export default function SmsTestingTool() {
  const { toast } = useToast()

  // Token management
  const [adminToken, setAdminToken] = useState("")
  const [refreshToken, setRefreshToken] = useState("")
  
  // Password visibility states
  const [showAdminToken, setShowAdminToken] = useState(false)
  const [showRefreshToken, setShowRefreshToken] = useState(false)

  // SMS template management
  const [templates, setTemplates] = useState<SmsTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<SmsTemplate | null>(null)
  const [templateParams, setTemplateParams] = useState<Record<string, string>>({})

  // Phone number and sending
  const [phoneNumber, setPhoneNumber] = useState("")
  const [isSending, setIsSending] = useState(false)
  
  // Carrier selection states
  const [selectedCarrier, setSelectedCarrier] = useState("")
  const [availableCarriers, setAvailableCarriers] = useState<string[]>([])
  
  // Phone number search and pagination states
  const [phoneSearchTerm, setPhoneSearchTerm] = useState("")
  const [phoneNumbers, setPhoneNumbers] = useState<any[]>([])
  const [phoneNumbersLoading, setPhoneNumbersLoading] = useState(false)
  const [phonePagination, setPhonePagination] = useState({
    total: 0,
    totalPages: 0,
    currentPage: 1,
    pageSize: 20,
    hasNext: false,
    hasPrev: false
  })

  // Phone number input suggestion states
  const [inputSuggestions, setInputSuggestions] = useState<any[]>([])
  const [showInputSuggestions, setShowInputSuggestions] = useState(false)
  const [activeInputSuggestionIndex, setActiveInputSuggestionIndex] = useState(-1)
  const [isLoadingInputSuggestions, setIsLoadingInputSuggestions] = useState(false)

  // Status monitoring
  const [smsStatuses, setSmsStatuses] = useState<SmsStatus[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Resend functionality
  const [resendingOutIds, setResendingOutIds] = useState<Set<string>>(new Set())

  // Configuration modal
  const [showConfigModal, setShowConfigModal] = useState(false)
  
  // Bulk send modal
  const [showBulkSendModal, setShowBulkSendModal] = useState(false)
  
  // 401 error state
  const [show401Error, setShow401Error] = useState(false)
  // Loading states for better UX
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true)
  const [isLoadingCarriers, setIsLoadingCarriers] = useState(true)
  const [isLoadingSmsHistory, setIsLoadingSmsHistory] = useState(true)
  const [isInitialLoad, setIsInitialLoad] = useState(true) // 标记是否为初始加载
  
  // 计算整体加载状态
  const isPageLoading = isInitialLoad && (isLoadingTemplates || isLoadingCarriers || isLoadingSmsHistory)

  // Refresh token utility function
  const refreshAccessToken = async (): Promise<{ success: boolean; newToken?: string }> => {
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
  }

  // Generic API call with automatic token refresh
  const callAdminApi = async (url: string, options: RequestInit = {}, tokenOverride?: string) => {
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
  }

  // Load SMS history from database
  const loadSmsHistory = async () => {
    try {
      setIsLoadingSmsHistory(true)
      const response = await fetch('/api/sms-records?limit=5')
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          // Convert database records to SmsStatus format
          const historyStatuses: SmsStatus[] = result.data.map((record: any) => ({
            outId: record.out_id,
            status: record.status,
            errorCode: record.error_code,
            receiveDate: record.receive_date,
            sendDate: record.send_date || record.created_at,
            phoneNumber: record.phone_number,
          }))
          
          setSmsStatuses(historyStatuses)
        }
      }
    } catch (error) {
      console.error('Failed to load SMS history:', error)
      Sentry.captureException(error, {
        tags: { operation: 'load_sms_history' }
      })
    } finally {
      setIsLoadingSmsHistory(false)
    }
  }

  // Load carriers
  const loadCarriers = async () => {
    try {
      setIsLoadingCarriers(true)
      const response = await fetch('/api/phone-numbers/carriers')
      if (response.ok) {
        const data = await response.json()
        setAvailableCarriers(data.data || [])
      }
    } catch (error) {
      console.error("Failed to load carriers:", error)
    } finally {
      setIsLoadingCarriers(false)
    }
  }

  // Search phone numbers with server-side search and pagination
  const searchPhoneNumbers = async (searchTerm: string = '', carrier: string = '', page: number = 1) => {
    try {
      setPhoneNumbersLoading(true)
      const offset = (page - 1) * 20
      
      const params = new URLSearchParams({
        limit: '20',
        offset: offset.toString()
      })
      
      if (searchTerm.trim()) {
        params.append('q', searchTerm.trim())
      }
      
      if (carrier && carrier !== 'all') {
        params.append('carrier', carrier)
      }
      
      const response = await fetch(`/api/phone-numbers/search?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setPhoneNumbers(data.data || [])
        setPhonePagination(data.pagination || {
          total: 0,
          totalPages: 0,
          currentPage: 1,
          pageSize: 20,
          hasNext: false,
          hasPrev: false
        })
      }
    } catch (error) {
      console.error("Failed to search phone numbers:", error)
      setPhoneNumbers([])
    } finally {
      setPhoneNumbersLoading(false)
    }
  }

  // Handle carrier selection and trigger phone number search
  const handleCarrierSelect = (carrier: string) => {
    setSelectedCarrier(carrier)
    setPhoneNumber("") // Clear selected phone number when carrier changes
    searchPhoneNumbers(phoneSearchTerm, carrier, 1) // Reset to first page
  }

  // Handle phone search
  const handlePhoneSearch = (searchTerm: string) => {
    setPhoneSearchTerm(searchTerm)
    setPhoneNumber("") // Clear selected phone number when search changes
    searchPhoneNumbers(searchTerm, selectedCarrier, 1) // Reset to first page
  }

  // Handle pagination
  const handlePageChange = (page: number) => {
    searchPhoneNumbers(phoneSearchTerm, selectedCarrier, page)
  }

  // 保存用户状态到localStorage
  const saveUserState = () => {
    const userState = {
      phoneNumber,
      selectedCarrier,
      selectedTemplate: selectedTemplate ? {
        id: selectedTemplate.id,
        name: selectedTemplate.name,
        content: selectedTemplate.content,
        code: selectedTemplate.code,
        params: selectedTemplate.params
      } : null,
      templateParams
    }
    localStorage.setItem("sms-user-state", JSON.stringify(userState))
  }

  // 从localStorage恢复用户状态
  const restoreUserState = () => {
    try {
      const savedState = localStorage.getItem("sms-user-state")
      if (savedState) {
        const userState = JSON.parse(savedState)
        if (userState.phoneNumber) setPhoneNumber(userState.phoneNumber)
        if (userState.selectedCarrier) setSelectedCarrier(userState.selectedCarrier)
        if (userState.templateParams) setTemplateParams(userState.templateParams)
        if (userState.selectedTemplate) {
          setSelectedTemplate(userState.selectedTemplate)
        }
      }
    } catch (error) {
      console.error('Failed to restore user state:', error)
      Sentry.captureException(error, {
        tags: { operation: 'restore_user_state' }
      })
    }
  }

  // Search phone number suggestions based on user input
  const searchInputSuggestions = async (input: string) => {
    if (input.length < 3 || input.length === 11) {
      setInputSuggestions([])
      setShowInputSuggestions(false)
      return
    }

    setIsLoadingInputSuggestions(true)
    try {
      const response = await fetch(`/api/phone-numbers/search?q=${encodeURIComponent(input)}&limit=10`)
      if (response.ok) {
        const data = await response.json()
        setInputSuggestions(data.data || [])
        setShowInputSuggestions((data.data || []).length > 0)
        setActiveInputSuggestionIndex(-1)
      }
    } catch (error) {
      console.error('Failed to search input suggestions:', error)
      setInputSuggestions([])
      setShowInputSuggestions(false)
    } finally {
      setIsLoadingInputSuggestions(false)
    }
  }

  // Select suggestion from input dropdown
  const selectInputSuggestion = (suggestion: any) => {
    setPhoneNumber(suggestion.number)
    setShowInputSuggestions(false)
    setActiveInputSuggestionIndex(-1)
  }

  // Handle keyboard navigation for input suggestions
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (!showInputSuggestions) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveInputSuggestionIndex(prev => 
          prev < inputSuggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveInputSuggestionIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (activeInputSuggestionIndex >= 0) {
          selectInputSuggestion(inputSuggestions[activeInputSuggestionIndex])
        }
        break
      case 'Escape':
        setShowInputSuggestions(false)
        setActiveInputSuggestionIndex(-1)
        break
    }
  }

  // 处理手机号码输入和自动推荐
  const handlePhoneNumberChange = (value: string) => {
    setPhoneNumber(value)
  }

  // 使用 useEffect 来处理延迟搜索
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (phoneNumber.length >= 3 && phoneNumber.length !== 11) {
        searchInputSuggestions(phoneNumber)
      } else {
        setInputSuggestions([])
        setShowInputSuggestions(false)
      }
    }, 300)
    
    return () => clearTimeout(timeoutId)
  }, [phoneNumber])

  // Load tokens from localStorage on mount with validation
  useEffect(() => {
    const savedAdminToken = localStorage.getItem("sms-admin-token")
    const savedRefreshToken = localStorage.getItem("sms-refresh-token")

    // Load saved tokens if available
    if (savedAdminToken) {
      setAdminToken(savedAdminToken)
      
      fetchTemplates(savedAdminToken, true).finally(() => {
        setIsInitialLoad(false)
      })
    } else {
      // 没有token时也要设置loading状态为false
      setIsLoadingTemplates(false)
      setIsInitialLoad(false)
    }
    if (savedRefreshToken) {
      setRefreshToken(savedRefreshToken)
    }
    
    // Load carriers
    loadCarriers()
    
    // Load SMS history from database
    loadSmsHistory()
    
    // 加载待监控的SMS记录到后台服务
    smsMonitorService.loadPendingMessages()
    
    // Restore user state
    restoreUserState()
    
    // 设置SMS状态更新监听器
    const unsubscribe = smsMonitorService.onStatusUpdate((updates: SmsStatusUpdate[]) => {
      setSmsStatuses(prevStatuses => {
        const updatedStatuses = [...prevStatuses]
        
        updates.forEach(update => {
          const index = updatedStatuses.findIndex(sms => sms.outId === update.outId)
          if (index !== -1) {
            updatedStatuses[index] = {
              ...updatedStatuses[index],
              status: update.status,
              errorCode: update.errorCode,
              receiveDate: update.receiveDate
            }
          }
        })
        
        return updatedStatuses
      })
    })
    
    // 清理函数
    return () => {
      unsubscribe()
    }
  }, [])

  // 保存用户状态当状态变化时
  useEffect(() => {
    saveUserState()
  }, [phoneNumber, selectedCarrier, selectedTemplate, templateParams])

  // 当选择运营商时，自动触发搜索
  useEffect(() => {
    if (selectedCarrier) {
      searchPhoneNumbers(phoneSearchTerm, selectedCarrier, 1)
    }
  }, [selectedCarrier])

  // Save tokens to localStorage and validate configuration
  const saveTokens = () => {
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
    
    setShowConfigModal(false)
    setShow401Error(false)

    toast({
      title: "成功",
      description: "令牌配置已保存",
    })

    fetchTemplates()
  }

  // Fetch SMS templates with improved error handling
  const fetchTemplates = useCallback(async (tokenOverride?: string, isInitial = false) => {
    try {
      setIsLoadingTemplates(true)
      const tokenToUse = tokenOverride || adminToken
      
      if (!tokenToUse) {
        setIsLoadingTemplates(false)
        return
      }
      
      const response = await callAdminApi("/admin-api/system/sms-template/page?pageNo=1&pageSize=10&channelId=8", {}, tokenToUse)

      if (response.ok) {
        const data = await response.json()
        
        // Check if the response indicates authentication failure
        if (data.code === 401) {
          if (!isInitial) {
            if (!localStorage.getItem("sms-admin-token")) {
              setShowConfigModal(true)
              toast({
                title: "需要配置",
                description: "请配置管理后台令牌以使用系统",
                variant: "destructive",
              })
            } else {
              setShow401Error(true)
            }
          }
          return
        }
        
        // Check if response is successful
        if (data.code !== 0) {
          throw new Error(data.msg || "获取模板失败")
        }
        
        // Ensure templates is always an array
        const templatesData = Array.isArray(data.data) ? data.data : 
                              (data.data?.list ? data.data.list : [])
        
        setTemplates(templatesData)
        
        // 只在非初始加载或模板数量大于0时显示成功提示
        if (!isInitial || templatesData.length > 0) {
          toast({
            title: "成功",
            description: `已加载 ${templatesData.length} 个短信模板`,
          })
        }
      } else if (response.status === 401) {
        // 初始加载时不显示401错误，只有用户主动操作时才显示
        if (!isInitial) {
          if (!localStorage.getItem("sms-admin-token")) {
            setShowConfigModal(true)
            toast({
              title: "需要配置",
              description: "请配置管理后台令牌以使用系统",
              variant: "destructive",
            })
          } else {
            setShow401Error(true)
          }
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.msg || "获取模板失败")
      }
    } catch (error) {
      console.error("获取短信模板失败:", error)
      Sentry.captureException(error, {
        tags: { operation: 'fetch_templates' },
        extra: { isInitial, hasToken: !!(tokenOverride || adminToken) }
      })
      setTemplates([])
      if (!isInitial) {
        toast({
          title: "错误",
          description: error instanceof Error ? error.message : "获取短信模板失败，请检查网络连接",
          variant: "destructive",
        })
      }
    } finally {
      setIsLoadingTemplates(false)
    }
  }, [adminToken, toast, callAdminApi])

  // Get template details
  const getTemplateDetails = async (templateId: string) => {
    try {
      const response = await callAdminApi(`/admin-api/system/sms-template/get?id=${templateId}`)

      if (response.ok) {
        const data = await response.json()
        
        // Check for authentication error in response body
        if (data.code === 401) {
          return null
        }
        
        if (data.code === 0 && data.data) {
          return data.data
        }
      }
    } catch (error) {
      console.error("获取模板详情失败:", error)
      Sentry.captureException(error, {
        tags: { operation: 'get_template_details' },
        extra: { templateId }
      })
    }
    return null
  }

  // Handle template selection
  const handleTemplateSelect = async (templateId: string) => {
    const template = templates.find((t) => t.id === templateId)
    if (!template) return

    const details = await getTemplateDetails(templateId)
    if (details) {
      setSelectedTemplate({
        ...template,
        params: details.params || [],
      })

      // Initialize template parameters with specific default values
      const defaultParams: Record<string, string> = {}
      const defaultValues = ['供应商', '采购商', '草甘膦']
      
      details.params?.forEach((param: string, index: number) => {
        // Use specific default values for the first 3 parameters, then generic for the rest
        defaultParams[param] = index < defaultValues.length 
          ? defaultValues[index] 
          : `测试值${index + 1}`
      })
      setTemplateParams(defaultParams)
    }
  }

  // Send SMS
  const sendSms = async () => {
    if (!selectedTemplate || !phoneNumber.trim()) {
      toast({
        title: "错误",
        description: "请选择模板和填写手机号码",
        variant: "destructive",
      })
      return
    }

    setIsSending(true)

    try {
      const response = await callAdminApi("/admin-api/system/sms-template/send-sms", {
        method: "POST",
        body: JSON.stringify({
          content: selectedTemplate.content,
          params: selectedTemplate.params,
          mobile: phoneNumber,
          templateCode: selectedTemplate.code,
          templateParams: templateParams,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        
        // Check for authentication error in response body
        if (data.code === 401) {
          if (!localStorage.getItem("sms-admin-token")) {
            setShowConfigModal(true)
            toast({
              title: "需要配置",
              description: "请配置管理后台令牌以使用系统",
              variant: "destructive",
            })
          } else {
            setShow401Error(true)
          }
          return
        }
        
        if (data.code !== 0) {
          throw new Error(data.msg || "发送失败")
        }
        
        const outId = data.data ? String(data.data) : `${Date.now()}` // Convert to string for consistency

        // Save to database - query phone number details first
        try {
          // Query phone number details
          let carrier = '';
          let phoneNote = '';
          
          try {
            const phoneResponse = await fetch(`/api/phone-numbers?number=${encodeURIComponent(phoneNumber)}`);
            if (phoneResponse.ok) {
              const phoneData = await phoneResponse.json();
              if (phoneData.success && phoneData.data) {
                carrier = phoneData.data.carrier || '';
                phoneNote = phoneData.data.note || '';
              }
            }
          } catch (phoneError) {
            console.error('Failed to query phone number details:', phoneError);
            // Continue without carrier/note info
          }
          
          // 渲染真实内容，替换占位符
          const renderContent = (template: string, params: Record<string, string>) => {
            let rendered = template;
            Object.keys(params).forEach(key => {
              const placeholder = `\${${key}}`;
              rendered = rendered.replaceAll(placeholder, params[key] || key);
            });
            return rendered;
          };
          
          const actualContent = selectedTemplate?.content ? 
            renderContent(selectedTemplate.content, templateParams) : 
            selectedTemplate?.content;
          
          await fetch('/api/sms-records', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              out_id: outId,
              phone_number: phoneNumber,
              carrier: carrier,
              phone_note: phoneNote,
              template_code: selectedTemplate?.code,
              template_name: selectedTemplate?.name,
              template_params: templateParams,
              content: actualContent, // 保存渲染后的真实内容
              send_date: new Date().toLocaleString("zh-CN"),
              status: "发送中"
            })
          })
        } catch (dbError) {
          console.error('Failed to save SMS record to database:', dbError)
          // 不阻断用户流程，只记录错误
        }

        // Add to status monitoring
        const newStatus: SmsStatus = {
          outId,
          status: "发送中",
          sendDate: new Date().toLocaleString("zh-CN"),
          phoneNumber,
        }

        setSmsStatuses((prev) => [newStatus, ...prev])
        
        // 添加到后台监控服务 - 新SMS具有最高优先级
        smsMonitorService.addSmsForMonitoring(outId, phoneNumber.trim(), 1)

        toast({
          title: "成功",
          description: `短信发送成功，OutId: ${outId}`,
        })
      } else if (response.status === 401) {
        // If still 401 after refresh attempt
        if (!localStorage.getItem("sms-admin-token")) {
          setShowConfigModal(true)
          toast({
            title: "需要配置",
            description: "请配置管理后台令牌以使用系统",
            variant: "destructive",
          })
        } else {
          setShow401Error(true)
        }
      } else {
        throw new Error("发送失败")
      }
    } catch (error) {
      Sentry.captureException(error, {
        tags: { operation: 'send_sms' },
        extra: {
          templateId: selectedTemplate?.id,
          phoneNumber: phoneNumber,
          hasToken: !!adminToken
        }
      })
      toast({
        title: "错误",
        description: "短信发送失败，请检查配置和参数",
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
    }
  }

  // Check SMS status using Aliyun SDK
  const checkSmsStatus = async (outId: string, smsPhoneNumber?: string) => {
    try {
      // 优先使用SMS记录的手机号，其次使用当前选择的手机号
      const phoneToUse = smsPhoneNumber || phoneNumber.trim()
      
      if (!phoneToUse) {
        console.error("手机号码未配置")
        return null
      }

      const response = await fetch('/api/sms-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          outId,
          phoneNumber: phoneToUse // 使用正确的手机号
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("API调用失败:", errorData)
        throw new Error(errorData.error || '未知错误')
      }

      const data = await response.json()
      return data

    } catch (error) {
      console.error("查询短信状态失败:", error)
      
      // Only capture non-network errors to avoid spam
      if (error instanceof Error && !error.message.includes('fetch')) {
        Sentry.captureException(error, {
          tags: { operation: 'check_sms_status' },
          extra: { outId, phoneNumber: smsPhoneNumber || phoneNumber }
        })
      }
      
      // Show user-friendly error message only occasionally to avoid spam
      const shouldShowToast = Math.random() < 0.3 // Show toast for 30% of errors
      
      if (shouldShowToast) {
        toast({
          title: "状态查询失败",
          description: error instanceof Error ? error.message : "无法连接到阿里云API，请检查配置",
          variant: "destructive",
        })
      }
      
      return null
    }
  }

  // 手动刷新SMS状态
  const refreshStatuses = useCallback(async () => {
    setIsRefreshing(true)
    try {
      // 1. 触发后台监控服务的手动检查
      await smsMonitorService.triggerManualCheck()
      
      // 2. 主动查询所有"发送中"状态的SMS记录
      const pendingStatuses = smsStatuses.filter(sms => 
        sms.status === "发送中" || sms.status === "发送中(已停止查询)"
      )
      
      if (pendingStatuses.length > 0) {
        
        // 并行查询所有发送中的SMS状态
        const statusPromises = pendingStatuses.map(async (sms) => {
          try {
            const statusUpdate = await checkSmsStatus(sms.outId, sms.phoneNumber)
            if (statusUpdate) {
              // 更新数据库
              await fetch('/api/sms-records', {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  out_id: sms.outId,
                  status: statusUpdate.status,
                  error_code: statusUpdate.errorCode,
                  receive_date: statusUpdate.receiveDate
                })
              })
              
              return {
                outId: sms.outId,
                updates: statusUpdate
              }
            }
          } catch (error) {
            // 静默处理错误
          }
          return null
        })
        
        const results = await Promise.all(statusPromises)
        const successCount = results.filter(result => result !== null).length
        
        // 更新本地状态
        setSmsStatuses(prevStatuses => {
          const updatedStatuses = [...prevStatuses]
          results.forEach(result => {
            if (result) {
              const index = updatedStatuses.findIndex(sms => sms.outId === result.outId)
              if (index !== -1) {
                updatedStatuses[index] = {
                  ...updatedStatuses[index],
                  status: result.updates.status,
                  errorCode: result.updates.errorCode,
                  receiveDate: result.updates.receiveDate
                }
              }
            }
          })
          return updatedStatuses
        })
        
        if (successCount > 0) {
          toast({
            title: "刷新完成",
            description: `已更新SMS状态，成功查询 ${successCount}/${pendingStatuses.length} 条记录`,
          })
        } else {
          toast({
            title: "刷新完成",
            description: "未获取到新的状态更新，可能阿里云仍在处理中",
          })
        }
      } else {
        toast({
          title: "刷新完成",
          description: "没有发送中的记录需要查询",
        })
      }
      
      // 3. 重新加载SMS历史记录以获取最新状态
      await loadSmsHistory()
      
    } catch (error) {
      Sentry.captureException(error, {
        tags: { operation: 'refresh_statuses' },
        extra: { pendingCount: smsStatuses.filter(sms => sms.status === "发送中").length }
      })
      toast({
        title: "刷新失败",
        description: "无法更新SMS状态",
        variant: "destructive",
      })
    } finally {
      setIsRefreshing(false)
    }
  }, [smsStatuses, checkSmsStatus, loadSmsHistory, toast])

  // 重发SMS
  const resendSms = async (outId: string) => {
    // 检查是否正在重发
    if (resendingOutIds.has(outId)) {
      return
    }

    // 添加到重发状态
    setResendingOutIds(prev => new Set(prev).add(outId))

    try {
      const response = await fetch('/api/sms-records/resend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          out_id: outId,
          admin_token: adminToken
        })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast({
          title: "重发成功",
          description: `短信重发成功，新OutId: ${result.data.new_out_id}`,
        })

        // 添加新记录到状态监控
        if (result.data.new_record) {
          const newStatus: SmsStatus = {
            outId: result.data.new_out_id,
            status: "发送中",
            sendDate: new Date().toLocaleString("zh-CN"),
            phoneNumber: result.data.new_record.phone_number,
          }

          setSmsStatuses((prev) => [newStatus, ...prev])
          
          // 添加到后台监控服务
          smsMonitorService.addSmsForMonitoring(result.data.new_out_id, result.data.new_record.phone_number.trim(), 1)
        }

        // 重新加载SMS历史记录以获取最新状态
        await loadSmsHistory()

      } else {
        throw new Error(result.error || '重发失败')
      }

    } catch (error) {
      console.error('重发SMS失败:', error)
      toast({
        title: "重发失败",
        description: error instanceof Error ? error.message : "重发SMS失败，请稍后重试",
        variant: "destructive",
      })
    } finally {
      // 从重发状态中移除
      setResendingOutIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(outId)
        return newSet
      })
    }
  }

  // 检查记录是否可以重发
  const canResend = (status: string) => {
    const resendableStatuses = ['发送失败', '发送中(已停止查询)']
    return resendableStatuses.includes(status)
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "已送达":
        return "default"
      case "发送失败":
        return "destructive"
      case "发送中":
        return "secondary"
      case "发送中(已停止查询)":
        return "outline"
      default:
        return "outline"
    }
  }

  // 错误代码转换为可读信息
  const getErrorMessage = (errorCode: string) => {
    const errorMap: Record<string, string> = {
      'IS_CLOSE': '短信通道被关停，阿里云会自动剔除被关停通道，建议稍后重试',
      'PARAMS_ILLEGAL': '参数错误，请检查短信签名、短信文案或手机号码等参数是否传入正确',
      'MOBILE_NOT_ON_SERVICE': '手机号停机、空号、暂停服务、关机或不在服务区，请核实接收手机号码状态是否正常',
      'MOBILE_SEND_LIMIT': '单个号码日、月发送上限或频繁发送超限，为防止恶意调用已进行流控限制',
      'MOBILE_ACCOUNT_ABNORMAL': '用户账户异常、携号转网或欠费等，建议检查号码状态确保正常后重试',
      'MOBILE_IN_BLACK': '手机号在黑名单中，通常是用户已退订此签名或命中运营商平台黑名单规则',
      'MOBLLE_TERMINAL_ERROR': '手机终端问题，如内存满、SIM卡满、非法设备等，建议检查终端设备状况',
      'CONTENT_KEYWORD': '内容关键字拦截，运营商自动拦截潜在风险或高投诉的内容关键字',
      'INVALID_NUMBER': '号码状态异常，如关机、停机、空号、暂停服务、不在服务区或号码格式错误',
      'CONTENT_ERROR': '推广短信内容中必须带退订信息，请在短信结尾添加"拒收请回复R"',
      'REQUEST_SUCCESS': '请求成功但未收到运营商回执，大概率是接收用户状态异常导致',
      'SP_NOT_BY_INTER_SMS': '收件人未开通国际短信功能，请联系运营商开通后再发送',
      'SP_UNKNOWN_ERROR': '运营商未知错误，阿里云平台接收到的运营商回执报告为未知错误',
      'USER_REJECT': '接收用户已退订此业务或产品未开通，建议将此类用户剔除出发送清单',
      'NO_ROUTE': '当前短信内容无可用通道发送，发送的业务场景属于暂时无法支持的场景',
      'isv.UNSUPPORTED_CONTENT': '不支持的短信内容，包含繁体字、emoji表情符号或其他非常用字符',
      'isv.SMS_CONTENT_MISMATCH_TEMPLATE_TYPE': '短信内容和模板属性不匹配，通知模板无法发送推广营销文案',
      'isv.ONE_CODE_MULTIPLE_SIGN': '一码多签，当前传入的扩展码和签名与历史记录不一致',
      'isv.CODE_EXCEED_LIMIT': '自拓扩展码个数已超过上限，无法分配新的扩展码发送新签名',
      'isv.CODE_ERROR': '传入扩展码不可用，自拓扩展位数超限',
      'PORT_NOT_REGISTERED': '当前使用端口号尚未完成企业实名制报备流程，需要完成实名制报备',
      'isv.SIGN_SOURCE_ILLEGAL': '签名来源不支持，创建和修改签名时使用了不支持的签名来源',
      'DELIVERED': '已送达' // 成功状态，不是错误
    }

    return errorMap[errorCode] || `未知错误代码: ${errorCode}`
  }

  // 计算后台监控状态
  const getMonitoringStatus = () => {
    const pendingCount = smsStatuses.filter(sms => 
      sms.status === "发送中" || sms.status === "发送中(已停止查询)"
    ).length
    
    if (pendingCount > 0) {
      return {
        isMonitoring: true,
        text: `后台监控中 (${pendingCount}条)`,
        variant: "default" as const
      }
    } else {
      return {
        isMonitoring: false,  
        text: "监控空闲",
        variant: "secondary" as const
      }
    }
  }

  const monitoringStatus = getMonitoringStatus()

  // 骨架屏组件
  const TemplateSelectionSkeleton = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <MessageSquare className="w-5 h-5 mr-2" />
          短信模板选择
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-10" />
        </div>
        <Skeleton className="h-16 w-full" />
      </CardContent>
    </Card>
  )

  const PhoneNumberSkeleton = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Phone className="w-5 h-5 mr-2" />
          手机号码
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <div className="flex gap-2 items-end">
            <div className="min-w-0 flex-shrink-0">
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-9 w-32" />
            </div>
            <div className="flex-1 min-w-0">
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-9 w-full" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const StatusMonitoringSkeleton = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            实时状态
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-6 w-16" />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-6 w-16" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-36" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )

  // 如果页面正在加载，显示骨架屏
  if (isPageLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-9 w-32" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Panel Skeleton */}
            <div className="space-y-6">
              <TemplateSelectionSkeleton />
              <PhoneNumberSkeleton />
              
              {/* Template Parameters Skeleton */}
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-24" />
                </CardHeader>
                <CardContent className="space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i}>
                      <Skeleton className="h-4 w-16 mb-2" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Send Buttons Skeleton */}
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>

            {/* Right Panel Skeleton */}
            <div className="space-y-6">
              <StatusMonitoringSkeleton />
              
              {/* Instructions Skeleton */}
              <div className="border rounded-lg p-4">
                <Skeleton className="h-4 w-20 mb-3" />
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-4 w-full" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Configuration Modal Component
  const ConfigurationModal = () => {
    const handleEyeToggle = (field: 'admin' | 'refresh') => {
      if (field === 'admin') {
        setShowAdminToken(prev => !prev)
      } else {
        setShowRefreshToken(prev => !prev)
      }
    }

    const handleAdminTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setAdminToken(e.target.value)
    }

    const handleRefreshTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setRefreshToken(e.target.value)
    }

    return (
      <Dialog open={showConfigModal} onOpenChange={setShowConfigModal}>
        <DialogContent className="max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Token配置
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                <strong>获取令牌说明：</strong>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>• 管理后台令牌：登录后台管理系统获取API Token</li>
                  <li>• 阿里云AccessKey已在服务器环境变量中配置</li>
                  <li>• 令牌过期时需要重新获取并配置</li>
                </ul>
              </AlertDescription>
            </Alert>
            <div>
              <Label htmlFor="modal-admin-token">管理后台令牌</Label>
              <div className="relative">
                <Input
                  id="modal-admin-token"
                  type={showAdminToken ? "text" : "password"}
                  placeholder="请输入管理后台API令牌"
                  value={adminToken}
                  onChange={handleAdminTokenChange}
                  className="pr-10"
                  autoComplete="off"
                />
                <div
                  className="absolute right-0 top-0 h-full px-3 flex items-center cursor-pointer text-gray-400 hover:text-gray-600 select-none"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleEyeToggle('admin')
                  }}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                >
                  {showAdminToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="modal-refresh-token">管理后台刷新令牌 (可选)</Label>
              <div className="relative">
                <Input
                  id="modal-refresh-token"
                  type={showRefreshToken ? "text" : "password"}
                  placeholder="请输入管理后台刷新令牌"
                  value={refreshToken}
                  onChange={handleRefreshTokenChange}
                  className="pr-10"
                  autoComplete="off"
                />
                <div
                  className="absolute right-0 top-0 h-full px-3 flex items-center cursor-pointer text-gray-400 hover:text-gray-600 select-none"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleEyeToggle('refresh')
                  }}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                >
                  {showRefreshToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                提供刷新令牌可以自动更新过期的访问令牌
              </p>
            </div>
            <Button onClick={saveTokens} className="w-full">
              保存配置
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 401 Error Alert */}
        {show401Error && (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between">
              <div>
                <strong>认证失败：</strong> 管理后台令牌已过期或无效，请重新配置令牌以继续使用系统功能。
              </div>
              <div className="flex gap-2 ml-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowConfigModal(true)}
                >
                  配置Token
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShow401Error(false)}
                >
                  ×
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">短信测试工具</h1>
          <div className="flex items-center gap-2">
            <Link href="/analytics">
              <Button variant="outline" size="sm">
                <BarChart className="w-4 h-4 mr-2" />
                数据分析
              </Button>
            </Link>
            <Link href="/auto-test">
              <Button variant="outline" size="sm">
                <Timer className="w-4 h-4 mr-2" />
                自动化测试
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => setShowConfigModal(true)}
            >
              <Settings className="w-4 h-4 mr-2" />
              配置Token
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - SMS Configuration */}
          <div className="space-y-6">
            {/* Template Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageSquare className="w-5 h-5 mr-2" />
                  短信模板选择
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Select onValueChange={handleTemplateSelect}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="选择短信模板" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={() => fetchTemplates()}>
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>

                {selectedTemplate && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">模板内容:</p>
                    <p className="text-sm">{selectedTemplate.content}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Phone Number Input */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Phone className="w-5 h-5 mr-2" />
                  手机号码
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Input
                      placeholder="请输入手机号码"
                      value={phoneNumber}
                      onChange={(e) => handlePhoneNumberChange(e.target.value)}
                      onKeyDown={handleInputKeyDown}
                      onBlur={() => {
                        // 延迟关闭建议列表，以便点击建议项
                        setTimeout(() => setShowInputSuggestions(false), 200)
                      }}
                      onFocus={() => {
                        // 如果有建议且输入长度>=3且不等于11，重新显示建议
                        if (phoneNumber.length >= 3 && phoneNumber.length !== 11 && inputSuggestions.length > 0) {
                          setShowInputSuggestions(true)
                        }
                      }}
                      className="flex-1"
                    />
                    {/* 自动推荐下拉列表 */}
                    {showInputSuggestions && (
                      <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {isLoadingInputSuggestions ? (
                          <div className="px-3 py-2 text-sm text-gray-500">
                            搜索中...
                          </div>
                        ) : inputSuggestions.length > 0 ? (
                          inputSuggestions.map((suggestion, index) => (
                            <div
                              key={suggestion.id}
                              className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${
                                index === activeInputSuggestionIndex ? 'bg-blue-100' : ''
                              }`}
                              onClick={() => selectInputSuggestion(suggestion)}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{suggestion.number}</span>
                                <Badge variant="outline" className="text-xs">
                                  {suggestion.carrier || '未知运营商'}
                                </Badge>
                              </div>
                              {suggestion.note && (
                                <div className="text-xs text-gray-500 mt-1 truncate">
                                  备注: {suggestion.note}
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-gray-500">
                            未找到匹配的号码
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <PhoneNumberManagerModal 
                    onPhoneNumbersChange={() => {
                      // 重新加载运营商列表
                      loadCarriers()
                      // 如果有选择的运营商，重新搜索
                      if (selectedCarrier) {
                        searchPhoneNumbers(phoneSearchTerm, selectedCarrier, 1)
                      }
                    }}
                    onSelectNumber={setPhoneNumber}
                  />
                </div>
                
                {/* 运营商和号码级联选择 */}
                {availableCarriers.length > 0 && (
                  <div className="space-y-3">
                    <div className="text-sm text-gray-600">或从已保存的号码中选择：</div>
                    <div className="flex gap-2 items-end">
                      {/* 运营商选择 */}
                      <div className="min-w-0 flex-shrink-0">
                        <Label className="text-xs text-gray-500 mb-1 block">选择运营商</Label>
                        <div className="flex gap-1">
                          <Select value={selectedCarrier} onValueChange={handleCarrierSelect}>
                            <SelectTrigger className="h-9 w-auto min-w-[120px]">
                              <SelectValue placeholder="选择运营商" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableCarriers.map((carrier) => (
                                <SelectItem key={carrier} value={carrier}>
                                  <Badge variant="outline" className="text-xs">
                                    {carrier}
                                  </Badge>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {selectedCarrier && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCarrierSelect("")}
                              className="h-9 px-2"
                              title="清空选择"
                            >
                              ×
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {/* 手机号码选择 */}
                      <div className="flex-1 min-w-0">
                        <Label className="text-xs text-gray-500 mb-1 block">选择号码</Label>
                        <Select 
                          value={phoneNumber} 
                          onValueChange={setPhoneNumber}
                          disabled={!selectedCarrier}
                        >
                          <SelectTrigger className="h-9 select-no-truncate w-full overflow-visible">
                            <div className="w-full overflow-visible">
                              {phoneNumber ? (
                                <div className="text-left w-full overflow-visible">
                                  <div className="font-medium overflow-visible text-ellipsis-none whitespace-nowrap">
                                    {phoneNumber}
                                  </div>
                                  {phoneNumbers.find(p => p.number === phoneNumber)?.note && (
                                    <div className="text-xs text-gray-500 overflow-visible text-ellipsis-none whitespace-nowrap">
                                      备注: {phoneNumbers.find(p => p.number === phoneNumber)?.note}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400">
                                  {selectedCarrier ? "选择号码" : "请先选择运营商"}
                                </span>
                              )}
                            </div>
                          </SelectTrigger>
                          <SelectContent className="w-full">
                            {phoneNumbersLoading ? (
                              <div className="px-2 py-1.5 text-xs text-gray-500">
                                加载中...
                              </div>
                            ) : phoneNumbers.map((phone) => (
                              <SelectItem key={phone.id} value={phone.number}>
                                <div className="w-full text-left">
                                  <div className="font-medium text-left">{phone.number}</div>
                                  {phone.note && (
                                    <div className="text-xs text-gray-500 text-left">
                                      备注: {phone.note}
                                    </div>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                            {!phoneNumbersLoading && phoneNumbers.length === 0 && selectedCarrier && (
                              <div className="px-2 py-1.5 text-xs text-gray-500">
                                该运营商暂无保存的号码
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    {/* 分页控制 */}
                    {selectedCarrier && phonePagination.totalPages > 1 && (
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>共 {phonePagination.total} 个号码</span>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(phonePagination.currentPage - 1)}
                            disabled={!phonePagination.hasPrev || phoneNumbersLoading}
                          >
                            上一页
                          </Button>
                          <span className="px-2">
                            {phonePagination.currentPage} / {phonePagination.totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(phonePagination.currentPage + 1)}
                            disabled={!phonePagination.hasNext || phoneNumbersLoading}
                          >
                            下一页
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {/* 快速搜索所有号码的选项 */}
                    {!selectedCarrier && (
                      <div className="space-y-2">
                        <Label className="text-xs text-gray-500 mb-1 block">快速搜索</Label>
                        
                        {/* 搜索输入框 */}
                        <div className="relative">
                          <Input
                            placeholder="搜索手机号码、运营商或备注..."
                            value={phoneSearchTerm}
                            onChange={(e) => handlePhoneSearch(e.target.value)}
                            className="h-9 text-sm"
                          />
                        </div>
                        
                        {/* 搜索结果下拉框 */}
                        {phoneSearchTerm.trim() && (
                          <Select value={phoneNumber} onValueChange={setPhoneNumber}>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder={`搜索结果 (${phonePagination.total}条)`} />
                            </SelectTrigger>
                            <SelectContent>
                              {phoneNumbersLoading ? (
                                <div className="px-2 py-1.5 text-xs text-gray-500">
                                  搜索中...
                                </div>
                              ) : phoneNumbers.map((phone) => (
                                <SelectItem key={phone.id} value={phone.number}>
                                  <div className="flex flex-col items-start py-1 max-w-full text-left">
                                    <div className="flex items-center gap-2 max-w-full">
                                      <span className="font-medium text-left">{phone.number}</span>
                                      <Badge variant="outline" className="text-xs flex-shrink-0">
                                        {phone.carrier}
                                      </Badge>
                                    </div>
                                    {phone.note && (
                                      <div className="text-xs text-gray-500 mt-1 max-w-full text-left">
                                        备注: {phone.note}
                                      </div>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                              {!phoneNumbersLoading && phoneNumbers.length === 0 && (
                                <div className="px-2 py-1.5 text-xs text-gray-500">
                                  未找到匹配的号码
                                </div>
                              )}
                            </SelectContent>
                          </Select>
                        )}
                        
                        {/* 分页控制 */}
                        {phoneSearchTerm.trim() && phonePagination.totalPages > 1 && (
                          <div className="flex items-center justify-between text-xs text-gray-600">
                            <span>第 {phonePagination.currentPage} 页，共 {phonePagination.totalPages} 页</span>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(phonePagination.currentPage - 1)}
                                disabled={!phonePagination.hasPrev || phoneNumbersLoading}
                                className="h-7 px-2 text-xs"
                              >
                                上一页
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(phonePagination.currentPage + 1)}
                                disabled={!phonePagination.hasNext || phoneNumbersLoading}
                                className="h-7 px-2 text-xs"
                              >
                                下一页
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Template Parameters */}
            {selectedTemplate && selectedTemplate.params.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>模板参数</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedTemplate.params.map((param, index) => (
                    <div key={param}>
                      <Label htmlFor={`param-${index}`}>{param}</Label>
                      <Input
                        id={`param-${index}`}
                        placeholder={`请输入${param}`}
                        value={templateParams[param] || ""}
                        onChange={(e) =>
                          setTemplateParams((prev) => ({
                            ...prev,
                            [param]: e.target.value,
                          }))
                        }
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Send Buttons */}
            <div className="space-y-3">
              <Button
                onClick={sendSms}
                disabled={!selectedTemplate || !phoneNumber.trim() || isSending}
                className="w-full"
                size="lg"
              >
                <Send className="w-4 h-4 mr-2" />
                {isSending ? "发送中..." : "发送短信"}
              </Button>
              
              {selectedTemplate && (
                <Button
                  onClick={() => setShowBulkSendModal(true)}
                  disabled={isSending}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  <Send className="w-4 h-4 mr-2" />
                  一键发送给所有号码
                </Button>
              )}
            </div>
          </div>

          {/* Right Panel - Status Monitoring */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Clock className="w-5 h-5 mr-2" />
                    实时状态
                  </div>
                  <div className="flex gap-2">
                    <Link href="/monitor">
                      <Button variant="outline" size="sm">
                        查看详情
                      </Button>
                    </Link>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={refreshStatuses} 
                      disabled={isRefreshing}
                      title="刷新状态并主动查询阿里云最新状态"
                    >
                      <RefreshCw className={`w-4 h-4 mr-1 ${isRefreshing ? "animate-spin" : ""}`} />
                      {isRefreshing ? "查询中..." : "强制刷新"}
                    </Button>
                    <Badge variant={monitoringStatus.variant}>
                      {monitoringStatus.text}
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingSmsHistory ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-gray-500">加载监控记录中...</p>
                  </div>
                ) : smsStatuses.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">暂无发送记录</div>
                ) : (
                  <div className="space-y-4">
                    {smsStatuses.slice(0, 5).map((sms) => (
                      <div key={sms.outId} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">OutId: {sms.outId}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant={getStatusBadgeVariant(sms.status)}>{sms.status}</Badge>
                            {canResend(sms.status) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => resendSms(sms.outId)}
                                disabled={resendingOutIds.has(sms.outId)}
                                className="h-6 px-2"
                                title="重发短信"
                              >
                                <RotateCcw className={`w-3 h-3 ${resendingOutIds.has(sms.outId) ? 'animate-spin' : ''}`} />
                                {resendingOutIds.has(sms.outId) ? '重发中' : '重发'}
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>手机号码: {sms.phoneNumber}</p>
                          <p>发送时间: {sms.sendDate}</p>
                          {sms.receiveDate && <p>送达时间: {sms.receiveDate}</p>}
                          {sms.errorCode && sms.errorCode !== "DELIVERED" && sms.status === "发送失败" && (
                            <div className="bg-red-50 border border-red-200 rounded p-2 mt-2">
                              <p className="text-red-800 font-medium text-sm">失败原因: {getErrorMessage(sms.errorCode)}</p>
                              <p className="text-red-600 text-xs mt-1">错误代码: {sms.errorCode}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {smsStatuses.length > 3 && (
                      <div className="text-center pt-2">
                        <Link href="/monitor">
                          <Button variant="outline" size="sm">
                            查看全部 {smsStatuses.length} 条记录
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Instructions */}
            <Alert>
              <AlertDescription>
                <strong>使用说明:</strong>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>• 系统后台自动监控SMS状态，无需手动刷新</li>
                  <li>• <strong>强制刷新</strong>：主动查询阿里云最新状态，解决延迟反馈问题</li>
                  <li>• <strong>一键发送</strong>：选择模板后可批量发送给所有号码，支持搜索和分组选择</li>
                  <li>• <strong>重发功能</strong>：失败的短信可点击"重发"按钮重新发送，会生成新的OutId</li>
                  <li>• 可点击"查看详情"查看完整的发送记录和统计</li>
                  <li>• 点击"管理号码"可添加和管理常用手机号</li>
                  <li>• 令牌信息已本地保存，刷新页面不会丢失</li>
                  <li>• 支持多个短信同时监控状态，切换页面不会中断监控</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
      
      {/* Configuration Modal */}
      <ConfigurationModal />
      
      {/* Bulk Send Modal */}
      <BulkSendModal
        open={showBulkSendModal}
        onOpenChange={setShowBulkSendModal}
        selectedTemplate={selectedTemplate}
        templateParams={templateParams}
        onSendComplete={(results) => {
          // 批量发送完成后，刷新SMS状态列表
          loadSmsHistory()
          // 添加发送成功的记录到后台监控服务
          results.forEach(result => {
            if (result.status === 'success') {
              // 传递手机号码和优先级，批量SMS使用稍低优先级
              smsMonitorService.addSmsForMonitoring(result.outId, result.phone, 2)
            }
          })
        }}
      />
    </div>
  )
}
