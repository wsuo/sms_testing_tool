"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, RefreshCw, Search, Filter, Download, BarChart3, TrendingUp, Clock, CheckCircle, XCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

interface SmsRecord {
  id: number
  out_id: string
  phone_number: string
  template_code?: string
  content?: string
  send_date?: string
  receive_date?: string
  status: string
  error_code?: string
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
}

export default function SmsMonitorPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  const [records, setRecords] = useState<SmsRecord[]>([])
  const [filteredRecords, setFilteredRecords] = useState<SmsRecord[]>([])
  const [stats, setStats] = useState<Stats>({
    total: 0,
    success: 0,
    failed: 0,
    pending: 0,
    todayTotal: 0,
    successRate: 0
  })
  
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 20

  // Load SMS records
  const loadRecords = useCallback(async (page = 1) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/sms-records?limit=${itemsPerPage * 10}&offset=0`)
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setRecords(result.data)
          calculateStats(result.data)
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
  }, [toast, itemsPerPage])

  // Calculate statistics
  const calculateStats = (data: SmsRecord[]) => {
    const today = new Date().toDateString()
    const todayRecords = data.filter(record => 
      new Date(record.created_at).toDateString() === today
    )
    
    const total = data.length
    const success = data.filter(r => r.status === "已送达").length
    const failed = data.filter(r => r.status === "发送失败").length
    const pending = data.filter(r => r.status === "发送中").length
    const todayTotal = todayRecords.length
    const successRate = total > 0 ? (success / total * 100) : 0

    setStats({
      total,
      success,
      failed,
      pending,
      todayTotal,
      successRate: Number(successRate.toFixed(1))
    })
  }

  // Filter records
  useEffect(() => {
    let filtered = [...records]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(record => 
        record.phone_number.includes(searchTerm) ||
        record.out_id.includes(searchTerm) ||
        (record.content && record.content.includes(searchTerm))
      )
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(record => record.status === statusFilter)
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date()
      const filterDate = new Date()
      
      switch (dateFilter) {
        case "today":
          filterDate.setHours(0, 0, 0, 0)
          break
        case "week":
          filterDate.setDate(now.getDate() - 7)
          break
        case "month":
          filterDate.setMonth(now.getMonth() - 1)
          break
      }
      
      filtered = filtered.filter(record => 
        new Date(record.created_at) >= filterDate
      )
    }

    setFilteredRecords(filtered)
    setTotalPages(Math.ceil(filtered.length / itemsPerPage))
    setCurrentPage(1)
  }, [records, searchTerm, statusFilter, dateFilter, itemsPerPage])

  // Get paginated records
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "已送达":
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case "发送失败":
        return <XCircle className="w-4 h-4 text-red-500" />
      case "发送中":
        return <Clock className="w-4 h-4 text-yellow-500" />
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
      ...filteredRecords.map(record => [
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
              <p className="text-gray-600 mt-1">实时监控短信发送状态和统计数据</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => loadRecords()}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              刷新
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

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>筛选条件</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="按时间筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部时间</SelectItem>
                  <SelectItem value="today">今天</SelectItem>
                  <SelectItem value="week">最近7天</SelectItem>
                  <SelectItem value="month">最近30天</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center text-sm text-gray-600">
                <Filter className="w-4 h-4 mr-2" />
                显示 {filteredRecords.length} 条记录
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Records Table */}
        <Card>
          <CardHeader>
            <CardTitle>发送记录</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                <p className="text-gray-500 mt-2">加载中...</p>
              </div>
            ) : paginatedRecords.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                暂无符合条件的记录
              </div>
            ) : (
              <div className="space-y-3">
                {paginatedRecords.map((record) => (
                  <div key={record.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(record.status)}
                        <div>
                          <div className="font-medium">OutId: {record.out_id}</div>
                          <div className="text-sm text-gray-600">手机号: {record.phone_number}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusBadgeVariant(record.status)}>
                          {record.status}
                        </Badge>
                        {record.template_code && (
                          <Badge variant="outline" className="text-xs">
                            {record.template_code}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>发送时间: {formatDate(record.send_date || record.created_at)}</p>
                      {record.receive_date && (
                        <p>送达时间: {formatDate(record.receive_date)}</p>
                      )}
                      {record.error_code && record.error_code !== "DELIVERED" && (
                        <p className="text-red-600">错误代码: {record.error_code}</p>
                      )}
                      {record.content && (
                        <p className="text-xs bg-gray-100 p-2 rounded mt-2">
                          内容: {record.content}
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