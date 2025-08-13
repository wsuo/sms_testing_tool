"use client"

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { AuthDialog } from '@/components/auth-dialog'
import { WithAdminAuth } from '@/components/with-admin-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Users, 
  TrendingUp, 
  Award, 
  FileDown,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Calendar,
  BarChart3,
  User,
  BookOpen,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  Shield,
  Lock
} from 'lucide-react'
import { ModuleHeader } from '@/components/module-header'

interface TrainingRecord {
  id: number
  employeeName: string
  questionSet: {
    id: number
    name: string
    description: string
  } | null
  score: number
  totalQuestions: number
  passed: boolean
  sessionDuration: number
  startedAt: string
  completedAt: string
  ipAddress: string
  answers: any[]
}

interface AnswerDetail {
  questionId: number
  questionNumber: number
  questionText: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  selectedAnswer: string
  correctAnswer: string
  isCorrect: boolean
  explanation?: string
}

interface Statistics {
  totalRecords: number
  totalEmployees: number
  averageScore: number
  passRate: number
  totalQuestions: number
  scoreDistribution: { scoreRange: string; count: number }[]
}

interface QuestionSet {
  id: number
  name: string
  description: string
  questionsCount: number
}

export default function TrainingAdminPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  
  const [records, setRecords] = useState<TrainingRecord[]>([])
  const [statistics, setStatistics] = useState<Statistics | null>(null)
  const [questionSets, setQuestionSets] = useState<QuestionSet[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  
  // 详情查看相关状态
  const [selectedRecord, setSelectedRecord] = useState<TrainingRecord | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  
  // 删除确认相关状态
  const [deleteRecord, setDeleteRecord] = useState<TrainingRecord | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)
  
  // 筛选条件
  const [filters, setFilters] = useState({
    employeeName: '',
    setId: 'all',
    minScore: '',
    maxScore: '',
    dateRange: 'all'
  })
  
  // 分页
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0
  })

  useEffect(() => {
    // 认证检查完成后再加载数据
    if (!authLoading) {
      if (isAuthenticated) {
        loadData()
      } else {
        // 如果未认证，显示认证对话框
        setShowAuthDialog(true)
        setLoading(false)
      }
    }
  }, [pagination.page, filters, isAuthenticated, authLoading])

  // 认证成功后的回调
  const handleAuthSuccess = () => {
    setShowAuthDialog(false)
    loadData()
  }

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''))
      })
      
      const response = await fetch(`/api/training/records?${params}`)
      const result = await response.json()
      
      if (result.success) {
        setRecords(result.data.records)
        setStatistics(result.data.statistics)
        setQuestionSets(result.data.questionSets || [])
        setPagination(prev => ({
          ...prev,
          total: result.data.pagination.total,
          totalPages: result.data.pagination.totalPages
        }))
      } else {
        setError(result.message || '加载数据失败')
      }
    } catch (error) {
      setError('网络连接失败')
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 })) // 重置到第一页
  }

  const handleExport = async (format: 'xlsx' | 'csv' = 'xlsx') => {
    try {
      setExporting(true)
      
      const params = new URLSearchParams({
        format,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''))
      })
      
      const response = await fetch(`/api/training/export?${params}`)
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `培训考试统计_${new Date().toISOString().slice(0, 10)}.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        const error = await response.json()
        throw new Error(error.message || '导出失败')
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : '导出失败')
    } finally {
      setExporting(false)
    }
  }

  const handleViewDetails = async (record: TrainingRecord) => {
    setSelectedRecord(record)
    setShowDetailsDialog(true)
  }

  const handleDeleteRecord = async (record: TrainingRecord) => {
    setDeleteRecord(record)
    setShowDeleteDialog(true)
  }

  const confirmDelete = async () => {
    if (!deleteRecord) return
    
    try {
      setDeleting(true)
      
      const response = await fetch(`/api/training/records/${deleteRecord.id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        // 刷新数据
        await loadData()
        setShowDeleteDialog(false)
        setDeleteRecord(null)
      } else {
        const error = await response.json()
        throw new Error(error.message || '删除失败')
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : '删除失败')
    } finally {
      setDeleting(false)
    }
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}分${remainingSeconds}秒`
  }

  const getScoreColor = (score: number, passed: boolean) => {
    if (!passed) return 'text-red-600'
    if (score >= 90) return 'text-green-600'
    if (score >= 80) return 'text-blue-600'
    return 'text-orange-600'
  }

  // 认证加载中的显示
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-100 to-gray-50 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZGVmcz4KICAgIDxwYXR0ZXJuIGlkPSJhIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiPgogICAgICA8Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMSkiLz4KICAgIDwvcGF0dGVybj4KICA8L2RlZnM+CiAgPHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNhKSIvPgo8L3N2Zz4=')] opacity-30 pointer-events-none" />
        
        <ModuleHeader
          title="培训管理"
          description="管理和查看员工培训考试记录"
          icon={Users}
          showAuthStatus={true}
        />
        
        <div className="pt-24 container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-muted-foreground">正在验证身份...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 未认证状态的显示
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-100 to-gray-50 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZGVmcz4KICAgIDxwYXR0ZXJuIGlkPSJhIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiPgogICAgICA8Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMSkiLz4KICAgIDwvcGF0dGVybj4KICA8L2RlZnM+CiAgPHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNhKSIvPgo8L3N2Zz4=')] opacity-30 pointer-events-none" />
        
        <ModuleHeader
          title="培训管理"
          description="管理和查看员工培训考试记录"
          icon={Users}
          showAuthStatus={true}
        />
        
        <div className="pt-24 container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <Card className="w-full max-w-md">
              <CardHeader className="text-center">
                <div className="flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mx-auto mb-4">
                  <Shield className="w-8 h-8 text-orange-600" />
                </div>
                <CardTitle className="text-xl">需要管理员认证</CardTitle>
                <CardDescription>
                  此页面需要管理员权限才能访问。请点击下方按钮进行身份验证。
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button 
                  onClick={() => setShowAuthDialog(true)}
                  size="lg"
                  className="w-full"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  管理员登录
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* 认证对话框 */}
        <AuthDialog
          isOpen={showAuthDialog}
          onClose={() => setShowAuthDialog(false)}
          onSuccess={handleAuthSuccess}
          title="培训管理员认证"
          description="请输入管理员密码以访问培训管理功能"
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-100 to-gray-50 relative overflow-hidden">
      {/* 动态背景装饰 */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZGVmcz4KICAgIDxwYXR0ZXJuIGlkPSJhIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiPgogICAgICA8Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMSkiLz4KICAgIDwvcGF0dGVybj4KICA8L2RlZnM+CiAgPHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNhKSIvPgo8L3N2Zz4=')] opacity-30 pointer-events-none" />
      
      <ModuleHeader
        title="培训管理"
        description="管理和查看员工培训考试记录"
        icon={Users}
        showAuthStatus={true}
      />
      
      <div className="pt-24 container mx-auto px-4 py-8 space-y-8">
        {/* 页面控制按钮 */}
        <div className="flex items-center justify-between">
          <div></div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={loadData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
            <Button onClick={() => handleExport('xlsx')} disabled={exporting}>
              <FileDown className="w-4 h-4 mr-2" />
              {exporting ? '导出中...' : '导出Excel'}
            </Button>
          </div>
        </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 统计概览卡片 */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总记录数</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalRecords}</div>
              <p className="text-xs text-muted-foreground">考试记录</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">参与人数</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalEmployees}</div>
              <p className="text-xs text-muted-foreground">独立员工</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">平均分数</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.averageScore}</div>
              <p className="text-xs text-muted-foreground">满分100分</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">通过率</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.passRate}%</div>
              <p className="text-xs text-muted-foreground">≥60分通过</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">平均题数</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalQuestions}</div>
              <p className="text-xs text-muted-foreground">每套试卷</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 分数分布统计 */}
      {statistics?.scoreDistribution && statistics.scoreDistribution.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              分数分布统计
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {statistics.scoreDistribution.map((dist) => (
                <div key={dist.scoreRange} className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{dist.count}</div>
                  <div className="text-sm text-muted-foreground">{dist.scoreRange}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 筛选器 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            筛选条件
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employeeName">员工姓名</Label>
              <Input
                id="employeeName"
                placeholder="搜索员工姓名"
                value={filters.employeeName}
                onChange={(e) => handleFilterChange('employeeName', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="questionSet">试卷类型</Label>
              <Select value={filters.setId} onValueChange={(value) => handleFilterChange('setId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="选择试卷类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部试卷</SelectItem>
                  {questionSets.map((set) => (
                    <SelectItem key={set.id} value={set.id.toString()}>
                      {set.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="minScore">最低分数</Label>
              <Input
                id="minScore"
                type="number"
                placeholder="0"
                min="0"
                max="100"
                value={filters.minScore}
                onChange={(e) => handleFilterChange('minScore', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="maxScore">最高分数</Label>
              <Input
                id="maxScore"
                type="number"
                placeholder="100"
                min="0"
                max="100"
                value={filters.maxScore}
                onChange={(e) => handleFilterChange('maxScore', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dateRange">时间范围</Label>
              <Select value={filters.dateRange} onValueChange={(value) => handleFilterChange('dateRange', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部时间</SelectItem>
                  <SelectItem value="today">今天</SelectItem>
                  <SelectItem value="week">最近一周</SelectItem>
                  <SelectItem value="month">最近一月</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 记录列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              考试记录 ({pagination.total})
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('csv')}
                disabled={exporting}
              >
                导出CSV
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-pulse text-muted-foreground">加载中...</div>
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无考试记录
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">员工姓名</th>
                      <th className="text-left p-3 font-medium">试卷类型</th>
                      <th className="text-left p-3 font-medium">得分</th>
                      <th className="text-left p-3 font-medium">状态</th>
                      <th className="text-left p-3 font-medium">用时</th>
                      <th className="text-left p-3 font-medium">完成时间</th>
                      <th className="text-left p-3 font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record) => (
                      <tr key={record.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{record.employeeName}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div>
                            <div className="font-medium text-sm">
                              {record.questionSet?.name || '未知试卷'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {record.totalQuestions} 题
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className={`text-lg font-bold ${getScoreColor(record.score, record.passed)}`}>
                            {record.score}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {Math.round((record.score / 100) * record.totalQuestions)}/{record.totalQuestions}
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant={record.passed ? "default" : "destructive"} className="flex items-center gap-1 w-fit">
                            {record.passed ? (
                              <CheckCircle className="w-3 h-3" />
                            ) : (
                              <XCircle className="w-3 h-3" />
                            )}
                            {record.passed ? '通过' : '未通过'}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1 text-sm">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            {formatDuration(record.sessionDuration)}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm">
                            {new Date(record.completedAt).toLocaleString()}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleViewDetails(record)}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              查看
                            </Button>
                            <WithAdminAuth actionName="删除考试记录">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleDeleteRecord(record)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                删除
                              </Button>
                            </WithAdminAuth>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* 分页 */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    共 {pagination.total} 条记录，第 {pagination.page} / {pagination.totalPages} 页
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                      disabled={pagination.page <= 1}
                    >
                      上一页
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                      disabled={pagination.page >= pagination.totalPages}
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 详情查看对话框 */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              考试详情分析 - {selectedRecord?.employeeName}
            </DialogTitle>
            <DialogDescription>
              逐题查看答题情况和解析，深入了解学习效果
            </DialogDescription>
          </DialogHeader>
          
          {selectedRecord && (
            <div className="space-y-6">
              {/* 基本信息 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">姓名</p>
                  <p className="font-medium">{selectedRecord.employeeName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">得分</p>
                  <p className={`font-bold text-lg ${getScoreColor(selectedRecord.score, selectedRecord.passed)}`}>
                    {selectedRecord.score}分
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">用时</p>
                  <p className="font-medium">{formatDuration(selectedRecord.sessionDuration)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">状态</p>
                  <Badge variant={selectedRecord.passed ? "default" : "destructive"}>
                    {selectedRecord.passed ? '通过' : '未通过'}
                  </Badge>
                </div>
              </div>

              {/* 答题详情 */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">答题详情分析</h3>
                  <div className="text-sm text-muted-foreground">
                    共 {selectedRecord.answers?.length || 0} 题
                  </div>
                </div>
                
                {/* 题目列表 - 采用卡片布局 */}
                <div className="space-y-6">
                  {selectedRecord.answers?.map((answer: AnswerDetail, index: number) => (
                    <Card key={answer.questionId} className="overflow-hidden">
                      {/* 题目头部 */}
                      <CardHeader className={`pb-4 ${
                        answer.isCorrect 
                          ? 'bg-green-50 border-b border-green-100' 
                          : 'bg-red-50 border-b border-red-100'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`flex items-center justify-center w-10 h-10 rounded-full text-base font-bold ${
                              answer.isCorrect 
                                ? 'bg-green-500 text-white' 
                                : 'bg-red-500 text-white'
                            }`}>
                              {answer.questionNumber}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                {answer.isCorrect ? (
                                  <CheckCircle className="w-5 h-5 text-green-600" />
                                ) : (
                                  <XCircle className="w-5 h-5 text-red-600" />
                                )}
                                <span className={`font-medium ${
                                  answer.isCorrect ? 'text-green-700' : 'text-red-700'
                                }`}>
                                  {answer.isCorrect ? '✓ 回答正确' : '✗ 回答错误'}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                正确答案: {answer.correctAnswer} | 员工选择: {answer.selectedAnswer || '未作答'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="p-6">
                        {/* 题目内容 */}
                        <div className="mb-6">
                          <h4 className="font-medium text-lg text-gray-900 mb-4 leading-relaxed">
                            {answer.questionText}
                          </h4>
                          
                          {/* 选项网格布局 */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {['A', 'B', 'C', 'D'].map((option) => {
                              const optionText = answer[`option${option}` as keyof AnswerDetail] as string
                              const isSelected = answer.selectedAnswer === option
                              const isCorrect = answer.correctAnswer === option
                              
                              return (
                                <div
                                  key={option}
                                  className={`relative p-4 rounded-lg border-2 transition-all duration-200 ${
                                    isCorrect
                                      ? 'bg-green-50 border-green-400 shadow-md'
                                      : isSelected && !isCorrect
                                      ? 'bg-red-50 border-red-400 shadow-md'
                                      : 'bg-white border-gray-200 hover:border-gray-300'
                                  }`}
                                >
                                  <div className="flex items-start gap-3">
                                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                      isCorrect
                                        ? 'bg-green-500 text-white'
                                        : isSelected && !isCorrect
                                        ? 'bg-red-500 text-white'
                                        : 'bg-gray-200 text-gray-600'
                                    }`}>
                                      {option}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm text-gray-900 leading-relaxed">
                                        {optionText}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  {/* 状态标识 */}
                                  <div className="absolute top-2 right-2 flex gap-1">
                                    {isSelected && (
                                      <Badge 
                                        variant={isCorrect ? "default" : "destructive"} 
                                        className="text-xs px-2 py-1"
                                      >
                                        选择
                                      </Badge>
                                    )}
                                    {isCorrect && (
                                      <Badge 
                                        variant="outline" 
                                        className="text-xs px-2 py-1 bg-green-100 border-green-300 text-green-800"
                                      >
                                        正解
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>

                        {/* 解析说明 */}
                        {answer.explanation && (
                          <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs font-bold">?</span>
                              </div>
                              <div>
                                <h5 className="font-medium text-blue-900 mb-2">题目解析</h5>
                                <p className="text-blue-800 leading-relaxed">
                                  {answer.explanation}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )) || (
                    <Card>
                      <CardContent className="text-center py-12">
                        <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-muted-foreground">暂无答题详情</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              确认删除
            </DialogTitle>
            <DialogDescription>
              您确定要删除这条考试记录吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          
          {deleteRecord && (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="space-y-2">
                  <p><span className="font-medium">员工姓名：</span>{deleteRecord.employeeName}</p>
                  <p><span className="font-medium">考试得分：</span>{deleteRecord.score}分</p>
                  <p><span className="font-medium">完成时间：</span>{new Date(deleteRecord.completedAt).toLocaleString()}</p>
                </div>
              </div>
              
              <div className="flex items-center justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowDeleteDialog(false)}
                  disabled={deleting}
                >
                  取消
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={confirmDelete}
                  disabled={deleting}
                >
                  {deleting ? '删除中...' : '确认删除'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </div>
  )
}