"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ModuleHeader } from '@/components/module-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  BookOpen, 
  Clock, 
  Target, 
  Users, 
  ArrowRight, 
  CheckCircle, 
  GraduationCap,
  Building2,
  Award,
  Shield,
  Scale,
  RefreshCw
} from 'lucide-react'
import { PlatformFooter } from '@/components/platform-footer'

interface ExamCategory {
  id: number
  name: string
  description?: string
  icon?: string
  color?: string
  question_sets_count?: number
  total_questions?: number
}

interface QuestionSet {
  id: number
  name: string
  description?: string
  questionsCount: number
  category?: {
    id: number
    name: string
    color: string
    icon: string
  }
}

const getIconComponent = (iconName?: string) => {
  switch (iconName) {
    case 'GraduationCap': return GraduationCap
    case 'Building2': return Building2
    case 'Award': return Award
    case 'Shield': return Shield
    case 'Scale': return Scale
    default: return BookOpen
  }
}

export default function TrainingEntryPage() {
  const [employeeName, setEmployeeName] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [categories, setCategories] = useState<ExamCategory[]>([])
  const [availableSets, setAvailableSets] = useState<QuestionSet[]>([])
  const [loadingStats, setLoadingStats] = useState(true)
  const [passScore, setPassScore] = useState(60)
  
  const router = useRouter()

  useEffect(() => {
    loadAvailableData()
  }, [])

  const loadAvailableData = async () => {
    try {
      setLoadingStats(true)
      
      // 并行加载数据
      const [startResponse, configResponse] = await Promise.all([
        fetch('/api/training/start'),
        fetch('/api/public-config?key=training_pass_score')
      ])
      
      if (startResponse.ok) {
        const result = await startResponse.json()
        if (result.success) {
          setCategories(result.data.categories || [])
          setAvailableSets(result.data.questionSets || [])
          
          // 设置默认选择的类别（选择第一个有题库的类别）
          if (result.data.categories?.length > 0) {
            const categoryWithSets = result.data.categories.find((cat: ExamCategory) => 
              result.data.questionSets?.some((set: QuestionSet) => set.category?.id === cat.id)
            )
            if (categoryWithSets) {
              setSelectedCategory(categoryWithSets.id.toString())
            }
          }
        }
      }
      
      // 加载合格分数配置
      if (configResponse.ok) {
        const configResult = await configResponse.json()
        if (configResult.success) {
          setPassScore(parseInt(configResult.data.value) || 60)
        }
      }
    } catch (error) {
      console.error('加载页面信息失败:', error)
      setError('加载页面信息失败，请刷新重试')
    } finally {
      setLoadingStats(false)
    }
  }

  const handleStartExam = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!employeeName.trim()) {
      setError('请输入您的姓名')
      return
    }

    if (!selectedCategory) {
      setError('请选择考核类别')
      return
    }

    setError('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/training/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          employeeName: employeeName.trim(),
          categoryId: parseInt(selectedCategory)
        })
      })

      const result = await response.json()

      if (result.success) {
        // 将考试数据保存到localStorage
        localStorage.setItem('trainingExamData', JSON.stringify(result.data))
        
        // 跳转到答题页面
        router.push('/training/exam')
      } else {
        setError(result.message || '开始考试失败')
      }
    } catch (error) {
      setError('网络连接失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  // 获取选中类别的题库
  const getCategoryQuestionSets = (categoryId: string) => {
    if (!categoryId) return []
    return availableSets.filter(set => set.category?.id === parseInt(categoryId))
  }

  const selectedCategoryData = categories.find(cat => cat.id.toString() === selectedCategory)
  const categoryQuestionSets = getCategoryQuestionSets(selectedCategory)

  return (
    <>
      <ModuleHeader
        title="员工考核系统"
        description="在线考核评估平台"
        icon={GraduationCap}
        showAuthStatus={false}
      />
      
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-100 to-gray-50 relative overflow-hidden pt-24 p-4">
        {/* 动态背景装饰 */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZGVmcz4KICAgIDxwYXR0ZXJuIGlkPSJhIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiPgogICAgICA8Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMSkiLz4KICAgIDwvcGF0dGVybj4KICA8L2RlZnM+CiAgPHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNhKSIvPgo8L3N2Zz4=')] opacity-30 pointer-events-none" />
        
        <div className="container mx-auto max-w-4xl py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full mb-4">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            公司业务考核
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            选择适合的考核类别，提升专业技能和业务水平
          </p>
        </div>

        {loadingStats ? (
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-gray-500">正在加载考核信息...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            
            {/* 左侧：考核类别选择 */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    选择考核类别
                  </CardTitle>
                  <CardDescription>
                    请选择您要参加的考核类别，系统将随机分配该类别下的试卷
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {categories.length > 0 ? (
                    <div className="space-y-3">
                      {categories.map((category) => {
                        const IconComponent = getIconComponent(category.icon)
                        const setsCount = availableSets.filter(set => set.category?.id === category.id).length
                        const totalQuestions = availableSets
                          .filter(set => set.category?.id === category.id)
                          .reduce((sum, set) => sum + set.questionsCount, 0)
                        
                        return (
                          <div
                            key={category.id}
                            onClick={() => setsCount > 0 && setSelectedCategory(category.id.toString())}
                            className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                              selectedCategory === category.id.toString()
                                ? 'border-blue-500 bg-blue-50 shadow-md'
                                : setsCount > 0
                                ? 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                                : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div 
                                className={`w-10 h-10 rounded-full flex items-center justify-center`}
                                style={{ backgroundColor: category.color || '#3b82f6' }}
                              >
                                <IconComponent className="w-5 h-5 text-white" />
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">{category.name}</div>
                                <div className="text-sm text-gray-500 mt-1">
                                  {category.description || '暂无描述'}
                                </div>
                                <div className="flex items-center gap-4 mt-2">
                                  <Badge variant={setsCount > 0 ? "secondary" : "outline"}>
                                    {setsCount} 套试卷
                                  </Badge>
                                  {totalQuestions > 0 && (
                                    <Badge variant="outline">
                                      {totalQuestions} 题
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              {selectedCategory === category.id.toString() && (
                                <CheckCircle className="w-5 h-5 text-blue-500" />
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <Alert>
                      <AlertDescription>
                        暂无可用的考核类别，请联系管理员
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* 右侧：开始考试表单 */}
            <div className="space-y-6">
              {/* 考试说明 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-orange-500" />
                    考试说明
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">考试内容</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedCategoryData ? 
                          `${selectedCategoryData.name}相关知识和技能考核` : 
                          '请先选择考核类别'
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">评分标准</p>
                      <p className="text-sm text-muted-foreground">满分100分，{passScore}分及以上为合格</p>
                    </div>
                  </div>
                  {categoryQuestionSets.length > 0 && (
                    <div className="flex items-start gap-3">
                      <BookOpen className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">可用试卷</p>
                        <p className="text-sm text-muted-foreground">
                          {categoryQuestionSets.length} 套试卷，系统将随机选择
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 开始考试表单 */}
              <Card>
                <CardHeader>
                  <CardTitle>开始考试</CardTitle>
                  <CardDescription>
                    请输入您的姓名并确认考核类别
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleStartExam} className="space-y-4">
                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="employeeName">姓名 *</Label>
                      <Input
                        id="employeeName"
                        type="text"
                        placeholder="请输入您的姓名"
                        value={employeeName}
                        onChange={(e) => setEmployeeName(e.target.value)}
                        required
                        className="text-lg py-3"
                        autoComplete="name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>选择考核类别 *</Label>
                      <div className="p-3 border rounded-md bg-gray-50">
                        {selectedCategoryData ? (
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-8 h-8 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: selectedCategoryData.color || '#3b82f6' }}
                            >
                              {React.createElement(getIconComponent(selectedCategoryData.icon), { 
                                className: "w-4 h-4 text-white" 
                              })}
                            </div>
                            <div>
                              <div className="font-medium">{selectedCategoryData.name}</div>
                              <div className="text-sm text-gray-500">
                                {categoryQuestionSets.length} 套试卷可用
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-gray-500">请先选择考核类别</div>
                        )}
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full text-lg py-6"
                      disabled={isLoading || !employeeName.trim() || !selectedCategory || categoryQuestionSets.length === 0}
                      size="lg"
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          正在准备考试...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          开始考试
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* 注意事项 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">注意事项</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p>• 请在安静的环境下独立完成考试</p>
                  <p>• 每道题只有一个正确答案</p>
                  <p>• 提交后无法修改，请仔细检查答案</p>
                  <p>• 如遇技术问题，请联系IT支持</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* 管理员入口 */}
        <div className="text-center mb-6">
          <Card className="inline-block">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div>
                  <p className="font-medium text-sm">管理员功能</p>
                  <p className="text-xs text-muted-foreground">管理题库、编辑题目、查看考试统计和类别配置</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push('/training/import')}
                    className="flex items-center gap-2"
                  >
                    <BookOpen className="w-4 h-4" />
                    题库管理
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push('/training/admin')}
                    className="flex items-center gap-2"
                  >
                    <Users className="w-4 h-4" />
                    考试管理
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 底部信息 */}
        <PlatformFooter />
      </div>
    </div>
    </>
  )
}