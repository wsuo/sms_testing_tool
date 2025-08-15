"use client"

import React, { useState, useRef } from "react"
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Download,
  Trash2,
  Eye,
  Save,
  Activity,
  History,
  RefreshCw,
  Database,
  AlertTriangle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { ModuleHeader } from "@/components/module-header"
import { WithAdminAuth } from "@/components/with-admin-auth"
import * as XLSX from 'xlsx'

interface CompanyData {
  company_id: number
  company_no?: string
  name: string
  name_en: string
  country?: string
  province?: string
  province_en?: string
  city?: string
  city_en?: string
  county?: string
  county_en?: string
  address?: string
  address_en?: string
  business_scope?: string
  business_scope_en?: string
  contact_person?: string
  contact_person_en?: string
  contact_person_title?: string
  contact_person_title_en?: string
  mobile?: string
  phone?: string
  email?: string
  intro?: string
  intro_en?: string
  whats_app?: string
  fax?: string
  postal_code?: string
  company_birth?: string | number
  is_verified?: number
  homepage?: string
}

interface ValidationError {
  row: number
  field: string
  message: string
}

interface ImportRecord {
  id: number
  import_date: string
  total_processed: number
  success_count: number
  error_count: number
  success_rate: number
  duration_seconds: number
  status: string
  notes?: string
  mysql_update_time?: string
  failed_count?: number
}

interface FailedCompany {
  id: number
  import_record_id: number
  company_data: CompanyData
  error_message: string
  retry_count: number
  created_at: string
}

export default function DataManagementPage() {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 所有状态变量
  const [file, setFile] = useState<File | null>(null)
  const [companyData, setCompanyData] = useState<CompanyData[]>([])
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importStatus, setImportStatus] = useState<'idle' | 'processing' | 'completed' | 'error'>('idle')
  const [importResults, setImportResults] = useState<{
    totalProcessed: number
    successCount: number
    errorCount: number
    errors: string[]
  } | null>(null)
  const [dbConnectionStatus, setDbConnectionStatus] = useState<{
    isConnected: boolean
    message: string
    tables?: { seller_company: number; seller_company_lang: number }
  } | null>(null)

  // 导出相关状态
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportType, setExportType] = useState<'sample' | 'custom' | 'all'>('sample')
  const [exportLimit, setExportLimit] = useState(100)
  const [totalRecords, setTotalRecords] = useState<number | null>(null)

  // 导入历史相关状态
  const [importHistory, setImportHistory] = useState<ImportRecord[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [failedCompanies, setFailedCompanies] = useState<FailedCompany[]>([])
  const [isLoadingFailed, setIsLoadingFailed] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)
  const [selectedImportId, setSelectedImportId] = useState<number | null>(null)
  
  // 全量更新相关状态
  const [showBulkUpdateDialog, setShowBulkUpdateDialog] = useState(false)
  const [isBulkUpdating, setIsBulkUpdating] = useState(false)
  const [bulkUpdateProgress, setBulkUpdateProgress] = useState(0)
  const [importStartTime, setImportStartTime] = useState<string | null>(null)
  
  // 导入配置
  const [batchSize, setBatchSize] = useState(20)
  
  // Tab控制
  const [activeTab, setActiveTab] = useState<string>("history")

  // 请求通知权限
  React.useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
    // 加载导入历史
    loadImportHistory()
  }, [])

  // 加载导入历史
  const loadImportHistory = async () => {
    setIsLoadingHistory(true)
    try {
      const response = await fetch('/api/import-history')
      if (response.ok) {
        const data = await response.json()
        console.log('导入历史API响应:', data) // 添加调试日志
        setImportHistory(data.data || []) // 修正字段名
      } else {
        console.error('导入历史API响应失败:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('加载导入历史失败:', error)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  // 加载失败数据
  const loadFailedCompanies = async (importRecordId?: number) => {
    setIsLoadingFailed(true)
    try {
      const url = importRecordId 
        ? `/api/failed-companies?import_record_id=${importRecordId}`
        : '/api/failed-companies'
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        console.log('失败数据API响应:', data) // 添加调试日志
        setFailedCompanies(data.data || []) // 修正字段名
      } else {
        console.error('失败数据API响应失败:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('加载失败数据失败:', error)
    } finally {
      setIsLoadingFailed(false)
    }
  }

  // 重试失败的数据
  const retryFailedCompanies = async (companyIds?: number[]) => {
    setIsRetrying(true)
    try {
      const response = await fetch('/api/retry-failed-companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_ids: companyIds
        })
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: "重试完成",
          description: `成功重试 ${result.retryCount} 条记录，成功 ${result.successCount} 条，失败 ${result.failedCount} 条`,
        })
        
        // 重新加载数据
        loadFailedCompanies(selectedImportId || undefined)
        loadImportHistory()
      } else {
        const error = await response.json()
        throw new Error(error.error || '重试失败')
      }
    } catch (error) {
      toast({
        title: "重试失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      })
    } finally {
      setIsRetrying(false)
    }
  }

  // 全量更新功能
  const handleBulkUpdate = async () => {
    if (!importStartTime) {
      toast({
        title: "无法执行全量更新",
        description: "未找到导入开始时间",
        variant: "destructive",
      })
      return
    }

    setIsBulkUpdating(true)
    setBulkUpdateProgress(0)
    
    try {
      toast({
        title: "开始全量更新",
        description: "正在清理旧数据，保留最新导入的数据...",
      })

      // 模拟进度更新
      const progressInterval = setInterval(() => {
        setBulkUpdateProgress(prev => Math.min(prev + 10, 90))
      }, 300)

      const response = await fetch('/api/bulk-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keep_update_time: importStartTime // 使用实际的导入开始时间
        })
      })

      clearInterval(progressInterval)
      setBulkUpdateProgress(100)

      if (response.ok) {
        const result = await response.json()
        toast({
          title: "全量更新完成",
          description: `已清理 ${result.deletedCount} 条旧数据，保留了最新导入的数据`,
        })
        
        // 重新加载数据
        loadImportHistory()
        testDatabaseConnection() // 刷新数据库统计
      } else {
        const error = await response.json()
        throw new Error(error.error || '全量更新失败')
      }
    } catch (error) {
      toast({
        title: "全量更新失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      })
    } finally {
      setIsBulkUpdating(false)
      setBulkUpdateProgress(0)
      setShowBulkUpdateDialog(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      processFile(selectedFile)
    }
  }

  const processFile = async (file: File) => {
    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

      if (jsonData.length < 2) {
        throw new Error('文件必须包含标题行和至少一行数据')
      }

      // 第一行是标题，从第二行开始是数据
      const rows = jsonData.slice(1).filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''))

      // 映射数据到CompanyData格式，确保所有字段都是字符串类型
      const mappedData: CompanyData[] = rows.map((row) => ({
        company_id: parseInt(String(row[0] || '0')) || 0,
        company_no: String(row[1] || ''),
        name: String(row[2] || ''),
        name_en: String(row[3] || ''),
        country: String(row[4] || ''),
        province: String(row[5] || ''),
        province_en: String(row[6] || ''),
        city: String(row[7] || ''),
        city_en: String(row[8] || ''),
        county: String(row[9] || ''),
        county_en: String(row[10] || ''),
        address: String(row[11] || ''),
        address_en: String(row[12] || ''),
        business_scope: String(row[13] || ''),
        business_scope_en: String(row[14] || ''),
        contact_person: String(row[15] || ''),
        contact_person_en: String(row[16] || ''),
        contact_person_title: String(row[17] || ''),
        contact_person_title_en: String(row[18] || ''),
        mobile: String(row[19] || ''),
        phone: String(row[20] || ''),
        email: String(row[21] || ''),
        intro: String(row[22] || ''),
        intro_en: String(row[23] || ''),
        whats_app: String(row[24] || ''),
        fax: String(row[25] || ''),
        postal_code: String(row[26] || ''),
        company_birth: String(row[27] || ''),
        is_verified: parseInt(String(row[28] || '0')) || 0,
        homepage: String(row[29] || '')
      }))

      // 验证数据
      const errors = validateCompanyData(mappedData)
      setValidationErrors(errors)
      setCompanyData(mappedData)

      if (errors.length === 0) {
        setImportStatus('completed')
        toast({
          title: "文件解析成功",
          description: `成功解析 ${mappedData.length} 条公司记录，可以开始导入`,
        })
        // 自动切换到数据预览tab
        setActiveTab('preview')
      } else {
        setImportStatus('error')
        toast({
          title: "数据验证失败",
          description: `发现 ${errors.length} 个验证错误，请修复后重新上传`,
          variant: "destructive",
        })
        // 如果有错误，切换到错误tab
        setActiveTab('errors')
      }
    } catch (error) {
      setImportStatus('error')
      toast({
        title: "文件处理失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      })
    }
  }

  const validateCompanyData = (data: CompanyData[]): ValidationError[] => {
    const errors: ValidationError[] = []

    data.forEach((company, index) => {
      const rowNumber = index + 2 // +2 because of header row and 0-based index

      if (!company.company_id || company.company_id <= 0) {
        errors.push({ row: rowNumber, field: 'company_id', message: '公司ID必须是有效的正整数' })
      }

      if (!company.name || !company.name.trim()) {
        errors.push({ row: rowNumber, field: 'name', message: '公司中文名称不能为空' })
      }

      if (!company.name_en || !company.name_en.trim()) {
        errors.push({ row: rowNumber, field: 'name_en', message: '公司英文名称不能为空' })
      }

      if (company.email && typeof company.email === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(company.email)) {
        errors.push({ row: rowNumber, field: 'email', message: '邮箱格式不正确' })
      }

      if (company.mobile && typeof company.mobile === 'string' && !/^1[3-9]\d{9}$/.test(company.mobile.replace(/\s|-/g, ''))) {
        errors.push({ row: rowNumber, field: 'mobile', message: '手机号格式不正确' })
      }

      if (company.homepage && typeof company.homepage === 'string' && company.homepage.trim() && !/^https?:\/\/.+/.test(company.homepage)) {
        errors.push({ row: rowNumber, field: 'homepage', message: '网站地址格式不正确，应以http://或https://开头' })
      }
    })

    return errors
  }

  const handleImport = async () => {
    if (validationErrors.length > 0) {
      toast({
        title: "无法导入",
        description: "请先修复所有验证错误",
        variant: "destructive",
      })
      return
    }

    if (companyData.length === 0) {
      toast({
        title: "无数据可导入",
        description: "请先选择并解析Excel文件",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    setImportProgress(0)
    setImportResults(null)
    setImportStatus('processing')
    
    // 记录导入开始时间 (UTC+8)
    const startTime = new Date()
    const utc8Time = new Date(startTime.getTime() + (8 * 60 * 60 * 1000))
    const importStartTimeStr = utc8Time.toISOString().slice(0, 19).replace('T', ' ')
    setImportStartTime(importStartTimeStr)

    try {
      toast({
        title: "开始导入",
        description: "正在导入数据到数据库，请稍候...",
      })

      console.log('开始导入，数据量:', companyData.length)

      // 先尝试流式响应，如果失败则降级到普通API
      try {
        // 直接使用POST请求，通过流式响应获取实时进度
        const response = await fetch('/api/supplier-import-progress', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            companies: companyData,
            batchSize: batchSize // 使用用户配置的批次大小
          })
        })

        console.log('流式API响应状态:', response.status, response.statusText)

        if (!response.ok) {
          const errorText = await response.text()
          console.error('流式API响应错误:', errorText)
          throw new Error(`流式API请求失败: ${response.status} ${response.statusText}`)
        }

        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        if (!reader) {
          throw new Error('无法获取响应流')
        }

        console.log('开始处理流式响应')

        const processStream = async () => {
          try {
            let hasReceivedData = false
            while (true) {
              const { done, value } = await reader.read()
              
              if (done) {
                console.log('流读取完成')
                if (!hasReceivedData) {
                  throw new Error('未收到任何进度数据')
                }
                break
              }

              const chunk = decoder.decode(value)
              console.log('收到数据块:', chunk)
              const lines = chunk.split('\n')
              
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  hasReceivedData = true
                  try {
                    const progressData = line.slice(6).trim()
                    if (progressData) {
                      const progress = JSON.parse(progressData)
                      console.log('解析进度数据:', progress)
                      
                      // 更新进度条
                      setImportProgress(progress.progress)
                      
                      // 如果完成，处理结果
                      if (progress.completed) {
                        const result = {
                          totalProcessed: progress.total,
                          successCount: progress.successCount,
                          errorCount: progress.errorCount,
                          errors: progress.errors
                        }
                        
                        setImportResults(result)
                        setImportStatus('completed')
                        
                        // 导入完成后自动切换到结果tab
                        setActiveTab('results')
                        
                        // 发送浏览器通知
                        if ('Notification' in window && Notification.permission === 'granted') {
                          new Notification('数据导入完成', {
                            body: `成功处理 ${progress.successCount} 条记录，失败 ${progress.errorCount} 条`,
                            icon: '/favicon.ico'
                          })
                        }
                        
                        // 显示完成提醒和统计
                        if (progress.errorCount > 0) {
                          toast({
                            title: "🎉 导入完成（部分失败）",
                            description: `✅ 成功：${progress.successCount} 条\n❌ 失败：${progress.errorCount} 条\n📊 总计：${progress.total} 条记录\n🎯 成功率：${Math.round((progress.successCount / progress.total) * 100)}%`,
                            variant: "destructive",
                            duration: 10000, // 10秒后自动消失
                          })
                        } else {
                          toast({
                            title: "🎉 导入完成！",
                            description: `✅ 成功处理 ${progress.successCount} 条记录\n🎯 成功率：100%\n⏱️ 导入已完成`,
                            duration: 10000, // 10秒后自动消失
                          })
                        }
                        
                        // 重新加载导入历史
                        loadImportHistory()
                        
                        return
                      }
                    }
                  } catch (error) {
                    console.error('解析进度数据失败:', error, '原始数据:', line)
                  }
                }
              }
            }
          } catch (error) {
            console.error('流处理错误:', error)
            throw error
          }
        }

        await processStream()

      } catch (streamError) {
        console.warn('流式API失败，降级到普通API:', streamError)
        
        // 降级到普通API
        toast({
          title: "切换到标准导入模式",
          description: "实时进度不可用，使用标准导入模式...",
        })

        const response = await fetch('/api/supplier-import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            companies: companyData
          })
        })

        // 模拟进度更新
        const progressInterval = setInterval(() => {
          setImportProgress(prev => Math.min(prev + 10, 90))
        }, 500)

        if (!response.ok) {
          clearInterval(progressInterval)
          const errorData = await response.json()
          throw new Error(errorData.error || '导入失败')
        }

        const result = await response.json()
        clearInterval(progressInterval)
        setImportProgress(100)
        
        setImportResults(result)
        setImportStatus('completed')
        
        // 导入完成后自动切换到结果tab
        setActiveTab('results')

        toast({
          title: "导入完成",
          description: `成功处理 ${result.totalProcessed} 条记录，成功 ${result.successCount} 条，失败 ${result.errorCount} 条`,
        })
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "未知错误"
      
      // 根据错误类型显示不同的提示
      let title = "导入失败"
      let description = errorMessage
      
      if (errorMessage.includes("字段长度限制") || errorMessage.includes("数据过长")) {
        title = "数据格式问题"
        description = `${errorMessage}\n\n建议：请检查Excel文件中的数据长度，或联系管理员调整数据库字段限制。`
      } else if (errorMessage.includes("数据重复") || errorMessage.includes("已存在")) {
        title = "数据重复"
        description = `${errorMessage}\n\n这通常是正常现象，系统会自动更新现有记录。`
      } else if (errorMessage.includes("数据库") || errorMessage.includes("连接")) {
        title = "数据库连接问题"
        description = `${errorMessage}\n\n建议：请检查数据库连接状态，或联系管理员。`
      }
      
      toast({
        title,
        description,
        variant: "destructive",
      })
      setImportStatus('error')
    } finally {
      setIsProcessing(false)
    }
  }



  const clearData = () => {
    setFile(null)
    setCompanyData([])
    setValidationErrors([])
    setImportStatus('idle')
    setImportProgress(0)
    setImportResults(null)
    setActiveTab('history') // 重置到历史tab
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const clearImportResults = () => {
    setImportResults(null)
    setFile(null)
    setCompanyData([])
    setValidationErrors([])
    setImportStatus('idle')
    setImportProgress(0)
    setActiveTab('history') // 重置到历史tab
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // 执行导出
  const executeExport = async (type: 'sample' | 'custom' | 'all', limit?: number) => {
    setIsExporting(true)
    setExportProgress(0)

    try {
      const typeNames = {
        sample: '示例数据',
        custom: '自定义数量',
        all: '全部数据'
      }

      toast({
        title: "开始导出",
        description: `正在导出${typeNames[type]}...`,
      })

      // 模拟进度更新
      const progressInterval = setInterval(() => {
        setExportProgress(prev => Math.min(prev + 10, 90))
      }, type === 'all' ? 500 : 200) // 全量导出进度更新慢一些

      // 构建请求URL
      const params = new URLSearchParams({
        format: 'excel',
        type: type
      })

      if (type === 'custom' && limit) {
        params.append('limit', limit.toString())
      }

      const response = await fetch(`/api/supplier-export?${params.toString()}`)

      clearInterval(progressInterval)
      setExportProgress(100)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '导出失败')
      }

      // 下载文件
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `companies_${type}_${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "导出成功",
        description: `${typeNames[type]}已成功导出到Excel文件`,
      })

    } catch (error) {
      toast({
        title: "导出失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
      setExportProgress(0)
    }
  }



  // 显示导出选项
  const handleShowExportOptions = async () => {
    try {
      // 获取数据库统计信息
      const response = await fetch('/api/supplier-export', { method: 'HEAD' })
      const totalCount = response.headers.get('X-Total-Count')
      if (totalCount) {
        setTotalRecords(parseInt(totalCount))
      }
    } catch (error) {
      console.error('Failed to get database stats:', error)
    }
    setShowExportModal(true)
  }

  // 确认导出
  const handleConfirmExport = () => {
    setShowExportModal(false)
    if (exportType === 'custom') {
      executeExport('custom', exportLimit)
    } else {
      executeExport(exportType)
    }
  }

  // 导出模板文件
  const handleExportTemplate = () => {
    // 创建模板数据
    const templateData = [{
      company_id: 1,
      company_no: "COMP001",
      name: "示例公司",
      name_en: "Example Company",
      country: "中国",
      province: "广东省",
      province_en: "Guangdong",
      city: "深圳市",
      city_en: "Shenzhen",
      county: "南山区",
      county_en: "Nanshan",
      address: "深圳市南山区科技园",
      address_en: "Science Park, Nanshan District, Shenzhen",
      business_scope: "软件开发",
      business_scope_en: "Software Development",
      contact_person: "张三",
      contact_person_en: "Zhang San",
      contact_person_title: "总经理",
      contact_person_title_en: "General Manager",
      mobile: "13800138000",
      phone: "0755-12345678",
      email: "contact@example.com",
      intro: "这是一个示例公司",
      intro_en: "This is an example company",
      whats_app: "+86-13800138000",
      fax: "0755-87654321",
      postal_code: "518000",
      company_birth: "2020",
      is_verified: 1,
      homepage: "https://www.example.com"
    }]

    // 使用浏览器的XLSX库创建Excel文件
    import('xlsx').then(XLSX => {
      const worksheet = XLSX.utils.json_to_sheet(templateData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Template')
      XLSX.writeFile(workbook, 'company_import_template.xlsx')

      toast({
        title: "模板下载成功",
        description: "导入模板已下载，请按照模板格式填写数据",
      })
    }).catch(() => {
      toast({
        title: "模板下载失败",
        description: "无法生成模板文件",
        variant: "destructive",
      })
    })
  }

  const testDatabaseConnection = async () => {
    try {
      toast({
        title: "正在测试连接",
        description: "请稍候...",
      })

      const response = await fetch('/api/test-mysql')

      if (!response.ok) {
        throw new Error(`HTTP错误: ${response.status}`)
      }

      const result = await response.json()

      setDbConnectionStatus({
        isConnected: result.success,
        message: result.message || result.error,
        tables: result.tables
      })

      if (result.success) {
        toast({
          title: "数据库连接成功",
          description: result.message,
        })
      } else {
        toast({
          title: "数据库连接失败",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      setDbConnectionStatus({
        isConnected: false,
        message: error instanceof Error ? error.message : "连接测试失败"
      })

      toast({
        title: "连接测试失败",
        description: error instanceof Error ? error.message : "无法测试数据库连接",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-100 to-gray-50 relative overflow-hidden">
      {/* 动态背景装饰 */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZGVmcz4KICAgIDxwYXR0ZXJuIGlkPSJhIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiPgogICAgICA8Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMSkiLz4KICAgIDwvcGF0dGVybj4KICA8L2RlZnM+CiAgPHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNhKSIvPgo8L3N2Zz4=')] opacity-30 pointer-events-none" />
      
      <ModuleHeader
        title="数据管理"
        description="企业数据导入导出管理系统"
        icon={Database}
        showAuthStatus={true}
      />
      
      <div className="pt-24 container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExportTemplate}>
              <FileText className="w-4 h-4 mr-2" />
              下载模板
            </Button>
            <Button variant="outline" onClick={handleShowExportOptions} disabled={isExporting}>
              <Download className="w-4 h-4 mr-2" />
              {isExporting ? '导出中...' : '导出数据'}
            </Button>
            <Button variant="outline" onClick={testDatabaseConnection}>
              <Activity className="w-4 h-4 mr-2" />
              测试数据库连接
            </Button>
          </div>
        </div>

        {/* Export Progress */}
        {isExporting && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>导出进度</span>
              <span>{exportProgress}%</span>
            </div>
            <Progress value={exportProgress} />
            <p className="text-xs text-muted-foreground">
              正在从数据库导出公司数据...
            </p>
          </div>
        )}

        {/* Database Connection Status */}
        {dbConnectionStatus && (
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${dbConnectionStatus.isConnected ? 'text-green-600' : 'text-red-600'}`}>
                {dbConnectionStatus.isConnected ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <AlertCircle className="h-5 w-5" />
                )}
                数据库连接状态
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className={dbConnectionStatus.isConnected ? 'text-green-600' : 'text-red-600'}>
                  {dbConnectionStatus.message}
                </p>
                {dbConnectionStatus.tables && (
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-lg font-bold text-blue-600">{dbConnectionStatus.tables.seller_company}</div>
                      <div className="text-sm text-blue-600">seller_company 记录数</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-lg font-bold text-green-600">{dbConnectionStatus.tables.seller_company_lang}</div>
                      <div className="text-sm text-green-600">seller_company_lang 记录数</div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* File Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              文件上传
            </CardTitle>
            <CardDescription>
              支持 Excel (.xlsx, .xls) 和 CSV 文件格式。请使用标准模板格式，确保字段顺序正确。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  选择文件
                </Button>
                {file && (
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{file.name}</span>
                    <Button variant="ghost" size="sm" onClick={clearData}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
              
              {importStatus === 'processing' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>数据导入进度</span>
                    <span>{importProgress}%</span>
                  </div>
                  <Progress value={importProgress} className="w-full" />
                  <p className="text-xs text-muted-foreground">
                    正在分批导入数据 (每批{batchSize}条记录)... 当前进度: {importProgress}%
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            {companyData.length > 0 && (
              <TabsTrigger value="preview" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                数据预览 ({companyData.length})
              </TabsTrigger>
            )}
            {validationErrors.length > 0 && (
              <TabsTrigger value="errors" className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                验证错误 ({validationErrors.length})
              </TabsTrigger>
            )}
            {importResults && (
              <TabsTrigger value="results" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                导入结果
              </TabsTrigger>
            )}
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              导入历史
            </TabsTrigger>
            <TabsTrigger value="failed" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              失败数据管理
            </TabsTrigger>
          </TabsList>

          {/* 导入历史标签页 */}
          <TabsContent value="history">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>导入历史</CardTitle>
                  <CardDescription>
                    查看历史导入记录和统计信息
                  </CardDescription>
                </div>
                <Button
                  onClick={loadImportHistory}
                  disabled={isLoadingHistory}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                  刷新
                </Button>
              </CardHeader>
              <CardContent>
                {isLoadingHistory ? (
                  <div className="text-center py-8">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-muted-foreground">加载导入历史...</p>
                  </div>
                ) : importHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <History className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">暂无导入历史记录</p>
                  </div>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>导入时间</TableHead>
                          <TableHead>总数</TableHead>
                          <TableHead>成功</TableHead>
                          <TableHead>失败</TableHead>
                          <TableHead>成功率</TableHead>
                          <TableHead>耗时</TableHead>
                          <TableHead>状态</TableHead>
                          <TableHead>操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importHistory.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell className="font-medium">
                              {new Date(record.import_date).toLocaleString()}
                            </TableCell>
                            <TableCell>{record.total_processed}</TableCell>
                            <TableCell className="text-green-600">{record.success_count}</TableCell>
                            <TableCell className="text-red-600">{record.error_count}</TableCell>
                            <TableCell>
                              <Badge variant={record.success_rate >= 90 ? 'default' : record.success_rate >= 70 ? 'secondary' : 'destructive'}>
                                {Math.round(record.success_rate)}%
                              </Badge>
                            </TableCell>
                            <TableCell>{record.duration_seconds}s</TableCell>
                            <TableCell>
                              <Badge variant={record.status === 'completed' ? 'default' : 'secondary'}>
                                {record.status === 'completed' ? '已完成' : record.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {record.error_count > 0 && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedImportId(record.id)
                                    loadFailedCompanies(record.id)
                                  }}
                                >
                                  查看失败数据
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 失败数据管理标签页 */}
          <TabsContent value="failed">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>失败数据管理</CardTitle>
                  <CardDescription>
                    管理导入失败的数据，支持重试功能
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => loadFailedCompanies()}
                    disabled={isLoadingFailed}
                    variant="outline"
                    size="sm"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingFailed ? 'animate-spin' : ''}`} />
                    刷新
                  </Button>
                  {failedCompanies.length > 0 && (
                    <Button
                      onClick={() => retryFailedCompanies()}
                      disabled={isRetrying}
                      className="bg-orange-600 hover:bg-orange-700"
                      size="sm"
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
                      {isRetrying ? '重试中...' : '重试全部'}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingFailed ? (
                  <div className="text-center py-8">
                    <div className="animate-spin w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-muted-foreground">加载失败数据...</p>
                  </div>
                ) : failedCompanies.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                    <p className="text-muted-foreground">暂无失败的数据记录</p>
                    <p className="text-sm text-muted-foreground mt-1">所有数据都已成功导入</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        共 {failedCompanies.length} 条失败记录
                        {selectedImportId && (
                          <span className="ml-2 text-blue-600">
                            (导入记录 #{selectedImportId})
                          </span>
                        )}
                      </p>
                      {selectedImportId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedImportId(null)
                            loadFailedCompanies()
                          }}
                        >
                          显示全部失败数据
                        </Button>
                      )}
                    </div>
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>公司名称</TableHead>
                            <TableHead>公司ID</TableHead>
                            <TableHead>失败原因</TableHead>
                            <TableHead>重试次数</TableHead>
                            <TableHead>失败时间</TableHead>
                            <TableHead>操作</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {failedCompanies.slice(0, 20).map((failedCompany) => (
                            <TableRow key={failedCompany.id}>
                              <TableCell className="font-medium">
                                {failedCompany.company_data.name}
                              </TableCell>
                              <TableCell>{failedCompany.company_data.company_id}</TableCell>
                              <TableCell className="max-w-xs truncate" title={failedCompany.error_message}>
                                {failedCompany.error_message}
                              </TableCell>
                              <TableCell>
                                <Badge variant={failedCompany.retry_count > 0 ? 'secondary' : 'outline'}>
                                  {failedCompany.retry_count}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {new Date(failedCompany.created_at).toLocaleString()}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => retryFailedCompanies([failedCompany.id])}
                                  disabled={isRetrying}
                                >
                                  <RefreshCw className={`w-3 h-3 mr-1 ${isRetrying ? 'animate-spin' : ''}`} />
                                  重试
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {failedCompanies.length > 20 && (
                      <p className="text-sm text-muted-foreground text-center">
                        显示前 20 条记录，共 {failedCompanies.length} 条失败记录
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {companyData.length > 0 && (
            <TabsContent value="preview">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>数据预览</CardTitle>
                    <CardDescription>
                      预览即将导入的公司数据
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={validationErrors.length === 0 ? "default" : "destructive"}>
                      {validationErrors.length === 0 ? (
                        <><CheckCircle className="h-3 w-3 mr-1" />验证通过</>
                      ) : (
                        <><AlertCircle className="h-3 w-3 mr-1" />{validationErrors.length} 个错误</>
                      )}
                    </Badge>
                    {!importResults && (
                      <WithAdminAuth actionName="批量导入供应商数据">
                        <Button
                          onClick={handleImport}
                          disabled={validationErrors.length > 0 || isProcessing || companyData.length === 0}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          {isProcessing ? '导入中...' : '开始导入'}
                        </Button>
                      </WithAdminAuth>
                    )}
                    {importResults && (
                      <Button
                        onClick={clearImportResults}
                        variant="outline"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        清除结果
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {/* 导入配置 - 只在有数据且准备导入时显示 */}
                  {companyData.length > 0 && !importResults && (
                    <div className="space-y-3 p-4 bg-gray-50 rounded-lg border mb-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="batch-size" className="text-sm font-medium">
                          导入配置
                        </Label>
                        <Badge variant="outline" className="text-xs">
                          影响导入速度和系统性能
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <Label htmlFor="batch-size" className="text-sm text-muted-foreground min-w-fit">
                          每批处理数量：
                        </Label>
                        <Select value={batchSize.toString()} onValueChange={(value) => setBatchSize(Number(value))}>
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10条</SelectItem>
                            <SelectItem value="20">20条</SelectItem>
                            <SelectItem value="50">50条</SelectItem>
                            <SelectItem value="100">100条</SelectItem>
                            <SelectItem value="200">200条</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p><strong>性能影响说明：</strong></p>
                        <ul className="space-y-1 ml-2">
                          <li>• <strong>10-20条</strong>：速度较慢，但对数据库压力最小，推荐服务器性能较低时使用</li>
                          <li>• <strong>50条</strong>：平衡选择，适合大多数情况</li>
                          <li>• <strong>100-200条</strong>：速度最快，但会增加数据库连接压力和内存使用</li>
                        </ul>
                      </div>
                    </div>
                  )}
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[80px]">公司ID</TableHead>
                          <TableHead className="min-w-[120px]">中文名称</TableHead>
                          <TableHead className="min-w-[120px]">英文名称</TableHead>
                          <TableHead className="w-[80px]">省份</TableHead>
                          <TableHead className="w-[80px]">城市</TableHead>
                          <TableHead className="w-[80px]">联系人</TableHead>
                          <TableHead className="w-[100px]">手机</TableHead>
                          <TableHead className="min-w-[120px]">邮箱</TableHead>
                          <TableHead className="w-[100px]">验证状态</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {companyData.slice(0, 10).map((company, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{company.company_id}</TableCell>
                            <TableCell>{company.name}</TableCell>
                            <TableCell>{company.name_en}</TableCell>
                            <TableCell>{company.province}</TableCell>
                            <TableCell>{company.city}</TableCell>
                            <TableCell>{company.contact_person}</TableCell>
                            <TableCell>{company.mobile}</TableCell>
                            <TableCell>{company.email}</TableCell>
                            <TableCell>
                              <Badge variant={company.is_verified ? 'default' : 'secondary'}>
                                {company.is_verified ? '已验证' : '未验证'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {companyData.length > 10 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      显示前 10 条记录，共 {companyData.length} 条记录
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            )}

            {validationErrors.length > 0 && (
              <TabsContent value="errors">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-destructive">验证错误</CardTitle>
                    <CardDescription>
                      请修复以下错误后重新上传文件
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {validationErrors.map((error, index) => (
                        <Alert key={index} variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            <strong>第 {error.row} 行，{error.field}：</strong> {error.message}
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {importResults && (
              <TabsContent value="results">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-green-600">导入结果</CardTitle>
                      <CardDescription>
                        数据导入操作已完成
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => setShowBulkUpdateDialog(true)}
                        disabled={isBulkUpdating}
                        className="bg-orange-600 hover:bg-orange-700"
                        size="sm"
                      >
                        <Database className="w-4 h-4 mr-2" />
                        {isBulkUpdating ? '更新中...' : '全量更新'}
                      </Button>
                      <Button
                        onClick={clearImportResults}
                        variant="outline"
                        size="sm"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        清除结果
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                          <div className="text-2xl font-bold text-blue-600">{importResults.totalProcessed}</div>
                          <div className="text-sm text-blue-600">总处理数</div>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg border-2 border-green-200">
                          <div className="text-2xl font-bold text-green-600">{importResults.successCount}</div>
                          <div className="text-sm text-green-600">成功数</div>
                        </div>
                        <div className="text-center p-4 bg-red-50 rounded-lg border-2 border-red-200">
                          <div className="text-2xl font-bold text-red-600">{importResults.errorCount}</div>
                          <div className="text-sm text-red-600">失败数</div>
                        </div>
                      </div>
                      
                      {/* 成功率显示 */}
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">成功率</span>
                          <span className="text-sm font-bold">
                            {importResults.totalProcessed > 0 
                              ? `${Math.round((importResults.successCount / importResults.totalProcessed) * 100)}%`
                              : '0%'
                            }
                          </span>
                        </div>
                        <Progress 
                          value={importResults.totalProcessed > 0 
                            ? (importResults.successCount / importResults.totalProcessed) * 100
                            : 0
                          } 
                          className="h-2"
                        />
                      </div>

                      {importResults.errors.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-medium text-red-600">错误详情：</h4>
                          <div className="max-h-60 overflow-y-auto space-y-2">
                            {importResults.errors.map((error, index) => (
                              <Alert key={index} variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription className="whitespace-pre-line">
                                  {error}
                                </AlertDescription>
                              </Alert>
                            ))}
                          </div>
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm text-blue-800">
                              <strong>常见解决方案：</strong>
                            </p>
                            <ul className="text-sm text-blue-700 mt-1 space-y-1">
                              <li>• <strong>字段长度问题：</strong>联系管理员调整数据库字段限制，或缩短数据内容</li>
                              <li>• <strong>数据格式问题：</strong>检查邮箱、手机号、网址等字段格式是否正确</li>
                              <li>• <strong>必填字段：</strong>确保公司ID、名称等必填字段不为空</li>
                            </ul>
                          </div>
                        </div>
                      )}

                      <div className="pt-4 border-t">
                        <p className="text-sm text-muted-foreground">
                          导入完成时间: {new Date().toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>

        {/* Instructions */}
        <Alert>
          <AlertDescription>
            <strong>使用说明:</strong>
            <ul className="mt-2 space-y-1 text-sm">
              <li>• <strong>数据库连接</strong>：使用MySQL 8数据库，点击"测试数据库连接"确认连接状态</li>
              <li>• <strong>模板下载</strong>：点击"下载模板"获取标准的Excel模板文件，包含所有必需的字段</li>
              <li>• <strong>文件格式</strong>：支持Excel (.xlsx, .xls) 和CSV文件格式</li>
              <li>• <strong>字段要求</strong>：文件必须包含标题行，字段顺序必须与模板一致</li>
              <li>• <strong>company_id</strong>：公司ID，必须是有效的正整数，用于匹配现有记录</li>
              <li>• <strong>name/name_en</strong>：公司中英文名称，不能为空</li>
              <li>• <strong>mobile</strong>：手机号码，必须是有效的中国手机号码格式</li>
              <li>• <strong>email</strong>：邮箱地址，必须符合标准邮箱格式</li>
              <li>• <strong>homepage</strong>：网站地址，必须以http://或https://开头</li>
              <li>• <strong>is_verified</strong>：验证状态，1表示已验证，0表示未验证</li>
              <li>• <strong>数据处理</strong>：系统使用事务处理，同时更新seller_company和seller_company_lang表</li>
              <li>• <strong>更新策略</strong>：根据company_id匹配现有记录进行插入或更新操作</li>
            </ul>
          </AlertDescription>
        </Alert>
      </div>
      </div>

      {/* Export Options Modal */}
      <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>选择导出选项</DialogTitle>
            <DialogDescription>
              请选择要导出的数据范围。大量数据导出可能需要较长时间。
              {totalRecords && (
                <div className="mt-2 text-sm">
                  数据库中共有 <span className="font-semibold text-blue-600">{totalRecords.toLocaleString()}</span> 条记录
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <RadioGroup value={exportType} onValueChange={(value) => setExportType(value as 'sample' | 'custom' | 'all')}>
              <div className="flex items-start space-x-3">
                <RadioGroupItem value="sample" id="sample" className="mt-0.5" />
                <Label htmlFor="sample" className="flex-1 cursor-pointer">
                  <div>
                    <div className="font-medium">示例数据 (推荐)</div>
                    <div className="text-sm text-muted-foreground">导出前100条数据，快速预览</div>
                  </div>
                </Label>
              </div>

              <div className="flex items-start space-x-3">
                <RadioGroupItem value="custom" id="custom" className="mt-0.5" />
                <Label htmlFor="custom" className="flex-1 cursor-pointer">
                  <div>
                    <div className="font-medium">自定义数量</div>
                    <div className="text-sm text-muted-foreground">指定导出数量，最多10000条</div>
                  </div>
                </Label>
              </div>

              {exportType === 'custom' && (
                <div className="ml-7 mt-2">
                  <Label htmlFor="limit" className="text-sm font-medium">导出数量</Label>
                  <Input
                    id="limit"
                    type="number"
                    min="1"
                    max="10000"
                    value={exportLimit}
                    onChange={(e) => setExportLimit(Math.min(10000, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="mt-1 w-32"
                    placeholder="请输入数量"
                  />
                </div>
              )}

              <div className="flex items-start space-x-3">
                <RadioGroupItem value="all" id="all" className="mt-0.5" />
                <Label htmlFor="all" className="flex-1 cursor-pointer">
                  <div>
                    <div className="font-medium">全部数据</div>
                    <div className="text-sm text-muted-foreground text-orange-600">
                      {totalRecords
                        ? `导出全部 ${totalRecords.toLocaleString()} 条数据，数据量大时可能较慢`
                        : '导出所有数据，数据量大时可能较慢'
                      }
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportModal(false)}>
              取消
            </Button>
            <Button onClick={handleConfirmExport} disabled={isExporting}>
              {isExporting ? '导出中...' : '开始导出'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 全量更新确认对话框 */}
      <Dialog open={showBulkUpdateDialog} onOpenChange={setShowBulkUpdateDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
              确认全量更新
            </DialogTitle>
            <DialogDescription>
              此操作将删除数据库中除最新导入数据外的所有历史数据，请谨慎操作。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>警告：</strong>此操作不可逆！将会删除以下数据：
                <ul className="mt-2 space-y-1 text-sm">
                  <li>• {importStartTime ? `${importStartTime} 之前的所有` : '本次导入之前的所有'} seller_company 记录</li>
                  <li>• 对应的 seller_company_lang 多语言记录</li>
                  <li>• 相关联的其他数据</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>保留数据：</strong>{importStartTime ? `只保留 ${importStartTime} 之后导入的最新数据` : '只保留本次导入的最新数据'}
              </p>
            </div>

            {isBulkUpdating && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>全量更新进度</span>
                  <span>{bulkUpdateProgress}%</span>
                </div>
                <Progress value={bulkUpdateProgress} />
                <p className="text-xs text-muted-foreground">
                  正在清理数据库中的历史数据...
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowBulkUpdateDialog(false)}
              disabled={isBulkUpdating}
            >
              取消
            </Button>
            <WithAdminAuth actionName="批量删除重复供应商数据">
              <Button 
                onClick={handleBulkUpdate} 
                disabled={isBulkUpdating}
                className="bg-red-600 hover:bg-red-700"
              >
                {isBulkUpdating ? '更新中...' : '确认删除'}
              </Button>
            </WithAdminAuth>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
