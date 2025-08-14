"use client"

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PlatformFooter } from '@/components/platform-footer'
import { TrainingResultNavigator } from '@/components/training-result-navigator'
import { 
  CheckCircle, 
  XCircle, 
  Award, 
  Clock, 
  User, 
  BookOpen, 
  Target,
  RotateCcw,
  Home,
  TrendingUp,
  Calendar,
  ArrowUp,
  ArrowDown
} from 'lucide-react'

interface ExamResult {
  recordId: number
  sessionId: string
  employeeName: string
  score: number
  totalQuestions: number
  correctAnswers: number
  wrongAnswers: number
  accuracy: number
  sessionDuration: number
  passed: boolean
  answerDetails: AnswerDetail[]
  completedAt: string
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

export default function TrainingResultPage() {
  const [result, setResult] = useState<ExamResult | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  
  const router = useRouter()
  const timelineRef = useRef<HTMLDivElement>(null)
  const questionRefs = useRef<{ [key: number]: HTMLDivElement | null }>({})

  useEffect(() => {
    // 从localStorage加载结果数据
    const savedResult = localStorage.getItem('examResult')
    if (savedResult) {
      try {
        const data = JSON.parse(savedResult)
        setResult(data)
      } catch (error) {
        console.error('加载考试结果失败:', error)
        router.push('/training')
      }
    } else {
      // 没有结果数据，重定向到入口页面
      router.push('/training')
    }
    setLoading(false)
  }, [router])

  const handleRetakeExam = () => {
    // 清除结果数据
    localStorage.removeItem('examResult')
    // 返回入口页面重新开始
    router.push('/training')
  }

  const handleGoHome = () => {
    // 清除结果数据
    localStorage.removeItem('examResult')
    // 返回首页
    router.push('/')
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

  const getScoreBadgeColor = (score: number, passed: boolean) => {
    if (!passed) return 'bg-red-100 text-red-800 border-red-200'
    if (score >= 90) return 'bg-green-100 text-green-800 border-green-200'
    if (score >= 80) return 'bg-blue-100 text-blue-800 border-blue-200'
    return 'bg-orange-100 text-orange-800 border-orange-200'
  }

  // 导航到指定题目
  const handleQuestionSelect = (questionIndex: number) => {
    setCurrentQuestionIndex(questionIndex)
    const questionElement = questionRefs.current[questionIndex]
    if (questionElement && timelineRef.current) {
      // 平滑滚动到指定题目
      const timelineContainer = timelineRef.current
      const containerRect = timelineContainer.getBoundingClientRect()
      const questionRect = questionElement.getBoundingClientRect()
      
      const scrollTop = timelineContainer.scrollTop + questionRect.top - containerRect.top - 20
      
      timelineContainer.scrollTo({
        top: scrollTop,
        behavior: 'smooth'
      })
    }
  }

  // 监听滚动位置，更新当前题目索引
  const handleScroll = () => {
    if (!timelineRef.current || !result) return
    
    const timelineContainer = timelineRef.current
    const containerRect = timelineContainer.getBoundingClientRect()
    const containerCenter = containerRect.top + containerRect.height / 2
    
    let closestIndex = 0
    let minDistance = Infinity
    
    result.answerDetails.forEach((_, index) => {
      const questionElement = questionRefs.current[index]
      if (questionElement) {
        const questionRect = questionElement.getBoundingClientRect()
        const questionCenter = questionRect.top + questionRect.height / 2
        const distance = Math.abs(questionCenter - containerCenter)
        
        if (distance < minDistance) {
          minDistance = distance
          closestIndex = index
        }
      }
    })
    
    if (closestIndex !== currentQuestionIndex) {
      setCurrentQuestionIndex(closestIndex)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-muted-foreground">加载考试结果中...</p>
        </div>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">未找到考试结果</h2>
            <p className="text-muted-foreground mb-4">请重新参加考试</p>
            <Button onClick={handleRetakeExam}>
              重新考试
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* 结果概览 */}
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${
            result.passed ? 'bg-green-100' : 'bg-red-100'
          }`}>
            {result.passed ? (
              <Award className="w-10 h-10 text-green-600" />
            ) : (
              <XCircle className="w-10 h-10 text-red-600" />
            )}
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {result.passed ? '恭喜，考试通过！' : '考试未通过'}
          </h1>
          
          <p className="text-lg text-gray-600 mb-4">
            {result.passed 
              ? '您已成功完成新员工入职培训考试' 
              : '建议您继续学习相关知识后重新参加考试'
            }
          </p>
          
          <Badge className={`text-lg px-4 py-1 ${getScoreBadgeColor(result.score, result.passed)}`}>
            {result.score} 分
          </Badge>
        </div>

        {/* 成绩详情卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* 基本信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                考试信息
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">姓名</span>
                <span className="font-medium">{result.employeeName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">完成时间</span>
                <span className="font-medium">
                  {new Date(result.completedAt).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">用时</span>
                <span className="font-medium flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatDuration(result.sessionDuration)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">考试状态</span>
                <Badge variant={result.passed ? "default" : "destructive"}>
                  {result.passed ? "通过" : "未通过"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* 成绩统计 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                成绩统计
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">总题数</span>
                <span className="font-medium">{result.totalQuestions} 题</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">正确数</span>
                <span className="font-medium text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  {result.correctAnswers} 题
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">错误数</span>
                <span className="font-medium text-red-600 flex items-center gap-1">
                  <XCircle className="w-4 h-4" />
                  {result.wrongAnswers} 题
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">正确率</span>
                <span className={`font-medium ${getScoreColor(result.score, result.passed)}`}>
                  {result.accuracy}%
                </span>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">得分进度</span>
                  <span className="font-medium">{result.score}/100</span>
                </div>
                <Progress 
                  value={result.score} 
                  className={`h-3 ${result.passed ? '[&>div]:bg-green-500' : '[&>div]:bg-red-500'}`}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 答题详情分析 - 两列布局 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          {/* 左侧导航 */}
          <div className="lg:col-span-3">
            <TrainingResultNavigator
              answerDetails={result.answerDetails}
              currentQuestionIndex={currentQuestionIndex}
              onQuestionSelect={handleQuestionSelect}
              employeeName={result.employeeName}
              score={result.score}
              totalQuestions={result.totalQuestions}
              correctAnswers={result.correctAnswers}
              className="sticky top-4"
            />
          </div>

          {/* 右侧时间轴 */}
          <div className="lg:col-span-9">
            <Card className="flex flex-col" style={{height: '800px'}}>
              <CardHeader className="pb-4 border-b flex-shrink-0">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-emerald-600" />
                    答题详情时间轴
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>第 {currentQuestionIndex + 1} / {result.totalQuestions} 题</span>
                  </div>
                </CardTitle>
                <CardDescription>
                  点击左侧题号或使用鼠标滚轮浏览所有答题详情
                </CardDescription>
              </CardHeader>
              
              <div className="flex-1 relative min-h-0">
                <div 
                  ref={timelineRef}
                  className="absolute inset-0 overflow-y-auto px-4 py-6"
                  onScroll={handleScroll}
                >
                  <div className="relative space-y-6">
                    {/* 时间轴线 */}
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-emerald-300" />
                    
                    {result.answerDetails.map((detail, index) => (
                      <div
                        key={detail.questionId}
                        ref={el => { questionRefs.current[index] = el }}
                        className={`relative pl-12 transition-all duration-200`}
                      >
                        {/* 时间轴节点 */}
                        <div className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-white border-2 transition-all duration-200 ${
                          detail.isCorrect 
                            ? 'border-green-400 text-green-600' 
                            : 'border-red-400 text-red-600'
                        } ${index === currentQuestionIndex ? 'scale-110 shadow-lg' : 'shadow-sm'}`}>
                          {detail.questionNumber}
                        </div>
                        
                        {/* 题目卡片 */}
                        <Card className={`overflow-hidden border transition-all duration-200 ${
                          detail.isCorrect 
                            ? 'border-green-200 bg-green-50' 
                            : 'border-red-200 bg-red-50'
                        } hover:shadow-md`}>
                          {/* 题目头部 */}
                          <CardHeader className={`pb-3 border-b ${
                            detail.isCorrect 
                              ? 'bg-green-100 border-green-200' 
                              : 'bg-red-100 border-red-200'
                          }`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {detail.isCorrect ? (
                                  <CheckCircle className="w-5 h-5 text-green-600" />
                                ) : (
                                  <XCircle className="w-5 h-5 text-red-600" />
                                )}
                                <div>
                                  <div className={`font-semibold ${
                                    detail.isCorrect ? 'text-green-800' : 'text-red-800'
                                  }`}>
                                    {detail.isCorrect ? '✓ 回答正确' : '✗ 回答错误'}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    正确: <span className="font-medium text-green-700">{detail.correctAnswer}</span> | 
                                    您选: <span className={`font-medium ${
                                      detail.selectedAnswer === detail.correctAnswer ? 'text-green-700' : 'text-red-700'
                                    }`}>
                                      {detail.selectedAnswer || '未作答'}
                                    </span>
                                  </p>
                                </div>
                              </div>
                              <Badge 
                                variant={detail.isCorrect ? "default" : "destructive"}
                                className="text-xs px-2 py-1"
                              >
                                第 {detail.questionNumber} 题
                              </Badge>
                            </div>
                          </CardHeader>

                          <CardContent className="p-4 space-y-4">
                            {/* 题目内容 */}
                            <div>
                              <h4 className="font-medium text-base text-gray-900 mb-3 leading-relaxed">
                                {detail.questionText}
                              </h4>
                              
                              {/* 选项列表 */}
                              <div className="space-y-2">
                                {['A', 'B', 'C', 'D'].map((option) => {
                                  const optionText = detail[`option${option}` as keyof AnswerDetail] as string
                                  const isSelected = detail.selectedAnswer === option
                                  const isCorrect = detail.correctAnswer === option
                                  
                                  return (
                                    <div
                                      key={option}
                                      className={`relative p-3 rounded-lg border transition-all duration-100 ${
                                        isCorrect
                                          ? 'bg-green-100 border-green-300'
                                          : isSelected && !isCorrect
                                          ? 'bg-red-100 border-red-300'
                                          : 'bg-white border-gray-200'
                                      }`}
                                    >
                                      <div className="flex items-start gap-3">
                                        <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold border ${
                                          isCorrect
                                            ? 'bg-green-500 text-white border-green-600'
                                            : isSelected && !isCorrect
                                            ? 'bg-red-500 text-white border-red-600'
                                            : 'bg-gray-100 text-gray-700 border-gray-300'
                                        }`}>
                                          {option}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm text-gray-900 leading-relaxed">
                                            {optionText}
                                          </p>
                                        </div>
                                        
                                        {/* 状态标识 */}
                                        <div className="flex gap-1">
                                          {isSelected && (
                                            <Badge 
                                              variant={isCorrect ? "default" : "destructive"} 
                                              className="text-xs px-1.5 py-0.5"
                                            >
                                              选择
                                            </Badge>
                                          )}
                                          {isCorrect && (
                                            <Badge 
                                              variant="outline" 
                                              className="text-xs px-1.5 py-0.5 bg-green-50 border-green-300 text-green-800"
                                            >
                                              正解
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>

                            {/* 解析说明 */}
                            {detail.explanation && (
                              <div className="p-3 bg-blue-50 rounded">
                                <div className="flex items-start gap-2">
                                  <div className="flex-shrink-0 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">?</span>
                                  </div>
                                  <div className="flex-1">
                                    <h5 className="font-medium text-blue-900 mb-1 text-sm">解析</h5>
                                    <p className="text-blue-800 text-sm leading-relaxed">
                                      {detail.explanation}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* 滚动提示 */}
                <div className="absolute bottom-3 right-3 flex flex-col gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-8 h-8 p-0 bg-white shadow-md"
                    onClick={() => handleQuestionSelect(Math.max(0, currentQuestionIndex - 1))}
                    disabled={currentQuestionIndex === 0}
                  >
                    <ArrowUp className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-8 h-8 p-0 bg-white shadow-md"
                    onClick={() => handleQuestionSelect(Math.min(result.answerDetails.length - 1, currentQuestionIndex + 1))}
                    disabled={currentQuestionIndex === result.answerDetails.length - 1}
                  >
                    <ArrowDown className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center justify-center gap-4">
          <Button 
            onClick={handleGoHome}
            className="flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            返回首页
          </Button>
        </div>

        {/* 底部提示 */}
        <div className="text-center mt-8 text-sm text-muted-foreground space-y-2">
          <p>考试结果已自动保存，如需重新参加考试或查询历史记录请联系管理员</p>
          <PlatformFooter />
        </div>
      </div>
    </div>
  )
}