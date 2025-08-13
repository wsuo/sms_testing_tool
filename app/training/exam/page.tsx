"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, Clock, User, BookOpen, AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react'
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-muted-foreground">加载考试数据中...</p>
        </div>
      </div>
    )
  }

  const currentQuestion = examData.questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / examData.questions.length) * 100
  const answeredCount = Object.keys(answers).length
  const isAllAnswered = answeredCount === examData.questions.length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部状态栏 */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="flex items-center gap-2">
                <User className="w-3 h-3" />
                {examData.employeeName}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-2">
                <BookOpen className="w-3 h-3" />
                {examData.questionSet.name}
              </Badge>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>{formatTime(elapsedTime)}</span>
              </div>
              
              <div className="text-sm">
                <span className="text-green-600 font-medium">{answeredCount}</span>
                <span className="text-muted-foreground"> / {examData.questions.length}</span>
              </div>
            </div>
          </div>
          
          <div className="mt-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium">
                第 {currentQuestionIndex + 1} 题 / 共 {examData.questions.length} 题
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 题目导航侧边栏 */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">答题进度</CardTitle>
                <CardDescription>
                  点击题号快速跳转
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-2">
                  {examData.questions.map((_, index) => {
                    const questionId = examData.questions[index].id
                    const isAnswered = answers.hasOwnProperty(questionId)
                    const isCurrent = index === currentQuestionIndex
                    
                    return (
                      <button
                        key={index}
                        onClick={() => goToQuestion(index)}
                        className={`
                          w-8 h-8 text-xs rounded flex items-center justify-center font-medium transition-colors
                          ${isCurrent 
                            ? 'bg-blue-600 text-white' 
                            : isAnswered 
                              ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }
                        `}
                      >
                        {index + 1}
                      </button>
                    )
                  })}
                </div>
                
                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-600 rounded" />
                    <span>当前题目</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-100 rounded border border-green-300" />
                    <span>已作答</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-100 rounded border border-gray-300" />
                    <span>未作答</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 主要答题区域 */}
          <div className="lg:col-span-3">
            <div className="space-y-6">
              {/* 当前题目 */}
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary">
                          第 {currentQuestion.questionNumber} 题
                        </Badge>
                        {currentQuestion.section && (
                          <Badge variant="outline">
                            {currentQuestion.section}
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-lg leading-relaxed">
                        {currentQuestion.questionText}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <RadioGroup 
                    value={answers[currentQuestion.id] || ''}
                    onValueChange={(value) => handleAnswerSelect(currentQuestion.id, value)}
                    className="space-y-3"
                  >
                    {[
                      { key: 'A', text: currentQuestion.optionA },
                      { key: 'B', text: currentQuestion.optionB },
                      { key: 'C', text: currentQuestion.optionC },
                      { key: 'D', text: currentQuestion.optionD }
                    ].map(option => (
                      <div key={option.key} className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                        <RadioGroupItem 
                          value={option.key} 
                          id={`option-${option.key}`}
                          className="mt-0.5" 
                        />
                        <Label 
                          htmlFor={`option-${option.key}`}
                          className="flex-1 cursor-pointer leading-relaxed"
                        >
                          <span className="font-medium mr-2">{option.key}.</span>
                          {option.text}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </CardContent>
              </Card>

              {/* 导航按钮 */}
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={() => goToQuestion(currentQuestionIndex - 1)}
                  disabled={currentQuestionIndex === 0}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  上一题
                </Button>

                <div className="flex items-center gap-3">
                  {currentQuestionIndex === examData.questions.length - 1 ? (
                    <Button
                      onClick={() => setShowConfirmSubmit(true)}
                      disabled={!isAllAnswered}
                      className="flex items-center gap-2 px-6"
                    >
                      <CheckCircle className="w-4 h-4" />
                      提交试卷
                    </Button>
                  ) : (
                    <Button
                      onClick={() => goToQuestion(currentQuestionIndex + 1)}
                      disabled={currentQuestionIndex === examData.questions.length - 1}
                      className="flex items-center gap-2"
                    >
                      下一题
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* 提交确认对话框 */}
              {showConfirmSubmit && (
                <Card className="border-orange-200 bg-orange-50">
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
                        
                        <div className="flex items-center gap-3">
                          <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="flex items-center gap-2"
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
  )
}