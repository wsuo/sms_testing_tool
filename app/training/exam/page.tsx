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
import { CheckCircle, Clock, User, BookOpen, AlertCircle, ArrowLeft, ArrowRight, GraduationCap, MousePointer2, X, Info } from 'lucide-react'
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
  const [timeLimit, setTimeLimit] = useState(35) // 默认35分钟
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [isTimeUp, setIsTimeUp] = useState(false)
  const [showTimeWarning, setShowTimeWarning] = useState(false)
  const [timeWarningLevel, setTimeWarningLevel] = useState<'none' | 'warning' | 'urgent'>('none')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false)
  const [showDoubleClickTip, setShowDoubleClickTip] = useState(true)
  
  // 隐藏的作弊功能状态
  const [secretClickCount, setSecretClickCount] = useState(0)
  const [correctAnswers, setCorrectAnswers] = useState<{[key: number]: string}>({})
  
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
        
        // 加载时间限制配置
        loadTimeLimit()
      } catch (error) {
        console.error('加载考试数据失败:', error)
        router.push('/training')
      }
    } else {
      // 没有考试数据，重定向到入口页面
      router.push('/training')
    }
  }, [router])

  // 加载时间限制配置
  const loadTimeLimit = async () => {
    try {
      const response = await fetch('/api/public-config?key=exam_time_limit')
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          const limit = parseInt(result.data.value)
          setTimeLimit(limit)
          
          // 如果已经有考试数据，初始化剩余时间
          if (examData) {
            const startTime = new Date(examData.startedAt).getTime()
            const now = Date.now()
            const elapsed = Math.floor((now - startTime) / 1000)
            const remaining = Math.max(0, (limit * 60) - elapsed)
            setTimeRemaining(remaining)
          }
        }
      }
    } catch (error) {
      console.error('加载时间限制配置失败:', error)
      // 使用默认35分钟
    }
  }

  // 测试超时自动提交功能（仅开发环境）
  const testAutoSubmit = () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('测试超时自动提交功能...')
      setTimeRemaining(0)
      setIsTimeUp(true)
      handleAutoSubmit()
    }
  }
  useEffect(() => {
    if (examData && timeLimit) {
      const startTime = new Date(examData.startedAt).getTime()
      const now = Date.now()
      const elapsed = Math.floor((now - startTime) / 1000)
      const remaining = Math.max(0, (timeLimit * 60) - elapsed)
      setTimeRemaining(remaining)
    }
  }, [examData, timeLimit])

  // 自动提交（时间到期）
  const handleAutoSubmit = useCallback(async () => {
    if (!examData || isSubmitting) return

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
          categoryId: examData.category?.id, // 新增类别ID
          startedAt: examData.startedAt,
          answers,
          autoSubmitted: true // 标记为自动提交
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()

      if (result.success) {
        // 保存结果到localStorage
        localStorage.setItem('examResult', JSON.stringify({
          ...result.data,
          autoSubmitted: true
        }))
        
        // 清理考试数据
        localStorage.removeItem('trainingExamData')
        localStorage.removeItem(`exam-answers-${examData.sessionId}`)
        
        // 跳转到结果页面
        router.push('/training/result')
      } else {
        setError(result.message || '自动提交失败')
      }
    } catch (error) {
      console.error('自动提交失败:', error)
      setError('自动提交失败，请手动提交')
    } finally {
      setIsSubmitting(false)
    }
  }, [examData, isSubmitting, answers, router])

  // 计时器和倒计时
  useEffect(() => {
    if (!examData || !timeLimit) return

    const startTime = new Date(examData.startedAt).getTime()
    const timeLimitMs = timeLimit * 60 * 1000 // 转换为毫秒
    
    const timer = setInterval(() => {
      const now = Date.now()
      const elapsed = Math.floor((now - startTime) / 1000)
      const remaining = Math.floor((timeLimitMs - (now - startTime)) / 1000)
      
      setElapsedTime(elapsed)
      setTimeRemaining(Math.max(0, remaining))
      
      // 时间警告级别设置
      if (remaining <= 60 && remaining > 0) { // 最后1分钟
        setTimeWarningLevel('urgent')
        setShowTimeWarning(true)
      } else if (remaining <= 300 && remaining > 60) { // 最后5分钟
        setTimeWarningLevel('warning')
        setShowTimeWarning(true)
      } else {
        setTimeWarningLevel('none')
        setShowTimeWarning(false)
      }
      
      // 时间到了自动提交
      if (remaining <= 0 && !isTimeUp) {
        console.log(`[考试系统] 时间到期，触发自动提交。剩余时间: ${remaining}秒`)
        setIsTimeUp(true)
        handleAutoSubmit()
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [examData, timeLimit, handleAutoSubmit, isTimeUp])

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

  // 处理双击选项：选择答案并跳转到下一题
  const handleDoubleClickOption = (questionId: number, selectedAnswer: string) => {
    // 首先选择答案
    handleAnswerSelect(questionId, selectedAnswer)
    
    // 延迟一点时间让用户看到选择效果，然后跳转到下一题
    setTimeout(() => {
      if (currentQuestionIndex < (examData?.questions.length || 0) - 1) {
        goToQuestion(currentQuestionIndex + 1)
      }
    }, 300) // 300ms延迟，让用户看到选择效果
  }

  // 关闭双击提示
  const dismissDoubleClickTip = () => {
    setShowDoubleClickTip(false)
    // 保存到localStorage，下次不再显示
    localStorage.setItem('hideDoubleClickTip', 'true')
  }

  // 检查是否应该显示双击提示
  useEffect(() => {
    const hideDoubleClickTip = localStorage.getItem('hideDoubleClickTip')
    if (hideDoubleClickTip === 'true') {
      setShowDoubleClickTip(false)
    }
  }, [])

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
    
    console.log('开始提交答案...', { sessionId: examData.sessionId, answersCount: Object.keys(answers).length })

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
          categoryId: examData.category?.id, // 新增类别ID
          startedAt: examData.startedAt,
          answers
        })
      })

      console.log('API 响应状态:', response.status)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      console.log('API 响应结果:', result)

      if (result.success) {
        console.log('提交成功，准备跳转...')
        
        // 保存结果到localStorage
        localStorage.setItem('examResult', JSON.stringify(result.data))
        
        // 清理考试数据
        localStorage.removeItem('trainingExamData')
        localStorage.removeItem(`exam-answers-${examData.sessionId}`)
        
        // 确保状态更新后再跳转
        setTimeout(() => {
          console.log('执行页面跳转到结果页面')
          router.push('/training/result')
        }, 100)
      } else {
        console.error('提交失败:', result.message)
        setError(result.message || '提交失败，请重试')
      }
    } catch (error) {
      console.error('提交过程中发生错误:', error)
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      setError(`提交失败：${errorMessage}`)
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
  
  // 格式化剩余时间（带颜色提示）
  const formatRemainingTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    const timeStr = `${minutes}:${secs.toString().padStart(2, '0')}`
    
    // 根据剩余时间返回不同的颜色样式
    if (seconds <= 300) { // 最后5分钟，红色警告
      return { text: timeStr, className: 'text-red-600 font-bold animate-pulse' }
    } else if (seconds <= 600) { // 最后10分钟，橙色提醒
      return { text: timeStr, className: 'text-orange-600 font-semibold' }
    } else {
      return { text: timeStr, className: 'text-gray-700' }
    }
  }
  
  // 隐藏的作弊功能 - 获取正确答案
  const loadCorrectAnswers = useCallback(async () => {
    if (!examData) return
    
    try {
      // 使用特殊的API来获取正确答案
      const response = await fetch('/api/training/answers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: examData.sessionId,
          setId: examData.questionSet.id
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data.correctAnswers) {
          const correctAnswersMap: {[key: number]: string} = {}
          result.data.correctAnswers.forEach((answer: any) => {
            correctAnswersMap[answer.questionId] = answer.correctAnswer
          })
          setCorrectAnswers(correctAnswersMap)
          
          // 静默填入所有正确答案
          const newAnswers = { ...answers }
          examData.questions.forEach(question => {
            if (correctAnswersMap[question.id]) {
              newAnswers[question.id] = correctAnswersMap[question.id]
            }
          })
          
          setAnswers(newAnswers)
          saveAnswersToLocal(newAnswers)
        }
      }
    } catch (error) {
      // 静默失败，不显示任何错误信息
      console.debug('Special operation failed', error)
    }
  }, [examData, answers, saveAnswersToLocal])
  
  // 隐藏的点击事件处理
  const handleSecretClick = useCallback(() => {
    const newCount = secretClickCount + 1
    setSecretClickCount(newCount)
    
    if (newCount === 5) {
      // 达到触发次数，执行隐藏功能
      loadCorrectAnswers()
      setSecretClickCount(0) // 重置计数
    } else if (newCount > 10) {
      // 防止计数器无限增长
      setSecretClickCount(0)
    }
  }, [secretClickCount, loadCorrectAnswers])

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
              <div className={`flex-1 order-2 transition-all duration-300 ${
                timeWarningLevel === 'urgent' ? 'animate-pulse' : ''
              }`}>
                <div className="space-y-4">
                  {/* 进度状态卡片 */}
                  <Card className={`backdrop-blur-xl shadow-lg transition-all duration-300 ${
                    timeWarningLevel === 'urgent' ? 'bg-red-50/95 border-red-300' :
                    timeWarningLevel === 'warning' ? 'bg-orange-50/95 border-orange-300' :
                    'bg-white/95 border-emerald-200/50'
                  }`}>
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
                          {/* 倒计时显示 */}
                          <div className={`flex items-center gap-2 text-sm px-3 py-1 rounded-full border transition-all duration-300 ${
                            timeWarningLevel === 'urgent' ? 'bg-red-100 border-red-300 shadow-lg animate-pulse' : 
                            timeWarningLevel === 'warning' ? 'bg-orange-100 border-orange-300 shadow-md' : 
                            'bg-blue-50 border-blue-200'
                          }`}>
                            <Clock className={`w-4 h-4 transition-colors duration-300 ${
                              timeWarningLevel === 'urgent' ? 'text-red-600 animate-bounce' :
                              timeWarningLevel === 'warning' ? 'text-orange-600' : 'text-blue-600'
                            }`} />
                            <span className={`font-medium transition-colors duration-300 ${
                              timeWarningLevel === 'urgent' ? 'text-red-700 font-bold' :
                              timeWarningLevel === 'warning' ? 'text-orange-700 font-semibold' : 'text-blue-700'
                            }`}>
                              剩余: {formatRemainingTime(timeRemaining).text}
                            </span>
                          </div>
                          
                          <div className="text-sm bg-white/70 px-3 py-1 rounded-full border border-gray-300">
                            <span className="text-green-600 font-medium">{answeredCount}</span>
                            <span className="text-gray-600"> / {examData.questions.length}</span>
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

                  {/* 时间警告提示 */}
                  {showTimeWarning && timeWarningLevel === 'warning' && (
                    <Alert className="border-orange-300 bg-gradient-to-r from-orange-50 to-yellow-50 shadow-lg animate-pulse">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0 animate-bounce" />
                        <div className="flex-1">
                          <AlertDescription className="text-orange-800">
                            <strong className="font-bold text-orange-900">⏰ 时间提醒：还有 {Math.floor(timeRemaining / 60)} 分钟！</strong>
                            <br />
                            请抓紧时间完成剩余题目，系统将在时间到达后自动提交试卷。
                          </AlertDescription>
                        </div>
                      </div>
                    </Alert>
                  )}

                  {/* 紧急时间警告 */}
                  {showTimeWarning && timeWarningLevel === 'urgent' && (
                    <Alert className="border-red-300 bg-gradient-to-r from-red-50 to-pink-50 shadow-xl animate-pulse">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-6 h-6 text-red-600 mt-0.5 flex-shrink-0 animate-bounce" />
                        <div className="flex-1">
                          <AlertDescription className="text-red-800">
                            <strong className="font-bold text-red-900 text-lg">🚨 紧急提醒：仅剩 {timeRemaining} 秒！</strong>
                            <br />
                            <span className="text-red-700 font-semibold">时间即将结束，请立即检查并提交试卷！</span>
                          </AlertDescription>
                        </div>
                      </div>
                    </Alert>
                  )}

                  {/* 时间到期提示 */}
                  {isTimeUp && (
                    <Alert className="border-red-200 bg-red-50/90 backdrop-blur-sm shadow-lg">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <AlertDescription className="text-red-800">
                            <strong className="font-medium">考试时间已到！</strong>
                            <br />
                            系统正在自动提交您的答案，请稍等...
                          </AlertDescription>
                        </div>
                      </div>
                    </Alert>
                  )}

                  {/* 双击操作提示 */}
                  {showDoubleClickTip && (
                    <Alert className="border-blue-200 bg-blue-50/90 backdrop-blur-sm shadow-lg">
                      <div className="flex items-start gap-3">
                        <MousePointer2 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <AlertDescription className="text-blue-800">
                            <div className="flex items-center justify-between">
                              <div>
                                <strong className="font-medium">快捷操作提示：</strong>
                                <br />
                                双击任意选项可直接选择答案并自动跳转到下一题，提高答题效率！
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={dismissDoubleClickTip}
                                className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 ml-2 flex-shrink-0"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </AlertDescription>
                        </div>
                      </div>
                    </Alert>
                  )}

                  {/* 当前题目 */}
                  <Card className="bg-white/95 backdrop-blur-xl border-emerald-200/50 shadow-lg">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-3">
                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                              第 {currentQuestionIndex + 1} 题
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
                              onDoubleClick={() => handleDoubleClickOption(currentQuestion.id, option.key)}
                              className={`flex items-start space-x-3 p-3 lg:p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer ${
                                isSelected 
                                  ? 'border-emerald-300 bg-emerald-50 shadow-sm' 
                                  : 'border-gray-200 hover:border-emerald-200 hover:bg-emerald-50/30'
                              }`}
                              title="双击可选择答案并自动跳转到下一题"
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
                      {/* 开发环境测试按钮 */}
                      {process.env.NODE_ENV === 'development' && (
                        <Button
                          onClick={testAutoSubmit}
                          variant="outline"
                          size="sm"
                          className="border-red-300 text-red-600 hover:bg-red-50"
                        >
                          测试超时提交
                        </Button>
                      )}
                      
                      {/* 如果所有题目都已作答，显示提交按钮 */}
                      {isAllAnswered ? (
                        <Button
                          onClick={() => setShowConfirmSubmit(true)}
                          disabled={isTimeUp}
                          className="w-full sm:w-auto flex items-center gap-2 px-6 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg"
                        >
                          <CheckCircle className="w-4 h-4" />
                          提交试卷
                        </Button>
                      ) : currentQuestionIndex === examData.questions.length - 1 ? (
                        /* 在最后一题且未全部完成时，显示灰色提交按钮 */
                        <Button
                          onClick={() => setShowConfirmSubmit(true)}
                          disabled={isTimeUp}
                          variant="outline"
                          className="w-full sm:w-auto flex items-center gap-2 px-6 border-gray-300 text-gray-600"
                        >
                          <CheckCircle className="w-4 h-4" />
                          提交试卷（还有未答题目）
                        </Button>
                      ) : (
                        /* 不在最后一题且未全部完成时，显示下一题按钮 */
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
                                    正在提交...
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
          <div onClick={handleSecretClick} style={{cursor: 'default'}}>
            <PlatformFooter className="text-center" />
          </div>
        </div>
      </div>
    </>
  )
}
