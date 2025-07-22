"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RefreshCw, Send, Settings, Phone, MessageSquare, Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

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

const commonTestNumbers = ["13800138000", "13900139000", "15000150000", "18000180000"]

export default function SmsTestingTool() {
  const { toast } = useToast()

  // Token management
  const [adminToken, setAdminToken] = useState("")
  const [aliyunToken, setAliyunToken] = useState("")
  const [tokensConfigured, setTokensConfigured] = useState(false)

  // SMS template management
  const [templates, setTemplates] = useState<SmsTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<SmsTemplate | null>(null)
  const [templateParams, setTemplateParams] = useState<Record<string, string>>({})

  // Phone number and sending
  const [phoneNumber, setPhoneNumber] = useState("")
  const [isSending, setIsSending] = useState(false)

  // Status monitoring
  const [smsStatuses, setSmsStatuses] = useState<SmsStatus[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)

  // Load tokens from localStorage on mount
  useEffect(() => {
    const savedAdminToken = localStorage.getItem("sms-admin-token")
    const savedAliyunToken = localStorage.getItem("sms-aliyun-token")

    if (savedAdminToken) setAdminToken(savedAdminToken)
    if (savedAliyunToken) setAliyunToken(savedAliyunToken)

    if (savedAdminToken && savedAliyunToken) {
      setTokensConfigured(true)
    }
  }, [])

  // Save tokens to localStorage
  const saveTokens = () => {
    if (!adminToken.trim() || !aliyunToken.trim()) {
      toast({
        title: "错误",
        description: "请填写完整的令牌信息",
        variant: "destructive",
      })
      return
    }

    localStorage.setItem("sms-admin-token", adminToken)
    localStorage.setItem("sms-aliyun-token", aliyunToken)
    setTokensConfigured(true)

    toast({
      title: "成功",
      description: "令牌配置已保存",
    })

    // Load templates after tokens are configured
    fetchTemplates()
  }

  // Fetch SMS templates
  const fetchTemplates = async () => {
    try {
      const response = await fetch("/admin-api/system/sms-template/page", {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        setTemplates(data.data || [])
        toast({
          title: "成功",
          description: `已加载 ${data.data?.length || 0} 个短信模板`,
        })
      } else {
        throw new Error("获取模板失败")
      }
    } catch (error) {
      toast({
        title: "错误",
        description: "获取短信模板失败，请检查令牌是否正确",
        variant: "destructive",
      })
    }
  }

  // Get template details
  const getTemplateDetails = async (templateId: string) => {
    try {
      const response = await fetch(`/admin-api/system/sms-template/get?id=${templateId}`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        return data.data
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

      // Initialize template parameters with default values
      const defaultParams: Record<string, string> = {}
      details.params?.forEach((param: string, index: number) => {
        defaultParams[param] = `测试值${index + 1}`
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
      const response = await fetch("/admin-api/system/sms-template/send-sms", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          phoneNumber: phoneNumber,
          templateParams: templateParams,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const outId = data.data?.outId || `${Date.now()}`

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

  // Check SMS status (mock implementation - replace with actual Aliyun API)
  const checkSmsStatus = async (outId: string) => {
    try {
      // This is a mock implementation
      // Replace with actual Aliyun SMS status API call
      const mockStatuses = ["发送中", "已送达", "发送失败"]
      const randomStatus = mockStatuses[Math.floor(Math.random() * mockStatuses.length)]

      return {
        status: randomStatus,
        errorCode: randomStatus === "发送失败" ? "MOBILE_NUMBER_ILLEGAL" : undefined,
        receiveDate: randomStatus === "已送达" ? new Date().toLocaleString("zh-CN") : undefined,
      }
    } catch (error) {
      console.error("查询状态失败:", error)
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
              <div>
                <Label htmlFor="admin-token">管理后台令牌</Label>
                <Input
                  id="admin-token"
                  type="password"
                  placeholder="请输入管理后台API令牌"
                  value={adminToken}
                  onChange={(e) => setAdminToken(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="aliyun-token">阿里云控制台令牌</Label>
                <Input
                  id="aliyun-token"
                  type="password"
                  placeholder="请输入阿里云控制台令牌"
                  value={aliyunToken}
                  onChange={(e) => setAliyunToken(e.target.value)}
                />
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
              setTokensConfigured(false)
              setTemplates([])
              setSelectedTemplate(null)
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
                      <SelectValue placeholder="测试号码" />
                    </SelectTrigger>
                    <SelectContent>
                      {commonTestNumbers.map((number) => (
                        <SelectItem key={number} value={number}>
                          {number}
                        </SelectItem>
                      ))}
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
                    {smsStatuses.map((sms, index) => (
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
      </div>
    </div>
  )
}
