"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CheckCircle, XCircle, BookOpen, Target, Clock } from 'lucide-react'

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

interface TrainingResultNavigatorProps {
  answerDetails: AnswerDetail[]
  currentQuestionIndex: number
  onQuestionSelect: (index: number) => void
  employeeName: string
  score: number
  totalQuestions: number
  correctAnswers: number
  className?: string
}

export function TrainingResultNavigator({
  answerDetails,
  currentQuestionIndex,
  onQuestionSelect,
  employeeName,
  score,
  totalQuestions,
  correctAnswers,
  className = ""
}: TrainingResultNavigatorProps) {
  const wrongAnswers = totalQuestions - correctAnswers
  const accuracy = Math.round((correctAnswers / totalQuestions) * 100)

  return (
    <Card className={`w-full bg-white border-emerald-200 shadow-lg ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-gray-800 flex items-center gap-2">
          <Target className="w-4 h-4 text-emerald-600" />
          答题导航
        </CardTitle>
        <CardDescription className="text-xs text-gray-600">
          点击题号快速跳转到对应题目
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* 答题统计 */}
        <div className="grid grid-cols-2 gap-3 p-3 bg-emerald-50 rounded-lg">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <CheckCircle className="w-3 h-3 text-green-600" />
              <span className="text-xs font-medium text-green-700">正确</span>
            </div>
            <div className="text-lg font-bold text-green-600">{correctAnswers}</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <XCircle className="w-3 h-3 text-red-600" />
              <span className="text-xs font-medium text-red-700">错误</span>
            </div>
            <div className="text-lg font-bold text-red-600">{wrongAnswers}</div>
          </div>
        </div>

        {/* 题目网格 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-medium text-gray-700 flex items-center gap-1">
              <BookOpen className="w-3 h-3" />
              题目列表
            </h4>
            <Badge variant="outline" className="text-xs px-2 py-0.5">
              {totalQuestions} 题
            </Badge>
          </div>
          
          <div className="max-h-80 overflow-y-auto p-1 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-6 gap-2">
              {answerDetails.map((answer, index) => {
                const isCorrect = answer.isCorrect
                const isCurrent = index === currentQuestionIndex
                
                return (
                  <button
                    key={answer.questionId}
                    onClick={() => onQuestionSelect(index)}
                    className={`
                      relative w-full aspect-square text-xs rounded-md flex items-center justify-center font-medium 
                      transition-all duration-150 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-1
                      ${
                        isCurrent 
                          ? 'bg-emerald-500 text-white shadow-md' 
                          : isCorrect 
                            ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                      }
                    `}
                  >
                    <span>{answer.questionNumber}</span>
                    {/* 状态图标 */}
                    <div className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 ${
                      isCurrent ? 'text-white' : isCorrect ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {isCorrect ? (
                        <CheckCircle className="w-2.5 h-2.5" />
                      ) : (
                        <XCircle className="w-2.5 h-2.5" />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* 图例说明 */}
        <div className="p-2 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-600 space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-500 rounded" />
              <span>当前查看</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-100 rounded border border-green-200" />
              <span>答对</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-100 rounded border border-red-200" />
              <span>答错</span>
            </div>
          </div>
        </div>

        {/* 成绩信息 */}
        <div className="border-t pt-3">
          <div className="text-center space-y-2">
            <div className="text-xs text-gray-600">
              <span className="font-medium">{employeeName}</span> 的成绩
            </div>
            <div className="flex items-center justify-center gap-3 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                <span className="text-gray-600">得分 <span className="font-bold text-emerald-600">{score}</span></span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                <span className="text-gray-600">准确率 <span className="font-bold text-blue-600">{accuracy}%</span></span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}