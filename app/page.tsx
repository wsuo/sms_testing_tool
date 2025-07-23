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
import PhoneNumberManagerModal from "@/components/phone-number-manager-modal"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import Link from "next/link"

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
  
  // Carrier selection states
  const [selectedCarrier, setSelectedCarrier] = useState("")
  const [carrierPhoneNumbers, setCarrierPhoneNumbers] = useState<any[]>([])

  // Status monitoring
  const [smsStatuses, setSmsStatuses] = useState<SmsStatus[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)

  // Configuration modal
  const [showConfigModal, setShowConfigModal] = useState(false)

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

  // Handle carrier selection
  const handleCarrierSelect = (carrier: string) => {
    setSelectedCarrier(carrier)
    setPhoneNumber("") // 清空当前选择的手机号
    
    if (carrier && carrier !== "") {
      // 筛选该运营商的手机号码
      const filteredNumbers = savedPhoneNumbers.filter(phone => phone.carrier === carrier)
      setCarrierPhoneNumbers(filteredNumbers)
    } else {
      setCarrierPhoneNumbers([])
    }
  }

  // Get unique carriers from saved phone numbers
  const getUniqueCarriers = () => {
    const carriers = [...new Set(savedPhoneNumbers.map(phone => phone.carrier))]
    return carriers.filter(carrier => carrier) // 过滤掉空值
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
      setTokensConfigured(true)
      // Validate tokens by trying to fetch templates
      setTimeout(() => {
        fetchTemplates(savedAdminToken)
      }, 500)
    }
    if (savedRefreshToken) {
      setRefreshToken(savedRefreshToken)
    }
    
    // Load saved phone numbers
    loadSavedPhoneNumbers()
    
    // Load SMS history from database
    loadSmsHistory()
    
    // Restore user state
    restoreUserState()
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

  // 保存用户状态当状态变化时
  useEffect(() => {
    saveUserState()
  }, [phoneNumber, selectedCarrier, selectedTemplate, templateParams])

  // 当手机号码加载完成且有选择的运营商时，恢复级联选择状态
  useEffect(() => {
    if (savedPhoneNumbers.length > 0 && selectedCarrier) {
      const filteredNumbers = savedPhoneNumbers.filter(phone => phone.carrier === selectedCarrier)
      setCarrierPhoneNumbers(filteredNumbers)
    }
  }, [savedPhoneNumbers, selectedCarrier])

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
    setShowConfigModal(false) // 关闭模态框

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
          // If still 401 after refresh attempt, show config modal
          setShowConfigModal(true)
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
        // If still 401 after refresh attempt, show config modal
        setShowConfigModal(true)
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
          setShowConfigModal(true)
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
        setShowConfigModal(true)
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
  const checkSmsStatus = async (outId: string, smsPhoneNumber?: string) => {
    try {
      // 优先使用SMS记录的手机号，其次使用当前选择的手机号
      const phoneToUse = smsPhoneNumber || phoneNumber.trim()
      
      if (!phoneToUse) {
        console.error("手机号码未配置")
        return null
      }

      console.log('Sending request with:', {
        outId,
        phoneNumber: phoneToUse
      })

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

        // 检查数据库中的重试记录
        try {
          const dbResponse = await fetch(`/api/sms-records?out_id=${sms.outId}`)
          if (dbResponse.ok) {
            const dbResult = await dbResponse.json()
            const dbRecord = dbResult.data?.[0]
            
            // 如果重试次数已达到上限，跳过查询
            if (dbRecord && dbRecord.retry_count && dbRecord.retry_count >= 20) {
              console.log(`SMS ${sms.outId} 已达到重试上限，跳过查询 (重试次数: ${dbRecord.retry_count})`)
              
              // 如果还是发送中状态，添加说明
              if (sms.status === "发送中") {
                return { 
                  ...sms, 
                  status: "发送中(已停止查询)",
                  note: "已重试20次，交由用户手动刷新" 
                }
              }
              return sms
            }
            
            // 更新重试计数
            const newRetryCount = (dbRecord?.retry_count || 0) + 1
            await fetch('/api/sms-records', {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                out_id: sms.outId,
                retry_count: newRetryCount,
                last_retry_at: new Date().toISOString()
              })
            })
            
            console.log(`SMS ${sms.outId} 重试次数: ${newRetryCount}/20`)
          }
        } catch (dbError) {
          console.error('Failed to check retry count:', dbError)
        }

        const statusUpdate = await checkSmsStatus(sms.outId, sms.phoneNumber)
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
    const allCompleted = smsStatuses.every((sms) => 
      sms.status === "已送达" || 
      sms.status === "发送失败" || 
      sms.status === "发送中(已停止查询)"
    )

    if (allCompleted && smsStatuses.length > 0) {
      setAutoRefresh(false)
      console.log("所有SMS状态已完成或停止查询，停止自动刷新")
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

  // Configuration Modal Component
  const ConfigurationModal = () => (
    <Dialog open={showConfigModal} onOpenChange={setShowConfigModal}>
      <DialogContent className="max-w-md">
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
        </div>
      </DialogContent>
    </Dialog>
  )

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">短信测试工具</h1>
          <Button
            variant="outline"
            onClick={() => setShowConfigModal(true)}
          >
            <Settings className="w-4 h-4 mr-2" />
            配置Token
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
                  <Input
                    placeholder="请输入手机号码"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="flex-1"
                  />
                  <PhoneNumberManagerModal 
                    onPhoneNumbersChange={loadSavedPhoneNumbers}
                    onSelectNumber={setPhoneNumber}
                  />
                </div>
                
                {/* 运营商和号码级联选择 */}
                {savedPhoneNumbers.length > 0 && (
                  <div className="space-y-3">
                    <div className="text-sm text-gray-600">或从已保存的号码中选择：</div>
                    <div className="grid grid-cols-2 gap-2">
                      {/* 运营商选择 */}
                      <div>
                        <Label className="text-xs text-gray-500 mb-1 block">选择运营商</Label>
                        <div className="flex gap-1">
                          <Select value={selectedCarrier} onValueChange={handleCarrierSelect}>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="选择运营商" />
                            </SelectTrigger>
                            <SelectContent>
                              {getUniqueCarriers().map((carrier) => (
                                <SelectItem key={carrier} value={carrier}>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      {carrier}
                                    </Badge>
                                    <span className="text-xs text-gray-500">
                                      ({savedPhoneNumbers.filter(p => p.carrier === carrier).length}个)
                                    </span>
                                  </div>
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
                      <div>
                        <Label className="text-xs text-gray-500 mb-1 block">选择号码</Label>
                        <Select 
                          value={phoneNumber} 
                          onValueChange={setPhoneNumber}
                          disabled={!selectedCarrier}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder={selectedCarrier ? "选择号码" : "请先选择运营商"} />
                          </SelectTrigger>
                          <SelectContent>
                            {carrierPhoneNumbers.map((phone) => (
                              <SelectItem key={phone.id} value={phone.number}>
                                <div className="flex flex-col items-start py-1 max-w-full">
                                  <div className="flex items-center gap-2 max-w-full">
                                    <span className="font-medium truncate">{phone.number}</span>
                                    <Badge variant="outline" className="text-xs flex-shrink-0">
                                      {phone.carrier}
                                    </Badge>
                                  </div>
                                  {phone.note && (
                                    <div className="text-xs text-gray-500 mt-1 max-w-full truncate">
                                      备注: {phone.note}
                                    </div>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                            {carrierPhoneNumbers.length === 0 && selectedCarrier && (
                              <div className="px-2 py-1.5 text-xs text-gray-500">
                                该运营商暂无保存的号码
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    {/* 快速选择所有号码的选项 */}
                    {!selectedCarrier && (
                      <div>
                        <Label className="text-xs text-gray-500 mb-1 block">快速选择</Label>
                        <Select value={phoneNumber} onValueChange={setPhoneNumber}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="从所有号码中选择" />
                          </SelectTrigger>
                          <SelectContent>
                            {savedPhoneNumbers.map((phone) => (
                              <SelectItem key={phone.id} value={phone.number}>
                                <div className="flex flex-col items-start py-1 max-w-full">
                                  <div className="flex items-center gap-2 max-w-full">
                                    <span className="font-medium truncate">{phone.number}</span>
                                    <Badge variant="outline" className="text-xs flex-shrink-0">
                                      {phone.carrier}
                                    </Badge>
                                  </div>
                                  {phone.note && (
                                    <div className="text-xs text-gray-500 mt-1 max-w-full truncate">
                                      备注: {phone.note}
                                    </div>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                    实时状态
                  </div>
                  <div className="flex gap-2">
                    <Link href="/monitor">
                      <Button variant="outline" size="sm">
                        查看详情
                      </Button>
                    </Link>
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
                    {smsStatuses.slice(0, 3).map((sms) => (
                      <div key={sms.outId} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">OutId: {sms.outId}</span>
                          <Badge variant={getStatusBadgeVariant(sms.status)}>{sms.status}</Badge>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>手机号码: {sms.phoneNumber}</p>
                          <p>发送时间: {sms.sendDate}</p>
                          {sms.receiveDate && <p>送达时间: {sms.receiveDate}</p>}
                          {sms.errorCode && sms.errorCode !== "DELIVERED" && (
                            <div className="text-red-600">
                              <p className="font-medium">错误信息: {getErrorMessage(sms.errorCode)}</p>
                              <p className="text-xs text-gray-500 mt-1">错误代码: {sms.errorCode}</p>
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
                  <li>• 系统每3秒自动刷新发送状态</li>
                  <li>• 可点击"查看详情"查看完整的发送记录和统计</li>
                  <li>• 点击"管理号码"可添加和管理常用手机号</li>
                  <li>• 令牌信息已本地保存，刷新页面不会丢失</li>
                  <li>• 支持多个短信同时监控状态</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
      
      {/* Configuration Modal */}
      <ConfigurationModal />
    </div>
  )
}
