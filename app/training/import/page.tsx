"use client"

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { AuthDialog } from '@/components/auth-dialog'
import { ModuleHeader } from '@/components/module-header'
import { WithAdminAuth } from '@/components/with-admin-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Eye, 
  BookOpen, 
  Settings,
  Download,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Building2,
  GraduationCap,
  Award,
  Shield,
  Scale,
  Save,
  X,
  CloudUpload,
  File,
  Image,
  Mail,
  Clock
} from 'lucide-react'

interface ExamCategory {
  id: number
  name: string
  description?: string
  icon?: string
  color?: string
}

interface ParsedQuestion {
  questionNumber: number
  section?: string
  questionText: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  correctAnswer: string
  explanation?: string
}

interface ParsedQuestionSet {
  name: string
  description?: string
  questions: ParsedQuestion[]
}

interface ImportResult {
  success: boolean
  setName: string
  questionsCount: number
  error?: string
  warnings?: string[]
}

export default function TrainingImportPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  
  // 导入相关状态
  const [importMethod, setImportMethod] = useState<'file' | 'html'>('html')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [htmlContent, setHtmlContent] = useState('')
  const [questionSetName, setQuestionSetName] = useState('')
  const [questionSetDesc, setQuestionSetDesc] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  
  // UI状态
  const [loading, setLoading] = useState(false)
  const [parseResult, setParseResult] = useState<ParsedQuestionSet | null>(null)
  const [importResults, setImportResults] = useState<ImportResult[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // 数据状态
  const [categories, setCategories] = useState<ExamCategory[]>([])
  const [existingSets, setExistingSets] = useState<any[]>([])
  
  // 类别管理状态
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<ExamCategory | null>(null)
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    description: '',
    icon: 'BookOpen',
    color: '#3b82f6'
  })
  
  // 题库详情查看状态
  const [viewingQuestionSet, setViewingQuestionSet] = useState<any>(null)
  const [questionSetDetailsOpen, setQuestionSetDetailsOpen] = useState(false)
  const [questionSetDetails, setQuestionSetDetails] = useState<any>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  
  // 拖拽上传状态
  const [isDragOver, setIsDragOver] = useState(false)
  const [dragCounter, setDragCounter] = useState(0)
  
  // 题库删除状态
  const [deletingQuestionSet, setDeletingQuestionSet] = useState<any>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadInitialData()
    } else if (!authLoading && !isAuthenticated) {
      setShowAuthDialog(true)
    }
  }, [isAuthenticated, authLoading])
  
  const loadInitialData = async () => {
    try {
      const [categoriesRes, setsRes] = await Promise.all([
        fetch('/api/training/categories'),
        fetch('/api/training/sets')
      ])
      
      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json()
        setCategories(categoriesData.data || [])
        if (categoriesData.data?.length > 0) {
          setSelectedCategory(categoriesData.data[0].id.toString())
        }
      }
      
      if (setsRes.ok) {
        const setsData = await setsRes.json()
        setExistingSets(setsData.data || [])
      }
    } catch (error) {
      console.error('加载初始数据失败:', error)
    }
  }
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }
  
  const processFile = (file: File) => {
    // 支持 .html 和 .txt 文件
    const isValidFile = file.type === 'text/html' || 
                       file.name.toLowerCase().endsWith('.html') ||
                       file.name.toLowerCase().endsWith('.txt') ||
                       file.type === 'text/plain'
    
    if (!isValidFile) {
      setError('请选择HTML文件(.html)或文本文件(.txt)')
      return
    }
    
    setSelectedFile(file)
    setError('')
    
    // 读取文件内容
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      setHtmlContent(content)
    }
    reader.readAsText(file)
  }
  
  // 拖拽处理函数
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragCounter(prev => prev + 1)
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true)
    }
  }
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragCounter(prev => prev - 1)
    if (dragCounter <= 1) {
      setIsDragOver(false)
    }
  }
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    setDragCounter(0)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      processFile(files[0])
    }
  }
  
  const handlePreview = async () => {
    if (!htmlContent.trim()) {
      setError('请输入HTML内容或选择文件')
      return
    }
    
    setLoading(true)
    setError('')
    setParseResult(null)
    
    try {
      const response = await fetch('/api/training/parse-html', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          htmlContent,
          setName: questionSetName || '未命名题库'
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        setParseResult(result.data)
        if (result.warnings?.length > 0) {
          setError(`解析成功，但有警告：${result.warnings.join('; ')}`)
        }
      } else {
        setError(result.error || '解析失败')
      }
    } catch (error) {
      setError('解析请求失败')
    } finally {
      setLoading(false)
    }
  }
  
  const handleImport = async () => {
    if (!parseResult || !selectedCategory) {
      setError('请先预览题目并选择考核类别')
      return
    }
    
    setLoading(true)
    setError('')
    setSuccess('')
    
    try {
      const response = await fetch('/api/training/import-html', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          questionSet: {
            ...parseResult,
            name: questionSetName || parseResult.name,
            description: questionSetDesc || parseResult.description
          },
          categoryId: parseInt(selectedCategory)
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        setSuccess(`成功导入 ${result.data.questionsCount} 道题目到题库 "${result.data.setName}"`)
        setImportResults(prev => [result.data, ...prev])
        
        // 重置表单
        setHtmlContent('')
        setQuestionSetName('')
        setQuestionSetDesc('')
        setParseResult(null)
        setSelectedFile(null)
        
        // 刷新现有题库列表
        loadInitialData()
      } else {
        setError(result.error || '导入失败')
      }
    } catch (error) {
      setError('导入请求失败')
    } finally {
      setLoading(false)
    }
  }
  
  // 认证成功后的回调
  const handleAuthSuccess = () => {
    setShowAuthDialog(false)
    loadInitialData()
  }
  
  // 类别管理功能函数
  const openCategoryDialog = (category?: ExamCategory) => {
    if (category) {
      setEditingCategory(category)
      setCategoryFormData({
        name: category.name,
        description: category.description || '',
        icon: category.icon || 'BookOpen',
        color: category.color || '#3b82f6'
      })
    } else {
      setEditingCategory(null)
      setCategoryFormData({
        name: '',
        description: '',
        icon: 'BookOpen',
        color: '#3b82f6'
      })
    }
    setCategoryDialogOpen(true)
  }
  
  const closeCategoryDialog = () => {
    setCategoryDialogOpen(false)
    setEditingCategory(null)
    setCategoryFormData({
      name: '',
      description: '',
      icon: 'BookOpen',
      color: '#3b82f6'
    })
  }
  
  const handleSaveCategory = async () => {
    if (!categoryFormData.name.trim()) {
      setError('类别名称不能为空')
      return
    }
    
    setLoading(true)
    setError('')
    
    try {
      const url = '/api/training/categories'
      const method = editingCategory ? 'PUT' : 'POST'
      const body = editingCategory 
        ? { id: editingCategory.id, ...categoryFormData }
        : categoryFormData
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      
      const result = await response.json()
      
      if (result.success) {
        setSuccess(result.message)
        closeCategoryDialog()
        loadInitialData() // 重新加载数据
      } else {
        setError(result.message || '操作失败')
      }
    } catch (error) {
      setError('网络请求失败')
    } finally {
      setLoading(false)
    }
  }
  
  const handleDeleteCategory = async (category: ExamCategory) => {
    if (!confirm(`确定要删除类别 "${category.name}" 吗？此操作不可恢复。`)) {
      return
    }
    
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch(`/api/training/categories?id=${category.id}`, {
        method: 'DELETE'
      })
      
      const result = await response.json()
      
      if (result.success) {
        setSuccess(result.message)
        loadInitialData() // 重新加载数据
      } else {
        setError(result.message || '删除失败')
      }
    } catch (error) {
      setError('网络请求失败')
    } finally {
      setLoading(false)
    }
  }
  
  // 图标映射
  const iconMap: Record<string, any> = {
    BookOpen,
    GraduationCap,
    Building2,
    Award,
    Shield,
    Scale
  }
  
  const IconComponent = iconMap[categoryFormData.icon] || BookOpen
  
  // 题库详情查看功能
  const handleViewQuestionSet = async (questionSet: any) => {
    setViewingQuestionSet(questionSet)
    setQuestionSetDetailsOpen(true)
    setLoadingDetails(true)
    setQuestionSetDetails(null)
    
    try {
      const response = await fetch(`/api/training/sets/${questionSet.id}/details`)
      const result = await response.json()
      
      if (result.success) {
        setQuestionSetDetails(result.data)
      } else {
        setError('获取题库详情失败')
      }
    } catch (error) {
      setError('网络请求失败')
    } finally {
      setLoadingDetails(false)
    }
  }
  
  const closeQuestionSetDetails = () => {
    setQuestionSetDetailsOpen(false)
    setViewingQuestionSet(null)
    setQuestionSetDetails(null)
  }
  
  // 题库删除功能
  const handleDeleteQuestionSet = (questionSet: any) => {
    setDeletingQuestionSet(questionSet)
    setDeleteConfirmOpen(true)
  }
  
  const closeDeleteConfirm = () => {
    setDeleteConfirmOpen(false)
    setDeletingQuestionSet(null)
  }
  
  const confirmDeleteQuestionSet = async () => {
    if (!deletingQuestionSet) return
    
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch(`/api/training/sets/${deletingQuestionSet.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })
      
      const result = await response.json()
      
      if (result.success) {
        setSuccess(`题库 "${deletingQuestionSet.name}" 已删除`)
        closeDeleteConfirm()
        loadInitialData() // 重新加载数据
      } else {
        setError(result.message || '删除失败')
      }
    } catch (error) {
      setError('网络请求失败')
    } finally {
      setLoading(false)
    }
  }
  
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-100 to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">正在验证身份...</p>
        </div>
      </div>
    )
  }
  
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-100 to-gray-50">
        <ModuleHeader
          title="题库导入"
          description="HTML格式题库导入和管理"
          icon={Upload}
          showAuthStatus={true}
        />
        
        <div className="pt-24 container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <Card className="w-full max-w-md">
              <CardHeader className="text-center">
                <CardTitle>需要管理员认证</CardTitle>
                <CardDescription>
                  题库导入功能需要管理员权限才能访问
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button onClick={() => setShowAuthDialog(true)} size="lg">
                  管理员登录
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
        
        <AuthDialog
          isOpen={showAuthDialog}
          onClose={() => setShowAuthDialog(false)}
          onSuccess={handleAuthSuccess}
          title="题库管理员认证"
          description="请输入管理员密码以访问题库导入功能"
        />
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-100 to-gray-50">
      <ModuleHeader
        title="题库导入"
        description="HTML格式题库导入和管理"
        icon={Upload}
        showAuthStatus={true}
      />
      
      <div className="pt-24 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* 状态提示 */}
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
          
          <Tabs defaultValue="import" className="space-y-8">
            {/* 自定义Tab导航 */}
            <div className="flex justify-center">
              <TabsList className="bg-white/80 backdrop-blur-sm p-2 rounded-2xl shadow-lg border border-white/20 h-auto">
                <TabsTrigger 
                  value="import" 
                  className="flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-xl transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/25 hover:bg-emerald-50 border-0"
                >
                  <Upload className="w-4 h-4" />
                  导入题库
                </TabsTrigger>
                <TabsTrigger 
                  value="manage" 
                  className="flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-xl transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/25 hover:bg-emerald-50 border-0"
                >
                  <BookOpen className="w-4 h-4" />
                  管理题库
                </TabsTrigger>
                <TabsTrigger 
                  value="categories" 
                  className="flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-xl transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/25 hover:bg-emerald-50 border-0"
                >
                  <Settings className="w-4 h-4" />
                  类别管理
                </TabsTrigger>
              </TabsList>
            </div>
            
            {/* 导入选项卡 */}
            <TabsContent value="import" className="bg-white rounded-lg border shadow-sm p-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* 左侧：导入配置 */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        导入设置
                      </CardTitle>
                      <CardDescription>
                        配置题库基本信息和导入选项
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      
                      {/* 考核类别选择 */}
                      <div className="space-y-2">
                        <Label htmlFor="category">考核类别 *</Label>
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                          <SelectTrigger>
                            <SelectValue placeholder="请选择考核类别" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map(cat => (
                              <SelectItem key={cat.id} value={cat.id.toString()}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* 题库名称 */}
                      <div className="space-y-2">
                        <Label htmlFor="setName">题库名称</Label>
                        <Input
                          id="setName"
                          placeholder="留空则从HTML中自动提取"
                          value={questionSetName}
                          onChange={(e) => setQuestionSetName(e.target.value)}
                        />
                      </div>
                      
                      {/* 题库描述 */}
                      <div className="space-y-2">
                        <Label htmlFor="setDesc">题库描述</Label>
                        <Textarea
                          id="setDesc"
                          placeholder="留空则从HTML中自动提取"
                          rows={3}
                          value={questionSetDesc}
                          onChange={(e) => setQuestionSetDesc(e.target.value)}
                        />
                      </div>
                      
                    </CardContent>
                  </Card>
                  
                  {/* HTML内容输入与拖拽上传区域 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        HTML内容输入
                      </CardTitle>
                      <CardDescription>
                        支持拖拽上传HTML/TXT文件或直接粘贴HTML代码
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      
                      {/* 拖拽上传区域 */}
                      <div 
                        className={`relative border-2 border-dashed rounded-xl p-8 transition-all duration-300 ${
                          isDragOver 
                            ? 'border-emerald-500 bg-emerald-50/50 scale-102' 
                            : 'border-gray-300 hover:border-emerald-400 hover:bg-emerald-50/20'
                        }`}
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                      >
                        <div className="text-center space-y-4">
                          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
                            isDragOver 
                              ? 'bg-emerald-500 text-white scale-110' 
                              : 'bg-gray-100 text-gray-400'
                          }`}>
                            <CloudUpload className="w-8 h-8" />
                          </div>
                          
                          <div className="space-y-2">
                            <p className={`text-lg font-medium transition-colors ${
                              isDragOver ? 'text-emerald-600' : 'text-gray-600'
                            }`}>
                              {isDragOver ? '松开鼠标即可上传' : '拖拽文件到此处'}
                            </p>
                            <p className="text-sm text-gray-500">
                              支持 .html、.txt 格式文件，或者
                            </p>
                          </div>
                          
                          {/* 文件选择按钮 */}
                          <div className="space-y-3">
                            <Label htmlFor="htmlFile" className="cursor-pointer">
                              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-emerald-400 transition-colors">
                                <File className="w-4 h-4" />
                                选择文件
                              </div>
                            </Label>
                            <Input
                              id="htmlFile"
                              type="file"
                              accept=".html,.txt"
                              onChange={handleFileChange}
                              className="hidden"
                            />
                            
                            {selectedFile && (
                              <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">
                                <CheckCircle className="w-4 h-4" />
                                已选择: {selectedFile.name}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* HTML代码直接输入 */}
                      <div className="space-y-2">
                        <Label htmlFor="htmlContent">或直接粘贴HTML代码</Label>
                        <Textarea
                          id="htmlContent"
                          placeholder="粘贴HTML代码到这里..."
                          rows={12}
                          value={htmlContent}
                          onChange={(e) => setHtmlContent(e.target.value)}
                          className="font-mono text-sm resize-none"
                        />
                      </div>
                      
                      <Button 
                        onClick={handlePreview} 
                        disabled={loading || !htmlContent.trim()}
                        className="w-full"
                      >
                        {loading ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            解析中...
                          </>
                        ) : (
                          <>
                            <Eye className="w-4 h-4 mr-2" />
                            预览题目
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
                
                {/* 右侧：预览结果 */}
                <div className="space-y-6">
                  {parseResult ? (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-500" />
                          解析成功
                        </CardTitle>
                        <CardDescription>
                          {parseResult.questions.length} 道题目已准备导入
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        
                        {/* 题库信息 */}
                        <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                          <div><strong>题库名称:</strong> {parseResult.name}</div>
                          {parseResult.description && (
                            <div><strong>描述:</strong> {parseResult.description}</div>
                          )}
                          <div><strong>题目数量:</strong> {parseResult.questions.length} 题</div>
                        </div>
                        
                        {/* 题目预览 */}
                        <div className="max-h-96 overflow-y-auto space-y-4">
                          {parseResult.questions.slice(0, 3).map((q, index) => (
                            <div key={index} className="p-4 border rounded-lg">
                              <div className="font-medium mb-2">
                                {q.questionNumber}. {q.questionText}
                              </div>
                              <div className="text-sm space-y-1 text-gray-600">
                                <div>A. {q.optionA}</div>
                                <div>B. {q.optionB}</div>
                                <div>C. {q.optionC}</div>
                                <div>D. {q.optionD}</div>
                              </div>
                              {q.correctAnswer && (
                                <div className="text-sm mt-2 text-green-600">
                                  正确答案: {q.correctAnswer}
                                </div>
                              )}
                            </div>
                          ))}
                          
                          {parseResult.questions.length > 3 && (
                            <div className="text-center text-gray-500 text-sm">
                              还有 {parseResult.questions.length - 3} 题未显示...
                            </div>
                          )}
                        </div>
                        
                        <Button 
                          onClick={handleImport} 
                          disabled={loading || !selectedCategory}
                          className="w-full"
                          size="lg"
                        >
                          {loading ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              导入中...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-2" />
                              确认导入
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardContent className="text-center py-12">
                        <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">请输入HTML内容并点击"预览题目"</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </TabsContent>
            
            {/* 管理选项卡 */}
            <TabsContent value="manage" className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-8 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>现有题库</CardTitle>
                  <CardDescription>
                    管理已导入的题库，共 {existingSets.length} 个题库
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {existingSets.length > 0 ? (
                    <div className="space-y-4">
                      {existingSets.map((set, index) => (
                        <div key={set.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1 min-w-0 mr-4">
                            <div className="font-medium truncate">{set.name}</div>
                            <div className="text-sm text-gray-500 truncate">
                              {set.description || '无描述'} • {set.questionsCount} 题
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge variant="secondary" className="whitespace-nowrap">
                              {categories.find(c => c.id === set.categoryId)?.name || '未分类'}
                            </Badge>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleViewQuestionSet(set)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              查看
                            </Button>
                            <WithAdminAuth actionName="删除题库">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleDeleteQuestionSet(set)}
                                className="text-red-600 hover:text-red-700 hover:border-red-300"
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                删除
                              </Button>
                            </WithAdminAuth>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      暂无题库，请先导入题库
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* 导入历史 */}
              {importResults.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>导入历史</CardTitle>
                    <CardDescription>
                      最近的导入操作记录
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {importResults.map((result, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                          {result.success ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500" />
                          )}
                          <div className="flex-1">
                            <div className="font-medium">{result.setName}</div>
                            <div className="text-sm text-gray-500">
                              {result.success ? 
                                `成功导入 ${result.questionsCount} 道题目` : 
                                result.error
                              }
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            {/* 类别管理选项卡 */}
            <TabsContent value="categories" className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">考核类别管理</h3>
                  <p className="text-muted-foreground">
                    管理考核类别，共 {categories.length} 个类别
                  </p>
                </div>
                <Button onClick={() => openCategoryDialog()}>
                  <Plus className="w-4 h-4 mr-2" />
                  新增类别
                </Button>
              </div>
              
              <div className="grid gap-4">
                {categories.map((category) => {
                  const CategoryIcon = iconMap[category.icon || 'BookOpen'] || BookOpen
                  return (
                    <Card key={category.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                              style={{ backgroundColor: category.color }}
                            >
                              <CategoryIcon className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="font-medium">{category.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {category.description || '无描述'}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              ID: {category.id}
                            </Badge>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openCategoryDialog(category)}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              编辑
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDeleteCategory(category)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              删除
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
                
                {categories.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    暂无考核类别，点击右上角"新增类别"开始创建
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
          
          {/* 类别编辑对话框 */}
          <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {editingCategory ? '编辑类别' : '新增类别'}
                </DialogTitle>
                <DialogDescription>
                  {editingCategory ? '修改考核类别信息' : '创建新的考核类别'}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                {/* 类别名称 */}
                <div className="space-y-2">
                  <Label htmlFor="categoryName">类别名称 *</Label>
                  <Input
                    id="categoryName"
                    placeholder="请输入类别名称"
                    value={categoryFormData.name}
                    onChange={(e) => setCategoryFormData(prev => ({
                      ...prev,
                      name: e.target.value
                    }))}
                  />
                </div>
                
                {/* 类别描述 */}
                <div className="space-y-2">
                  <Label htmlFor="categoryDesc">类别描述</Label>
                  <Textarea
                    id="categoryDesc"
                    placeholder="请输入类别描述"
                    rows={3}
                    value={categoryFormData.description}
                    onChange={(e) => setCategoryFormData(prev => ({
                      ...prev,
                      description: e.target.value
                    }))}
                  />
                </div>
                
                {/* 图标选择 */}
                <div className="space-y-2">
                  <Label>图标选择</Label>
                  <div className="grid grid-cols-6 gap-2">
                    {Object.entries(iconMap).map(([iconName, IconComp]) => (
                      <button
                        key={iconName}
                        type="button"
                        className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center transition-colors ${
                          categoryFormData.icon === iconName
                            ? 'border-primary bg-primary text-white'
                            : 'border-muted hover:border-primary'
                        }`}
                        onClick={() => setCategoryFormData(prev => ({
                          ...prev,
                          icon: iconName
                        }))}
                      >
                        <IconComp className="w-5 h-5" />
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* 颜色选择 */}
                <div className="space-y-2">
                  <Label>颜色选择</Label>
                  <div className="grid grid-cols-8 gap-2">
                    {[
                      '#10b981', '#3b82f6', '#8b5cf6', '#ef4444',
                      '#f59e0b', '#06b6d4', '#84cc16', '#f97316'
                    ].map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          categoryFormData.color === color
                            ? 'border-gray-600 scale-110'
                            : 'border-gray-300 hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setCategoryFormData(prev => ({
                          ...prev,
                          color
                        }))}
                      />
                    ))}
                  </div>
                </div>
                
                {/* 预览 */}
                <div className="space-y-2">
                  <Label>预览效果</Label>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                      style={{ backgroundColor: categoryFormData.color }}
                    >
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-medium">
                        {categoryFormData.name || '类别名称'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {categoryFormData.description || '类别描述'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={closeCategoryDialog}>
                  <X className="w-4 h-4 mr-2" />
                  取消
                </Button>
                <Button 
                  onClick={handleSaveCategory}
                  disabled={loading || !categoryFormData.name.trim()}
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {editingCategory ? '更新' : '创建'}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          {/* 题库详情查看对话框 */}
          <Dialog open={questionSetDetailsOpen} onOpenChange={setQuestionSetDetailsOpen}>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  题库详情：{viewingQuestionSet?.name}
                </DialogTitle>
                <DialogDescription>
                  查看题库的详细信息和题目列表
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                {loadingDetails ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                    <span>加载中...</span>
                  </div>
                ) : questionSetDetails ? (
                  <>
                    {/* 题库基本信息 */}
                    <div className="space-y-2">
                      <h4 className="font-medium">基本信息</h4>
                      <div className="p-4 bg-gray-50 rounded-lg space-y-2 text-sm">
                        <div><strong>题库名称：</strong> {questionSetDetails.name}</div>
                        <div><strong>描述：</strong> {questionSetDetails.description || '无描述'}</div>
                        <div><strong>题目数量：</strong> {questionSetDetails.questionsCount} 题</div>
                        <div><strong>创建时间：</strong> {new Date(questionSetDetails.created_at).toLocaleString()}</div>
                        <div><strong>所属类别：</strong> 
                          <Badge variant="outline" className="ml-2">
                            {categories.find(c => c.id === questionSetDetails.category_id)?.name || '未分类'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    {/* 题目列表 */}
                    <div className="space-y-2">
                      <h4 className="font-medium">题目列表</h4>
                      <div className="max-h-96 overflow-y-auto space-y-3">
                        {questionSetDetails.questions && questionSetDetails.questions.length > 0 ? (
                          questionSetDetails.questions.map((question: any, index: number) => (
                            <div key={question.id} className="p-4 border rounded-lg">
                              <div className="font-medium mb-2">
                                {index + 1}. {question.question_text}
                              </div>
                              <div className="text-sm space-y-1 text-gray-600">
                                <div>A. {question.option_a}</div>
                                <div>B. {question.option_b}</div>
                                <div>C. {question.option_c}</div>
                                <div>D. {question.option_d}</div>
                              </div>
                              <div className="text-sm mt-2 text-green-600">
                                <strong>正确答案：</strong> {question.correct_answer}
                              </div>
                              {question.explanation && (
                                <div className="text-sm mt-1 text-blue-600">
                                  <strong>解析：</strong> {question.explanation}
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            暂无题目数据
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    获取题库详情失败
                  </div>
                )}
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={closeQuestionSetDetails}>
                  <X className="w-4 h-4 mr-2" />
                  关闭
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          {/* 删除题库确认对话框 */}
          <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                  确认删除题库
                </DialogTitle>
                <DialogDescription>
                  此操作将永久删除题库及其所有题目，且无法撤销
                </DialogDescription>
              </DialogHeader>
              
              {deletingQuestionSet && (
                <div className="space-y-4 py-4">
                  {/* 题库信息 */}
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="font-medium text-red-800">
                      题库名称：{deletingQuestionSet.name}
                    </div>
                    <div className="text-sm text-red-600 mt-1">
                      {deletingQuestionSet.description || '无描述'} • {deletingQuestionSet.questionsCount} 题
                    </div>
                    <div className="text-sm text-red-600 mt-2">
                      <strong>警告：</strong>删除后，此题库中的所有题目和相关考试记录都将被移除
                    </div>
                  </div>
                </div>
              )}
              
              <DialogFooter>
                <Button variant="outline" onClick={closeDeleteConfirm}>
                  <X className="w-4 h-4 mr-2" />
                  取消
                </Button>
                <Button 
                  variant="destructive"
                  onClick={confirmDeleteQuestionSet}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      删除中...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      确认删除
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  )
}