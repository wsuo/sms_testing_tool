"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ModuleHeader } from '@/components/module-header'
import { PlatformFooter } from '@/components/platform-footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, Clock, User, BookOpen, AlertCircle, ArrowLeft, ArrowRight, GraduationCap } from 'lucide-react'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'

interface ExamData {
  sessionId: string
  employeeName: string
  questionSet: {
    id: number
    name: string
    description: string
    totalQuestions: number
  }
  questions: Question[]
  startedAt: string
}

interface Question {
  id: number
  questionNumber: number
  section: string
  questionText: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  explanation?: string
}

export default function TrainingExamPage() {
  const [examData, setExamData] = useState<ExamData | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<{[key: number]: string}>({})
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false)
  
  const router = useRouter()

  // 页面离开时清空答题数据
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
      return ''
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // 页面隐藏时清空答题数据
        if (examData) {
          localStorage.removeItem('trainingExamData')
          localStorage.removeItem(`exam-answers-${examData.sessionId}`)
        }
      }
    }

    // 添加事件监听
    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [examData])

  // 加载考试数据
  useEffect(() => {
    const savedExamData = localStorage.getItem('trainingExamData')
    if (savedExamData) {
      try {
        const data = JSON.parse(savedExamData)
        setExamData(data)
        
        // 加载已保存的答案
        const savedAnswers = localStorage.getItem(`exam-answers-${data.sessionId}`)
        if (savedAnswers) {
          setAnswers(JSON.parse(savedAnswers))
        }
      } catch (error) {
        console.error('加载考试数据失败:', error)
        router.push('/training')
      }
    } else {
      // 没有考试数据，重定向到入口页面
      router.push('/training')
    }
  }, [router])

  // 计时器
  useEffect(() => {
    if (!examData) return

    const startTime = new Date(examData.startedAt).getTime()
    
    const timer = setInterval(() => {
      const now = Date.now()
      const elapsed = Math.floor((now - startTime) / 1000)
      setElapsedTime(elapsed)
    }, 1000)

    return () => clearInterval(timer)
  }, [examData])

  // 保存答案到localStorage
  const saveAnswersToLocal = useCallback((newAnswers: {[key: number]: string}) => {
    if (examData) {
      localStorage.setItem(`exam-answers-${examData.sessionId}`, JSON.stringify(newAnswers))
    }
  }, [examData])

  // 处理答案选择
  const handleAnswerSelect = (questionId: number, selectedAnswer: string) => {
    const newAnswers = { ...answers, [questionId]: selectedAnswer }
    setAnswers(newAnswers)
    saveAnswersToLocal(newAnswers)
  }

  // 导航到指定题目
  const goToQuestion = (index: number) => {
    if (index >= 0 && index < (examData?.questions.length || 0)) {
      setCurrentQuestionIndex(index)
    }
  }

  // 提交答案
  const handleSubmit = async () => {
    if (!examData) return

    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/training/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: examData.sessionId,
          employeeName: examData.employeeName,
          setId: examData.questionSet.id,
          startedAt: examData.startedAt,
          answers
        })
      })

      const result = await response.json()

      if (result.success) {
        // 保存结果到localStorage
        localStorage.setItem('examResult', JSON.stringify(result.data))
        
        // 清理考试数据
        localStorage.removeItem('trainingExamData')
        localStorage.removeItem(`exam-answers-${examData.sessionId}`)
        
        // 跳转到结果页面
        router.push('/training/result')
      } else {
        setError(result.message || '提交失败，请重试')
      }
    } catch (error) {
      setError('网络连接失败，请检查网络后重试')
    } finally {
      setIsSubmitting(false)
      setShowConfirmSubmit(false)
    }
  }

  // 格式化时间
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  if (!examData) {
    return (
      <>
        <ModuleHeader
          title="在线考试"
          description="员工培训考试系统 - 加载中"
          icon={GraduationCap}
          showAuthStatus={false}
        />
        
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-100 to-gray-50 flex items-center justify-center pt-28">
          <div className="text-center space-y-6">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto" />
              <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-teal-400 rounded-full animate-spin animate-reverse mx-auto" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-medium text-gray-600">正在加载考试数据...</p>
              <p className="text-sm text-gray-500">请稍候，系统正在准备您的试卷</p>
            </div>
          </div>
        </div>
      </>
    )
  }

  const currentQuestion = examData.questions[currentQuestionIndex]
  const answeredCount = Object.keys(answers).length
  const isAllAnswered = answeredCount === examData.questions.length

  return (
    <>
      <ModuleHeader
        title="在线考试"
        description="员工培训考试系统 - 答题进行中"
        icon={GraduationCap}
        showAuthStatus={false}
      />
      
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-100 to-gray-50 relative overflow-hidden pt-28">
        {/* 动态背景装饰 */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZGVmcz4KICAgIDxwYXR0ZXJuIGlkPSJhIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiPgogICAgICA8Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMSkiLz4KICAgIDwvcGF0dGVybj4KICA8L2RlZnM+CiAgPHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNhKSIvPgo8L3N2Zz4=')] opacity-30 pointer-events-none" />
        
        {/* 主要内容区域 */}
        <div className="container mx-auto px-4 py-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
              {/* 题目导航侧边栏 - 在左侧，固定宽度 */}
              <div className="lg:w-80 lg:flex-shrink-0 order-1">
                <Card className="bg-white/95 backdrop-blur-xl border-emerald-200/50 shadow-lg">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-gray-600 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-emerald-600" />
                      答题进度
                    </CardTitle>
                    <CardDescription className="text-xs text-gray-500">
                      点击题号快速跳转
                    </CardDescription>
                  </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-6 gap-1.5">
                        {examData.questions.map((_, index) => {
                          const questionId = examData.questions[index].id
                          const isAnswered = answers.hasOwnProperty(questionId)
                          const isCurrent = index === currentQuestionIndex
                          
                          return (
                            <button
                              key={index}
                              onClick={() => goToQuestion(index)}
                              className={`
                                w-full h-9 text-xs rounded-lg flex items-center justify-center font-medium transition-all duration-200 transform hover:scale-105
                                ${isCurrent 
                                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg' 
                                  : isAnswered 
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-300' 
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300'
                                }
                              `}
                            >
                              {index + 1}
                            </button>
                          )
                        })}
                      </div>
                      
                      <div className="mt-4 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg">
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" />
                            <span className="text-emerald-700 font-medium">当前题目</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-100 rounded-full border border-green-300" />
                            <span className="text-green-700">已作答</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-gray-100 rounded-full border border-gray-300" />
                            <span className="text-gray-600">未作答</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                </Card>
              </div>

              {/* 主要答题区域 - 在右侧，占更多空间 */}
              <div className="flex-1 order-2">
                <div className="space-y-4">
                  {/* 进度状态卡片 */}
                  <Card className="bg-white/95 backdrop-blur-xl border-emerald-200/50 shadow-lg">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border-emerald-200">
                            <User className="w-3 h-3" />
                            {examData.employeeName}
                          </Badge>
                          <Badge variant="outline" className="flex items-center gap-2 bg-blue-50 text-blue-700 border-blue-200">
                            <BookOpen className="w-3 h-3" />
                            {examData.questionSet.name}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 text-sm bg-white/50 px-3 py-1 rounded-full border">
                            <Clock className="w-4 h-4 text-orange-600" />
                            <span className="font-medium">{formatTime(elapsedTime)}</span>
                          </div>
                          
                          <div className="text-sm bg-white/50 px-3 py-1 rounded-full border">
                            <span className="text-green-600 font-medium">{answeredCount}</span>
                            <span className="text-muted-foreground"> / {examData.questions.length}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-600">
                            已完成 {answeredCount} / {examData.questions.length} 题
                          </span>
                          <span className="text-xs text-gray-500">
                            (当前第 {currentQuestionIndex + 1} 题)
                          </span>
                        </div>
                        <Progress value={(answeredCount / examData.questions.length) * 100} className="h-2.5 bg-gray-200 [&>div]:bg-gradient-to-r [&>div]:from-emerald-500 [&>div]:to-teal-500" />
                      </div>
                    </CardContent>
                  </Card>

                  {/* 当前题目 */}
                  <Card className="bg-white/95 backdrop-blur-xl border-emerald-200/50 shadow-lg">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-3">
                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                              第 {currentQuestion.questionNumber} 题
                            </Badge>
                            {currentQuestion.section && (
                              <Badge variant="outline" className="border-teal-200 text-teal-700">
                                {currentQuestion.section}
                              </Badge>
                            )}
                          </div>
                          <CardTitle className="text-lg lg:text-xl leading-relaxed text-gray-700">
                            {currentQuestion.questionText}
                          </CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="space-y-3">
                        {[
                          { key: 'A', text: currentQuestion.optionA },
                          { key: 'B', text: currentQuestion.optionB },
                          { key: 'C', text: currentQuestion.optionC },
                          { key: 'D', text: currentQuestion.optionD }
                        ].map(option => {
                          const isSelected = answers[currentQuestion.id] === option.key
                          return (
                            <div 
                              key={option.key}
                              onClick={() => handleAnswerSelect(currentQuestion.id, option.key)}
                              className={`flex items-start space-x-3 p-3 lg:p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer ${
                                isSelected 
                                  ? 'border-emerald-300 bg-emerald-50 shadow-sm' 
                                  : 'border-gray-200 hover:border-emerald-200 hover:bg-emerald-50/30'
                              }`}
                            >
                              <div className="flex-1 cursor-pointer leading-relaxed text-sm lg:text-base">
                                <span className={`font-medium mr-2 lg:mr-3 inline-flex items-center justify-center w-5 h-5 lg:w-6 lg:h-6 rounded-full text-xs ${
                                  isSelected 
                                    ? 'bg-emerald-500 text-white' 
                                    : 'bg-gray-200 text-gray-600'
                                }`}>
                                  {option.key}
                                </span>
                                <span className={isSelected ? 'text-emerald-700 font-medium' : 'text-gray-700'}>
                                  {option.text}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* 导航按钮 */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <Button
                      variant="outline"
                      onClick={() => goToQuestion(currentQuestionIndex - 1)}
                      disabled={currentQuestionIndex === 0}
                      className="w-full sm:w-auto flex items-center gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      上一题
                    </Button>

                    <div className="flex items-center gap-3">
                      {currentQuestionIndex === examData.questions.length - 1 ? (
                        <Button
                          onClick={() => setShowConfirmSubmit(true)}
                          disabled={!isAllAnswered}
                          className="w-full sm:w-auto flex items-center gap-2 px-6 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg"
                        >
                          <CheckCircle className="w-4 h-4" />
                          提交试卷
                        </Button>
                      ) : (
                        <Button
                          onClick={() => goToQuestion(currentQuestionIndex + 1)}
                          disabled={currentQuestionIndex === examData.questions.length - 1}
                          className="w-full sm:w-auto flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                        >
                          下一题
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* 提交确认对话框 */}
                  {showConfirmSubmit && (
                    <Card className="border-orange-200 bg-orange-50/90 backdrop-blur-sm shadow-lg">
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                          <AlertCircle className="w-6 h-6 text-orange-500 mt-0.5" />
                          <div className="flex-1">
                            <h3 className="font-semibold text-orange-900 mb-2">
                              确认提交试卷
                            </h3>
                            <p className="text-orange-800 mb-4">
                              您已完成 {answeredCount} / {examData.questions.length} 道题目。
                              {!isAllAnswered && '请注意：还有题目未作答，提交后将按错误计分。'}
                              提交后将无法修改答案，请确认是否提交？
                            </p>
                            
                            {error && (
                              <Alert variant="destructive" className="mb-4">
                                <AlertDescription>{error}</AlertDescription>
                              </Alert>
                            )}
                            
                            <div className="flex flex-col sm:flex-row items-center gap-3">
                              <Button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="w-full sm:w-auto flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                              >
                                {isSubmitting ? (
                                  <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    提交中...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="w-4 h-4" />
                                    确认提交
                                  </>
                                )}
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => setShowConfirmSubmit(false)}
                                disabled={isSubmitting}
                                className="w-full sm:w-auto border-orange-300 text-orange-700 hover:bg-orange-100"
                              >
                                继续答题
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* 底部信息 */}
        <div className="mt-4 pb-6">
          <PlatformFooter className="text-center" />
        </div>
      </div>
    </>
  )
}
