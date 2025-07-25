"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, RefreshCw, Search, Filter, Download, BarChart3, TrendingUp, Clock, CheckCircle, XCircle, Trash2, MessageSquare, RotateCcw, BarChart } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import smsMonitorService, { SmsStatusUpdate } from "@/lib/sms-monitor-service"

interface SmsRecord {
  id: number
  out_id: string
  phone_number: string
  carrier?: string
  phone_note?: string
  template_code?: string
  template_name?: string  // 添加模板名称字段
  template_params?: string // 添加模板参数字段
  content?: string
  send_date?: string
  receive_date?: string
  status: string
  error_code?: string
  retry_count?: number  // 重试次数
  last_retry_at?: string  // 最后重试时间
  created_at: string
  updated_at?: string
}

interface Stats {
  total: number
  success: number
  failed: number
  pending: number
  todayTotal: number
  successRate: number
  carrierStats: Record<string, {
    total: number
    success: number
    failed: number
    successRate: number
  }>
  templateStats: Record<string, {
    total: number
    success: number
    failed: number
    successRate: number
  }>
}

export default function SmsMonitorPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  const [records, setRecords] = useState<SmsRecord[]>([])
  const [stats, setStats] = useState<Stats>({
    total: 0,
    success: 0,
    failed: 0,
    pending: 0,
    todayTotal: 0,
    successRate: 0,
    carrierStats: {},
    templateStats: {}
  })
  
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [carrierFilter, setCarrierFilter] = useState("all")
  const [templateFilter, setTemplateFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)
  const itemsPerPage = 20

  // Resend functionality
  const [resendingOutIds, setResendingOutIds] = useState<Set<string>>(new Set())

  // Load SMS records
  const loadRecords = useCallback(async (page = 1, triggerCheck = false) => {
    setIsLoading(true)
    try {
      // 如果是手动刷新，先触发后台服务检查
      if (triggerCheck) {
        await smsMonitorService.triggerManualCheck()
      }
      
      const offset = (page - 1) * itemsPerPage
      
      // 构建查询参数
      const queryParams = new URLSearchParams({
        limit: itemsPerPage.toString(),
        offset: offset.toString()
      })
      
      // 添加筛选条件到查询参数
      if (searchTerm && searchTerm.trim()) {
        queryParams.append('searchTerm', searchTerm.trim())
      }
      if (statusFilter && statusFilter !== 'all') {
        queryParams.append('statusFilter', statusFilter)
      }
      if (carrierFilter && carrierFilter !== 'all') {
        queryParams.append('carrierFilter', carrierFilter)
      }
      if (templateFilter && templateFilter !== 'all') {
        queryParams.append('templateFilter', templateFilter)
      }
      if (dateFilter && dateFilter !== 'all') {
        queryParams.append('dateFilter', dateFilter)
      }
      
      const response = await fetch(`/api/sms-records?${queryParams.toString()}`)
      
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setRecords(result.data)
          setTotalRecords(result.total)
          setTotalPages(result.totalPages)
          setCurrentPage(result.currentPage)
          
          // 获取所有记录用于统计信息（应用时间筛选条件）
          const allRecordsResponse = await fetch(`/api/sms-records?limit=10000&offset=0`)
          if (allRecordsResponse.ok) {
            const allRecordsResult = await allRecordsResponse.json()
            if (allRecordsResult.success && allRecordsResult.data) {
              calculateStats(allRecordsResult.data, dateFilter)
            }
          }
          
          // 如果是主动刷新且有发送中的记录，主动查询阿里云状态
          if (triggerCheck) {
            const pendingRecords = result.data.filter((record: SmsRecord) => 
              record.status === '发送中' || record.status === '发送中(已停止查询)'
            )
            
            if (pendingRecords.length > 0) {
              console.log(`发现 ${pendingRecords.length} 条发送中状态记录，主动查询阿里云状态`)
              
              // 并行查询所有发送中的SMS状态
              const statusPromises = pendingRecords.map(async (record: SmsRecord) => {
                try {
                  const statusUpdate = await checkSmsStatus(record.out_id, record.phone_number)
                  if (statusUpdate) {
                    // 更新数据库
                    await fetch('/api/sms-records', {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        out_id: record.out_id,
                        status: statusUpdate.status,
                        error_code: statusUpdate.errorCode,
                        receive_date: statusUpdate.receiveDate
                      })
                    })
                    
                    return {
                      outId: record.out_id,
                      updates: statusUpdate
                    }
                  }
                } catch (error) {
                  console.error(`查询SMS状态失败 (OutId: ${record.out_id}):`, error)
                }
                return null
              })
              
              const results = await Promise.all(statusPromises)
              const successCount = results.filter(result => result !== null).length
              
              if (successCount > 0) {
                // 重新加载当前页记录以获取更新后的状态（保持筛选条件）
                const updatedResponse = await fetch(`/api/sms-records?${queryParams.toString()}`)
                if (updatedResponse.ok) {
                  const updatedResult = await updatedResponse.json()
                  if (updatedResult.success && updatedResult.data) {
                    setRecords(updatedResult.data)
                  }
                }
                
                toast({
                  title: "刷新完成",
                  description: `已更新SMS状态，成功查询 ${successCount}/${pendingRecords.length} 条记录`,
                })
              } else {
                toast({
                  title: "刷新完成",
                  description: "未获取到新的状态更新，可能阿里云仍在处理中",
                  variant: "secondary",
                })
              }
            } else {
              toast({
                title: "刷新完成",
                description: "没有发送中的记录需要查询",
              })
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to load SMS records:', error)
      toast({
        title: "加载失败",
        description: "无法加载短信记录",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast, itemsPerPage, searchTerm, statusFilter, carrierFilter, templateFilter, dateFilter])

  // 查询阿里云SMS状态
  const checkSmsStatus = async (outId: string, phoneNumber: string) => {
    try {
      if (!phoneNumber) {
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
          phoneNumber
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
      return null
    }
  }

  // Calculate statistics with time filter
  const calculateStats = (allData: SmsRecord[], timeFilter: string = 'all') => {
    // Filter data based on time filter
    const getTimeFilteredData = (data: SmsRecord[], filter: string) => {
      if (filter === 'all') return data
      
      const now = new Date()
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      
      switch (filter) {
        case 'today':
          return data.filter(record => 
            new Date(record.created_at) >= startOfToday
          )
        case '2days':
          const twoDaysAgo = new Date(startOfToday)
          twoDaysAgo.setDate(twoDaysAgo.getDate() - 1)
          return data.filter(record => 
            new Date(record.created_at) >= twoDaysAgo
          )
        case 'week':
          const weekAgo = new Date(startOfToday)
          weekAgo.setDate(weekAgo.getDate() - 6)
          return data.filter(record => 
            new Date(record.created_at) >= weekAgo
          )
        case 'month':
          const monthAgo = new Date(startOfToday)
          monthAgo.setDate(monthAgo.getDate() - 29)
          return data.filter(record => 
            new Date(record.created_at) >= monthAgo
          )
        default:
          return data
      }
    }
    
    // Get filtered data for statistics
    const filteredData = getTimeFilteredData(allData, timeFilter)
    
    // Calculate today's records (always from today regardless of filter)
    const today = new Date().toDateString()
    const todayRecords = allData.filter(record => 
      new Date(record.created_at).toDateString() === today
    )
    
    const total = filteredData.length
    const success = filteredData.filter(r => r.status === "已送达").length
    const failed = filteredData.filter(r => r.status === "发送失败").length
    const pending = filteredData.filter(r => r.status === "发送中" || r.status === "发送中(已停止查询)").length
    const todayTotal = todayRecords.length
    const successRate = total > 0 ? (success / total * 100) : 0

    // Calculate carrier statistics based on filtered data
    const carrierStats: Record<string, {total: number, success: number, failed: number, successRate: number}> = {}
    filteredData.forEach(record => {
      const carrier = record.carrier || '未知运营商'
      if (!carrierStats[carrier]) {
        carrierStats[carrier] = { total: 0, success: 0, failed: 0, successRate: 0 }
      }
      carrierStats[carrier].total++
      if (record.status === '已送达') carrierStats[carrier].success++
      if (record.status === '发送失败') carrierStats[carrier].failed++
    })
    
    // Calculate success rates for carriers
    Object.keys(carrierStats).forEach(carrier => {
      const stats = carrierStats[carrier]
      stats.successRate = stats.total > 0 ? (stats.success / stats.total * 100) : 0
    })

    // Calculate template statistics based on filtered data
    const templateStats: Record<string, {total: number, success: number, failed: number, successRate: number}> = {}
    filteredData.forEach(record => {
      const template = record.template_name || '未知模板'
      if (!templateStats[template]) {
        templateStats[template] = { total: 0, success: 0, failed: 0, successRate: 0 }
      }
      templateStats[template].total++
      if (record.status === '已送达') templateStats[template].success++
      if (record.status === '发送失败') templateStats[template].failed++
    })
    
    // Calculate success rates for templates
    Object.keys(templateStats).forEach(template => {
      const stats = templateStats[template]
      stats.successRate = stats.total > 0 ? (stats.success / stats.total * 100) : 0
    })

    setStats({
      total,
      success,
      failed,
      pending,
      todayTotal,
      successRate: Number(successRate.toFixed(1)),
      carrierStats,
      templateStats
    })
  }

  // Filter records - 暂时保留客户端筛选，后续可优化为服务端筛选
  useEffect(() => {
    // 当筛选条件改变时重置到第一页并重新加载数据
    if (currentPage !== 1) {
      setCurrentPage(1)
      loadRecords(1)
    } else {
      loadRecords(currentPage)
    }
  }, [searchTerm, statusFilter, carrierFilter, templateFilter, dateFilter, loadRecords])

  // 当页码改变时加载对应页面数据
  useEffect(() => {
    loadRecords(currentPage)
  }, [currentPage, loadRecords])

  // Get unique carriers and templates for filter options
  const getFilterOptions = () => {
    const carriers = [...new Set(records.filter(r => r.carrier).map(r => r.carrier!))]
    const templates = [...new Set(records.filter(r => r.template_name).map(r => r.template_name!))]
    return { carriers, templates }
  }

  const { carriers, templates } = getFilterOptions()

  // 渲染SMS内容，替换占位符为真实数据
  const renderSmsContent = (content?: string, templateParams?: string) => {
    if (!content || !templateParams) return content || ''
    
    try {
      const params = JSON.parse(templateParams)
      let renderedContent = content
      
      // 替换所有 ${paramName} 格式的占位符
      Object.keys(params).forEach(key => {
        const placeholder = `\${${key}}`
        renderedContent = renderedContent.replaceAll(placeholder, params[key] || key)
      })
      
      return renderedContent
    } catch (error) {
      // 如果JSON解析失败，返回原内容
      console.error('Failed to parse template params:', error)
      return content
    }
  }

  useEffect(() => {
    loadRecords()
    
    // 设置SMS状态更新监听器
    const unsubscribe = smsMonitorService.onStatusUpdate((updates: SmsStatusUpdate[]) => {
      // 当后台服务更新状态时，重新加载记录以获取最新数据
      loadRecords()
    })
    
    // 清理函数
    return () => {
      unsubscribe()
    }
  }, [loadRecords])

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "已送达":
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case "发送失败":
        return <XCircle className="w-4 h-4 text-red-500" />
      case "发送中":
        return <Clock className="w-4 h-4 text-yellow-500" />
      case "发送中(已停止查询)":
        return <Clock className="w-4 h-4 text-gray-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN')
  }

  const exportData = () => {
    const csvContent = [
      ["发送ID", "手机号", "状态", "发送时间", "送达时间", "错误代码"].join(","),
      ...records.map(record => [
        record.out_id,
        record.phone_number,
        record.status,
        record.send_date || record.created_at,
        record.receive_date || "",
        record.error_code || ""
      ].join(","))
    ].join("\\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `sms_records_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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

  const deleteSmsRecord = async (recordId: number) => {
    if (!confirm('确定要删除这条SMS记录吗？此操作不可逆。')) {
      return
    }

    try {
      const response = await fetch(`/api/sms-records?id=${recordId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (response.ok && result.success) {
        // 从列表中移除已删除的记录
        setRecords(prev => prev.filter(record => record.id !== recordId))
        
        toast({
          title: "删除成功",
          description: "SMS记录已删除",
        })
        
        // 重新加载当前页以更新分页信息
        loadRecords(currentPage)
      } else {
        throw new Error(result.error || '删除失败')
      }
    } catch (error) {
      console.error('Failed to delete SMS record:', error)
      toast({
        title: "删除失败",
        description: error instanceof Error ? error.message : "无法删除SMS记录",
        variant: "destructive",
      })
    }
  }

  // 重发SMS
  const resendSms = async (outId: string) => {
    // 检查是否正在重发
    if (resendingOutIds.has(outId)) {
      return
    }

    // 获取管理后台令牌
    const adminToken = localStorage.getItem("sms-admin-token")
    if (!adminToken) {
      toast({
        title: "重发失败",
        description: "未找到管理后台令牌，请在主页面配置",
        variant: "destructive",
      })
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

        // 添加新记录到后台监控服务
        if (result.data.new_record) {
          smsMonitorService.addSmsForMonitoring(
            result.data.new_out_id, 
            result.data.new_record.phone_number.trim(), 
            1
          )
        }

        // 重新加载当前页记录
        await loadRecords(currentPage)

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

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回主页
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">短信发送监控</h1>
              <p className="text-gray-600 mt-1">实时监控短信发送状态和统计数据 (后台自动更新)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* 全局时间筛选 */}
            <div className="flex items-center gap-2 mr-4">
              <label className="text-sm font-medium text-gray-700">统计时间范围:</label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="时间范围" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部时间</SelectItem>
                  <SelectItem value="today">今天</SelectItem>
                  <SelectItem value="2days">最近2天</SelectItem>
                  <SelectItem value="week">最近7天</SelectItem>
                  <SelectItem value="month">最近30天</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Link href="/analytics">
              <Button variant="outline" size="sm">
                <BarChart className="w-4 h-4 mr-2" />
                数据分析
              </Button>
            </Link>
            <Button 
              variant="outline" 
              onClick={() => loadRecords(1, true)}
              disabled={isLoading}
              title="刷新记录并主动查询阿里云最新状态"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? "查询中..." : "强制刷新"}
            </Button>
            <Button variant="outline" onClick={exportData}>
              <Download className="w-4 h-4 mr-2" />
              导出
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <BarChart3 className="w-8 h-8 text-blue-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">总发送量</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <CheckCircle className="w-8 h-8 text-green-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">成功送达</p>
                  <p className="text-2xl font-bold text-green-600">{stats.success}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <XCircle className="w-8 h-8 text-red-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">发送失败</p>
                  <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Clock className="w-8 h-8 text-yellow-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">发送中</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <TrendingUp className="w-8 h-8 text-purple-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">今日发送</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.todayTotal}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <BarChart3 className="w-8 h-8 text-indigo-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">成功率</p>
                  <p className="text-2xl font-bold text-indigo-600">{stats.successRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Carrier Statistics */}
        {Object.keys(stats.carrierStats).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                运营商统计
                {dateFilter !== 'all' && (
                  <Badge variant="outline" className="text-xs">
                    {dateFilter === 'today' ? '今天' : 
                     dateFilter === '2days' ? '最近2天' :
                     dateFilter === 'week' ? '最近7天' : 
                     dateFilter === 'month' ? '最近30天' : '筛选中'}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(stats.carrierStats).map(([carrier, carrierStats]) => (
                  <div key={carrier} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{carrier}</h4>
                      <Badge variant="outline" className="text-xs">
                        {carrierStats.successRate.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">总计:</span>
                        <span className="font-medium">{carrierStats.total}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-600">成功:</span>
                        <span className="font-medium text-green-600">{carrierStats.success}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-red-600">失败:</span>
                        <span className="font-medium text-red-600">{carrierStats.failed}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Template Statistics */}
        {Object.keys(stats.templateStats).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                模板统计
                {dateFilter !== 'all' && (
                  <Badge variant="outline" className="text-xs">
                    {dateFilter === 'today' ? '今天' : 
                     dateFilter === '2days' ? '最近2天' :
                     dateFilter === 'week' ? '最近7天' : 
                     dateFilter === 'month' ? '最近30天' : '筛选中'}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(stats.templateStats).map(([template, templateStats]) => (
                  <div key={template} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900 truncate" title={template}>
                        {template}
                      </h4>
                      <Badge variant="outline" className="text-xs">
                        {templateStats.successRate.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">总计:</span>
                        <span className="font-medium">{templateStats.total}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-600">成功:</span>
                        <span className="font-medium text-green-600">{templateStats.success}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-red-600">失败:</span>
                        <span className="font-medium text-red-600">{templateStats.failed}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Records Table */}
        <Card>
          <CardHeader>
            <CardTitle>发送记录</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">筛选条件</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="搜索手机号或OutId..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="按状态筛选" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    <SelectItem value="已送达">已送达</SelectItem>
                    <SelectItem value="发送失败">发送失败</SelectItem>
                    <SelectItem value="发送中">发送中</SelectItem>
                    <SelectItem value="发送中(已停止查询)">发送中(已停止查询)</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={carrierFilter} onValueChange={setCarrierFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="按运营商筛选" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部运营商</SelectItem>
                    {carriers.map(carrier => (
                      <SelectItem key={carrier} value={carrier}>{carrier}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={templateFilter} onValueChange={setTemplateFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="按模板筛选" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部模板</SelectItem>
                    {templates.map(template => (
                      <SelectItem key={template} value={template}>{template}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="flex items-center text-sm text-gray-600">
                  <Filter className="w-4 h-4 mr-2" />
                  显示第 {currentPage} 页，共 {totalPages} 页 (总计 {totalRecords} 条记录)
                </div>
                {dateFilter !== 'all' && (
                  <Badge variant="outline" className="text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    {dateFilter === 'today' ? '今天' : 
                     dateFilter === '2days' ? '最近2天' :
                     dateFilter === 'week' ? '最近7天' : 
                     dateFilter === 'month' ? '最近30天' : '筛选中'} 的数据
                  </Badge>
                )}
              </div>
            </div>
            {isLoading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                <p className="text-gray-500 mt-2">加载中...</p>
              </div>
            ) : records.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                暂无符合条件的记录
              </div>
            ) : (
              <div className="space-y-3">
                {records.map((record) => (
                  <div key={record.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(record.status)}
                        <div>
                          <div className="font-medium">OutId: {record.out_id}</div>
                          <div className="text-sm text-gray-600 flex items-center gap-2">
                            <span>手机号: {record.phone_number}</span>
                            {record.carrier && (
                              <Badge variant="secondary" className="text-xs px-2 py-0.5">
                                {record.carrier}
                              </Badge>
                            )}
                          </div>
                          {record.phone_note && (
                            <div className="text-xs text-gray-500 mt-1">
                              备注: {record.phone_note}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusBadgeVariant(record.status)}>
                          {record.status}
                        </Badge>
                        {record.template_name && (
                          <Badge variant="outline" className="text-xs">
                            {record.template_name}
                          </Badge>
                        )}
                        {canResend(record.status) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resendSms(record.out_id)}
                            disabled={resendingOutIds.has(record.out_id)}
                            className="ml-2"
                            title="重发短信"
                          >
                            <RotateCcw className={`w-4 h-4 ${resendingOutIds.has(record.out_id) ? 'animate-spin' : ''}`} />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteSmsRecord(record.id)}
                          className="ml-2"
                          title="删除记录"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>发送时间: {formatDate(record.send_date || record.created_at)}</p>
                      {record.retry_count && Number(record.retry_count) > 0 && (
                        <p className="text-orange-600 font-medium">
                          重发次数: {record.retry_count} 次
                          {record.last_retry_at && (
                            <span className="text-gray-500 font-normal ml-2">
                              (最后重发: {formatDate(record.last_retry_at)})
                            </span>
                          )}
                        </p>
                      )}
                      {record.receive_date && (
                        <p>送达时间: {formatDate(record.receive_date)}</p>
                      )}
                      {record.error_code && record.error_code !== "DELIVERED" && record.status === "发送失败" && (
                        <div className="bg-red-50 border border-red-200 rounded p-3 mt-2">
                          <p className="text-red-800 font-medium text-sm mb-1">
                            失败原因: {getErrorMessage(record.error_code)}
                          </p>
                          <p className="text-red-600 text-xs">
                            错误代码: {record.error_code}
                          </p>
                        </div>
                      )}
                      {record.content && (
                        <p className="text-xs bg-gray-100 p-2 rounded mt-2">
                          内容: {renderSmsContent(record.content, record.template_params)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-gray-600">
                  第 {currentPage} 页，共 {totalPages} 页
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    上一页
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    下一页
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}