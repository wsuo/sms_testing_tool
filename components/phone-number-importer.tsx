"use client"

import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react'

interface ImportProgress {
  processed: number
  total: number
  success: number
  failed: number
  errors: string[]
  message?: string
  skipped?: number
}

interface PhoneNumberImporterProps {
  onImportComplete?: () => void
}

export default function PhoneNumberImporter({ onImportComplete }: PhoneNumberImporterProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importResult, setImportResult] = useState<ImportProgress | null>(null)
  const [error, setError] = useState<string>('')

  // 处理文件选择
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setImportResult(null)
      setError('')
    }
  }

  // 处理文件拖拽
  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    
    const files = event.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      setSelectedFile(file)
      setImportResult(null)
      setError('')
    }
  }

  // 开始导入
  const handleImport = async () => {
    if (!selectedFile) {
      toast({
        title: "错误",
        description: "请先选择要导入的Excel文件",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)
    setError('')
    setImportResult(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch('/api/phone-numbers/import', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setImportResult(result.data)
        toast({
          title: "导入成功",
          description: result.data.message || `成功导入 ${result.data.success} 个手机号码`,
        })
        
        // 通知父组件刷新数据
        onImportComplete?.()
      } else {
        setError(result.error || '导入失败')
        toast({
          title: "导入失败",
          description: result.error || '导入过程中发生错误',
          variant: "destructive",
        })
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '网络错误'
      setError(errorMsg)
      toast({
        title: "导入失败",
        description: errorMsg,
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  // 清除选择
  const handleClear = () => {
    setSelectedFile(null)
    setImportResult(null)
    setError('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // 触发文件选择
  const triggerFileSelect = () => {
    fileInputRef.current?.click()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Excel批量导入
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 文件上传区域 */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
            ${selectedFile ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-gray-400'}
            ${isUploading ? 'pointer-events-none opacity-50' : ''}
          `}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={triggerFileSelect}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isUploading}
          />
          
          {selectedFile ? (
            <div className="flex items-center justify-center gap-3">
              <FileSpreadsheet className="w-8 h-8 text-green-500" />
              <div>
                <p className="font-medium text-green-700">{selectedFile.name}</p>
                <p className="text-sm text-green-600">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
          ) : (
            <div>
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-2">
                点击选择文件或拖拽文件到此处
              </p>
              <p className="text-sm text-gray-500">
                支持 .xlsx、.xls、.csv 格式，最大10MB
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Excel文件第一列应为手机号码，无需表头
              </p>
            </div>
          )}
        </div>

        {/* 使用说明 */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>导入说明：</strong>
            <ul className="mt-2 text-sm space-y-1">
              <li>• Excel文件第一列必须是手机号码（11位数字）</li>
              <li>• 不需要表头，直接从第一行开始</li>
              <li>• 系统会自动去重并跳过已存在的号码</li>
              <li>• 自动查询运营商、省份、城市信息</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* 操作按钮 */}
        <div className="flex gap-2">
          <Button
            onClick={handleImport}
            disabled={!selectedFile || isUploading}
            className="flex-1"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                导入中...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                开始导入
              </>
            )}
          </Button>
          
          {selectedFile && (
            <Button
              variant="outline"
              onClick={handleClear}
              disabled={isUploading}
            >
              清除
            </Button>
          )}
        </div>

        {/* 导入进度 */}
        {isUploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>正在处理...</span>
              <span>请稍候，系统正在查询运营商信息</span>
            </div>
            <Progress value={30} className="w-full" />
          </div>
        )}

        {/* 导入结果 */}
        {importResult && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{importResult.total}</div>
                <div className="text-sm text-blue-600">总计</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{importResult.success}</div>
                <div className="text-sm text-green-600">成功</div>
              </div>
              <div className="bg-red-50 p-3 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{importResult.failed}</div>
                <div className="text-sm text-red-600">失败</div>
              </div>
              {importResult.skipped !== undefined && (
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{importResult.skipped}</div>
                  <div className="text-sm text-yellow-600">跳过</div>
                </div>
              )}
            </div>

            {importResult.message && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{importResult.message}</AlertDescription>
              </Alert>
            )}

            {/* 错误列表 */}
            {importResult.errors.length > 0 && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <details>
                    <summary className="cursor-pointer">
                      导入过程中发生 {importResult.errors.length} 个错误
                    </summary>
                    <ul className="mt-2 text-sm space-y-1">
                      {importResult.errors.slice(0, 10).map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                      {importResult.errors.length > 10 && (
                        <li>... 还有 {importResult.errors.length - 10} 个错误</li>
                      )}
                    </ul>
                  </details>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* 错误信息 */}
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}