"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { PlatformFooter } from '@/components/platform-footer'
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
  Calendar
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
  const [showDetails, setShowDetails] = useState(false)
  const [loading, setLoading] = useState(true)
  
  const router = useRouter()

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
      <div className="container mx-auto px-4 py-8 max-w-4xl">
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

        {/* 答题详情 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                答题详情分析
              </div>
              <Button 
                variant="outline" 
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? '隐藏详情' : '查看详情'}
              </Button>
            </CardTitle>
          </CardHeader>
          
          {showDetails && (
            <CardContent>
              <div className="space-y-6 max-h-96 overflow-y-auto">
                {result.answerDetails.map((detail) => (
                  <div 
                    key={detail.questionId} 
                    className={`p-4 rounded-lg border-l-4 ${
                      detail.isCorrect 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-red-500 bg-red-50'
                    }`}
                  >
                    {/* 题目标题 */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                        detail.isCorrect 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {detail.questionNumber}
                      </div>
                      <div className="flex items-center">
                        {detail.isCorrect ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                        <span className={`ml-2 font-medium ${
                          detail.isCorrect ? 'text-green-700' : 'text-red-700'
                        }`}>
                          {detail.isCorrect ? '回答正确' : '回答错误'}
                        </span>
                      </div>
                    </div>

                    {/* 题目内容 */}
                    <div className="mb-3">
                      <p className="font-medium text-gray-900 mb-3">{detail.questionText}</p>
                      
                      {/* 选项列表 */}
                      <div className="grid grid-cols-1 gap-2">
                        {['A', 'B', 'C', 'D'].map((option) => {
                          const optionText = detail[`option${option}` as keyof AnswerDetail] as string
                          const isSelected = detail.selectedAnswer === option
                          const isCorrect = detail.correctAnswer === option
                          
                          return (
                            <div
                              key={option}
                              className={`p-2 rounded border flex items-center gap-2 ${
                                isCorrect
                                  ? 'bg-green-100 border-green-300 text-green-800'
                                  : isSelected && !isCorrect
                                  ? 'bg-red-100 border-red-300 text-red-800'
                                  : 'bg-gray-50 border-gray-200'
                              }`}
                            >
                              <span className={`font-medium w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                                isCorrect
                                  ? 'bg-green-200 text-green-800'
                                  : isSelected && !isCorrect
                                  ? 'bg-red-200 text-red-800'
                                  : 'bg-gray-200'
                              }`}>
                                {option}
                              </span>
                              <span className="flex-1">{optionText}</span>
                              {isSelected && (
                                <Badge variant={isCorrect ? "default" : "destructive"} className="text-xs">
                                  您的选择
                                </Badge>
                              )}
                              {isCorrect && (
                                <Badge variant="outline" className="text-xs bg-green-100 text-green-800">
                                  正确答案
                                </Badge>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* 解释说明 */}
                    {detail.explanation && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                        <p className="text-sm text-blue-800">
                          <span className="font-medium">解析：</span>
                          {detail.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>

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