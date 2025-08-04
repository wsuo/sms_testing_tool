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
  Activity
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
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

export default function DataManagementPage() {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      processFile(selectedFile)
    }
  }

  const processFile = async (file: File) => {
    setIsProcessing(true)
    setImportProgress(0)

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
      setImportProgress(100)

      if (errors.length === 0) {
        setImportStatus('completed')
        toast({
          title: "文件解析成功",
          description: `成功解析 ${mappedData.length} 条公司记录，可以开始导入`,
        })
      } else {
        setImportStatus('error')
        toast({
          title: "数据验证失败",
          description: `发现 ${errors.length} 个验证错误，请修复后重新上传`,
          variant: "destructive",
        })
      }
    } catch (error) {
      setImportStatus('error')
      toast({
        title: "文件处理失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
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

    try {
      toast({
        title: "开始导入",
        description: "正在导入数据到数据库，请稍候...",
      })

      // 模拟进度更新
      const progressInterval = setInterval(() => {
        setImportProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      // 调用后端API进行数据导入
      const response = await fetch('/api/supplier-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companies: companyData
        })
      })

      clearInterval(progressInterval)
      setImportProgress(100)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '导入失败')
      }

      const result = await response.json()
      setImportResults(result)
      setImportStatus('completed')

      toast({
        title: "导入完成",
        description: `成功处理 ${result.totalProcessed} 条记录，成功 ${result.successCount} 条，失败 ${result.errorCount} 条`,
      })

    } catch (error) {
      toast({
        title: "导入失败",
        description: error instanceof Error ? error.message : "未知错误",
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
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // 导出所有数据
  const handleExportAll = async () => {
    setIsExporting(true)
    setExportProgress(0)

    try {
      toast({
        title: "开始导出",
        description: "正在从数据库导出所有公司数据...",
      })

      // 模拟进度更新
      const progressInterval = setInterval(() => {
        setExportProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const response = await fetch('/api/supplier-export?format=excel&limit=10000')

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
      a.download = `companies_export_${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "导出成功",
        description: "公司数据已成功导出到Excel文件",
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
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">数据管理</h1>
            <p className="text-muted-foreground mt-1">导入和导出公司数据，支持Excel格式和中英文双语信息</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExportTemplate}>
              <FileText className="w-4 h-4 mr-2" />
              下载模板
            </Button>
            <Button variant="outline" onClick={handleExportAll} disabled={isExporting}>
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
              
              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>
                      {importStatus === 'processing' && importResults === null ? '文件解析进度' : '数据导入进度'}
                    </span>
                    <span>{importProgress}%</span>
                  </div>
                  <Progress value={importProgress} />
                  <p className="text-xs text-muted-foreground">
                    {importStatus === 'processing' && importResults === null
                      ? '正在解析Excel文件...'
                      : '正在导入数据到数据库...'}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Status and Results */}
        {companyData.length > 0 && (
          <Tabs defaultValue="preview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="preview" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                数据预览 ({companyData.length})
              </TabsTrigger>
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
            </TabsList>

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
                      <Button
                        onClick={handleImport}
                        disabled={validationErrors.length > 0 || isProcessing || companyData.length === 0}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {isProcessing ? '导入中...' : '开始导入'}
                      </Button>
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
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>公司ID</TableHead>
                          <TableHead>中文名称</TableHead>
                          <TableHead>英文名称</TableHead>
                          <TableHead>省份</TableHead>
                          <TableHead>城市</TableHead>
                          <TableHead>联系人</TableHead>
                          <TableHead>手机</TableHead>
                          <TableHead>邮箱</TableHead>
                          <TableHead>验证状态</TableHead>
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
                    <Button
                      onClick={clearImportResults}
                      variant="outline"
                      size="sm"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      清除结果
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">{importResults.totalProcessed}</div>
                          <div className="text-sm text-blue-600">总处理数</div>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">{importResults.successCount}</div>
                          <div className="text-sm text-green-600">成功数</div>
                        </div>
                        <div className="text-center p-4 bg-red-50 rounded-lg">
                          <div className="text-2xl font-bold text-red-600">{importResults.errorCount}</div>
                          <div className="text-sm text-red-600">失败数</div>
                        </div>
                      </div>

                      {importResults.errors.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-medium text-red-600">错误详情：</h4>
                          {importResults.errors.map((error, index) => (
                            <Alert key={index} variant="destructive">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>{error}</AlertDescription>
                            </Alert>
                          ))}
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
        )}

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
  )
}
