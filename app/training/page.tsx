"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ModuleHeader } from '@/components/module-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { BookOpen, Clock, Target, Users, ArrowRight, CheckCircle, GraduationCap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default function TrainingEntryPage() {
  const [employeeName, setEmployeeName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [availableSets, setAvailableSets] = useState<any[]>([])
  const [loadingStats, setLoadingStats] = useState(true)
  
  const router = useRouter()

  useEffect(() => {
    loadAvailableSets()
  }, [])

  const loadAvailableSets = async () => {
    try {
      const response = await fetch('/api/training/start')
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setAvailableSets(result.data.questionSets || [])
        }
      }
    } catch (error) {
      console.error('加载题库信息失败:', error)
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

    setError('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/training/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          employeeName: employeeName.trim()
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

  return (
    <>
      <ModuleHeader
        title="培训考试"
        description="员工在线培训考试系统"
        icon={GraduationCap}
        showAuthStatus={false}
      />
      
      <div className="pt-20 min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="container mx-auto max-w-4xl py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full mb-4">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            新员工入职培训考试
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            欢迎参加公司入职培训考试，本次考试将评估您对公司文化、产品知识和业务流程的掌握程度
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* 考试信息卡片 */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-600" />
                  考试说明
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">考试内容</p>
                    <p className="text-sm text-muted-foreground">涵盖公司基础文化、产品技术知识、市场客户开发、销售流程技巧、外贸运营实务等方面</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">考试时间</p>
                    <p className="text-sm text-muted-foreground">不限时，建议在安静的环境下认真作答</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">评分标准</p>
                    <p className="text-sm text-muted-foreground">满分100分，60分及以上为合格，系统自动评分</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 题库统计 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                  题库信息
                </CardTitle>
                <CardDescription>
                  系统将随机为您分配一套试卷
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingStats ? (
                  <div className="text-center py-4">
                    <div className="animate-pulse text-muted-foreground">加载中...</div>
                  </div>
                ) : availableSets.length > 0 ? (
                  <div className="space-y-3">
                    {availableSets.map((set, index) => (
                      <div key={set.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{set.name}</p>
                          <p className="text-xs text-muted-foreground">{set.description}</p>
                        </div>
                        <Badge variant="secondary">
                          {set.questionsCount} 题
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Alert>
                    <AlertDescription>
                      暂无可用题库，请联系管理员
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 开始考试表单 */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>开始考试</CardTitle>
                <CardDescription>
                  请输入您的姓名开始考试
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
                    <p className="text-xs text-muted-foreground">
                      请输入您的真实姓名，以便记录考试成绩
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full text-lg py-6"
                    disabled={isLoading || !employeeName.trim() || availableSets.length === 0}
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

        {/* 管理员入口 */}
        <div className="text-center mb-6">
          <Card className="inline-block">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div>
                  <p className="font-medium text-sm">管理员功能</p>
                  <p className="text-xs text-muted-foreground">查看考试统计和管理记录</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/training/admin')}
                  className="flex items-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  进入管理后台
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 底部信息 */}
        <div className="text-center text-sm text-muted-foreground">
          <p>© 2025 公司培训系统 - 本系统仅用于内部培训考试</p>
        </div>
      </div>
    </div>
    </>
  )
}