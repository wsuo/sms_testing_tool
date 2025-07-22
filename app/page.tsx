"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RefreshCw, Send, Settings, Phone, MessageSquare, Clock, Eye, EyeOff } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import PhoneNumberManager from "@/components/phone-number-manager"
import { Textarea } from "@/components/ui/textarea"

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
  const [tokensConfigured, setTokensConfigured] = useState(false)
  
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
  const [savedPhoneNumbers, setSavedPhoneNumbers] = useState<any[]>([])
  const [useCustomNumber, setUseCustomNumber] = useState(false)

  // Status monitoring
  const [smsStatuses, setSmsStatuses] = useState<SmsStatus[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)

  // Refresh token utility function
  const refreshAccessToken = async (): Promise<{ success: boolean; newToken?: string }> => {
    if (!refreshToken) {
      return { success: false }
    }

    try {
      const response = await fetch(`/admin-api/system/auth/refresh-token?refreshToken=${refreshToken}`, {
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
      console.error("Token refresh failed:", error)
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
      
      console.log("Making API request:", {
        url,
        token,
        headers
      })
      
      return await fetch(url, {
        ...options,
        headers,
      })
    }

    const tokenToUse = tokenOverride || adminToken
    
    // First attempt with current token
    let response = await makeRequest(tokenToUse)
    
    console.log("API response status:", response.status)
    
    // Check if response body contains 401 error
    if (response.ok) {
      const responseClone = response.clone()
      try {
        const data = await responseClone.json()
        if (data.code === 401) {
          console.log("API returned 401 in response body, attempting token refresh...")
          const refreshResult = await refreshAccessToken()
          if (refreshResult.success && refreshResult.newToken) {
            console.log("Token refreshed successfully, retrying request...")
            response = await makeRequest(refreshResult.newToken)
            console.log("Retry response status:", response.status)
          } else {
            console.log("Token refresh failed")
          }
        }
      } catch (e) {
        // If parsing fails, continue with original response
        console.log("Failed to parse response for 401 check:", e)
      }
    }

    // If HTTP 401, try to refresh and retry
    if (response.status === 401) {
      console.log("Got HTTP 401, attempting token refresh...")
      const refreshResult = await refreshAccessToken()
      if (refreshResult.success && refreshResult.newToken) {
        console.log("Token refreshed successfully, retrying request...")
        response = await makeRequest(refreshResult.newToken)
        console.log("Retry response status:", response.status)
      } else {
        console.log("Token refresh failed")
      }
    }

    return response
  }

  // Load SMS history from database
  const loadSmsHistory = async () => {
    try {
      const response = await fetch('/api/sms-records?limit=50')
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
          console.log(`Loaded ${historyStatuses.length} SMS records from database`)
        }
      }
    } catch (error) {
      console.error('Failed to load SMS history:', error)
    }
  }

  // Load saved phone numbers
  const loadSavedPhoneNumbers = async () => {
    try {
      const response = await fetch('/api/phone-numbers')
      if (response.ok) {
        const data = await response.json()
        setSavedPhoneNumbers(data.data)
      }
    } catch (error) {
      console.error('Failed to load saved phone numbers:', error)
    }
  }

  // Load tokens from localStorage on mount with validation
  useEffect(() => {
    const savedAdminToken = localStorage.getItem("sms-admin-token")
    const savedRefreshToken = localStorage.getItem("sms-refresh-token")

    console.log("Loading saved tokens:", {
      hasAdminToken: !!savedAdminToken,
      hasRefreshToken: !!savedRefreshToken,
    })

    // Load saved tokens if available
    if (savedAdminToken) {
      setAdminToken(savedAdminToken)
    }
    if (savedRefreshToken) {
      setRefreshToken(savedRefreshToken)
    }

    // Only mark as configured if admin token exists
    if (savedAdminToken) {
      setTokensConfigured(true)
      // Validate tokens by trying to fetch templates
      setTimeout(() => {
        fetchTemplates(savedAdminToken)
      }, 500)
    }
    
    // Load saved phone numbers
    loadSavedPhoneNumbers()
    
    // Load SMS history from database
    loadSmsHistory()
  }, [])

  // Auto-save tokens to localStorage when they change
  useEffect(() => {
    if (adminToken.trim()) {
      localStorage.setItem("sms-admin-token", adminToken)
    }
  }, [adminToken])


  useEffect(() => {
    if (refreshToken.trim()) {
      localStorage.setItem("sms-refresh-token", refreshToken)
    }
  }, [refreshToken])

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
    setTokensConfigured(true)

    toast({
      title: "成功",
      description: "令牌配置已保存",
    })

    // Load templates after tokens are configured
    fetchTemplates()
  }

  // Fetch SMS templates with improved error handling
  const fetchTemplates = useCallback(async (tokenOverride?: string) => {
    try {
      const tokenToUse = tokenOverride || adminToken
      console.log("Fetching templates with token:", tokenToUse)
      
      if (!tokenToUse) {
        console.log("No token available for fetching templates")
        return
      }
      
      const response = await callAdminApi("/admin-api/system/sms-template/page?pageNo=1&pageSize=10&channelId=8", {}, tokenToUse)

      if (response.ok) {
        const data = await response.json()
        console.log("Template API response:", data) // Debug log
        
        // Check if the response indicates authentication failure
        if (data.code === 401) {
          console.log("API returned 401 in response body, handling as authentication failure")
          // If still 401 after refresh attempt, handle as before
          setTokensConfigured(false)
          toast({
            title: "认证失败",
            description: "管理后台令牌已过期，请重新配置令牌",
            variant: "destructive",
          })
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
        toast({
          title: "成功",
          description: `已加载 ${templatesData.length} 个短信模板`,
        })
      } else if (response.status === 401) {
        // If still 401 after refresh attempt, handle as before
        setTokensConfigured(false)
        toast({
          title: "认证失败",
          description: "管理后台令牌已过期，请重新配置令牌",
          variant: "destructive",
        })
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error("API error response:", errorData)
        throw new Error(errorData.msg || "获取模板失败")
      }
    } catch (error) {
      console.error("获取短信模板失败:", error)
      // Ensure templates is empty array on error
      setTemplates([])
      toast({
        title: "错误",
        description: error instanceof Error ? error.message : "获取短信模板失败，请检查网络连接",
        variant: "destructive",
      })
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
          console.log("Template details API returned 401")
          return null
        }
        
        if (data.code === 0 && data.data) {
          return data.data
        }
      }
    } catch (error) {
      console.error("获取模板详情失败:", error)
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
          setTokensConfigured(false)
          toast({
            title: "认证失败",
            description: "管理后台令牌已过期，请重新配置令牌",
            variant: "destructive",
          })
          return
        }
        
        if (data.code !== 0) {
          throw new Error(data.msg || "发送失败")
        }
        
        const outId = data.data ? String(data.data) : `${Date.now()}` // Convert to string for consistency

        // Save to database
        try {
          await fetch('/api/sms-records', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              out_id: outId,
              phone_number: phoneNumber,
              template_code: selectedTemplate?.code,
              template_params: templateParams,
              content: selectedTemplate?.content,
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
        setAutoRefresh(true)

        toast({
          title: "成功",
          description: `短信发送成功，OutId: ${outId}`,
        })
      } else if (response.status === 401) {
        // If still 401 after refresh attempt
        setTokensConfigured(false)
        toast({
          title: "认证失败",
          description: "管理后台令牌已过期，请重新配置令牌",
          variant: "destructive",
        })
      } else {
        throw new Error("发送失败")
      }
    } catch (error) {
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
  const checkSmsStatus = async (outId: string) => {
    try {
      if (!phoneNumber.trim()) {
        console.error("手机号码未配置")
        return null
      }

      console.log('Sending request with:', {
        outId,
        phoneNumber: phoneNumber
      })

      const response = await fetch('/api/sms-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          outId,
          phoneNumber: phoneNumber // 使用当前选择的手机号
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("API调用失败:", errorData)
        
        // Handle specific error cases
        if (response.status === 404) {
          console.warn(`短信记录未找到: OutId=${outId}`)
          return null
        }
        
        throw new Error(errorData.error || '未知错误')
      }

      const data = await response.json()
      return data

    } catch (error) {
      console.error("查询短信状态失败:", error)
      
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

  // Refresh SMS statuses
  const refreshStatuses = useCallback(async () => {
    if (smsStatuses.length === 0) return

    setIsRefreshing(true)

    const updatedStatuses = await Promise.all(
      smsStatuses.map(async (sms) => {
        if (sms.status === "已送达" || sms.status === "发送失败") {
          return sms // Don't update completed statuses
        }

        const statusUpdate = await checkSmsStatus(sms.outId)
        if (statusUpdate) {
          // Update database with new status
          try {
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
          } catch (dbError) {
            console.error('Failed to update SMS record in database:', dbError)
            // 不阻断用户流程，只记录错误
          }
          
          return { ...sms, ...statusUpdate }
        }
        return sms
      }),
    )

    setSmsStatuses(updatedStatuses)
    setIsRefreshing(false)
  }, [smsStatuses])

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      refreshStatuses()
    }, 3000)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshStatuses])

  // Stop auto-refresh when all messages are completed
  useEffect(() => {
    const allCompleted = smsStatuses.every((sms) => sms.status === "已送达" || sms.status === "发送失败")

    if (allCompleted && smsStatuses.length > 0) {
      setAutoRefresh(false)
    }
  }, [smsStatuses])

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "已送达":
        return "default"
      case "发送失败":
        return "destructive"
      case "发送中":
        return "secondary"
      default:
        return "outline"
    }
  }

  if (!tokensConfigured) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-md mx-auto pt-20">
          <Card>
            <CardHeader className="text-center">
              <Settings className="w-12 h-12 mx-auto mb-4 text-blue-600" />
              <CardTitle>短信测试工具配置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                <Label htmlFor="admin-token">管理后台令牌</Label>
                <div className="relative">
                  <Input
                    id="admin-token"
                    type={showAdminToken ? "text" : "password"}
                    placeholder="请输入管理后台API令牌"
                    value={adminToken}
                    onChange={(e) => setAdminToken(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowAdminToken(!showAdminToken)}
                  >
                    {showAdminToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="refresh-token">管理后台刷新令牌 (可选)</Label>
                <div className="relative">
                  <Input
                    id="refresh-token"
                    type={showRefreshToken ? "text" : "password"}
                    placeholder="请输入管理后台刷新令牌"
                    value={refreshToken}
                    onChange={(e) => setRefreshToken(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowRefreshToken(!showRefreshToken)}
                  >
                    {showRefreshToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  提供刷新令牌可以自动更新过期的访问令牌
                </p>
              </div>
              <Button onClick={saveTokens} className="w-full">
                保存配置
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">短信测试工具</h1>
          <Button
            variant="outline"
            onClick={() => {
              // Reset configuration state but keep token values for re-editing
              setTokensConfigured(false)
              setTemplates([])
              setSelectedTemplate(null)
              setSmsStatuses([])
              setAutoRefresh(false)
              
              toast({
                title: "重新配置",
                description: "请检查并更新令牌配置",
              })
            }}
          >
            <Settings className="w-4 h-4 mr-2" />
            重新配置
          </Button>
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
                  <Button variant="outline" onClick={fetchTemplates}>
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
                  <Input
                    placeholder="请输入手机号码"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="flex-1"
                  />
                  <Select onValueChange={setPhoneNumber}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="选择号码" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* 保存的号码 */}
                      {savedPhoneNumbers.length > 0 ? (
                        savedPhoneNumbers.map((phone) => (
                          <SelectItem key={phone.id} value={phone.number}>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {phone.carrier}
                              </Badge>
                              {phone.number}
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-2 py-1.5 text-xs text-gray-500">暂无保存的号码</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
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

            {/* Send Button */}
            <Button
              onClick={sendSms}
              disabled={!selectedTemplate || !phoneNumber.trim() || isSending}
              className="w-full"
              size="lg"
            >
              <Send className="w-4 h-4 mr-2" />
              {isSending ? "发送中..." : "发送短信"}
            </Button>
          </div>

          {/* Right Panel - Status Monitoring */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Clock className="w-5 h-5 mr-2" />
                    发送状态监控
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={refreshStatuses} disabled={isRefreshing}>
                      <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
                    </Button>
                    <Badge variant={autoRefresh ? "default" : "secondary"}>
                      {autoRefresh ? "自动刷新中" : "手动刷新"}
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {smsStatuses.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">暂无发送记录</div>
                ) : (
                  <div className="space-y-4">
                    {smsStatuses.map((sms) => (
                      <div key={sms.outId} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">OutId: {sms.outId}</span>
                          <Badge variant={getStatusBadgeVariant(sms.status)}>{sms.status}</Badge>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>手机号码: {sms.phoneNumber}</p>
                          <p>发送时间: {sms.sendDate}</p>
                          {sms.receiveDate && <p>送达时间: {sms.receiveDate}</p>}
                          {sms.errorCode && <p className="text-red-600">错误代码: {sms.errorCode}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Instructions */}
            <Alert>
              <AlertDescription>
                <strong>使用说明:</strong>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>• 系统每3秒自动刷新发送状态</li>
                  <li>• 可点击刷新按钮手动更新状态</li>
                  <li>• 令牌信息已本地保存，刷新页面不会丢失</li>
                  <li>• 支持多个短信同时监控状态</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        </div>
        
        {/* Phone Number Manager */}
        <div className="mt-6">
          <PhoneNumberManager onPhoneNumbersChange={loadSavedPhoneNumbers} />
        </div>
      </div>
    </div>
  )
}
