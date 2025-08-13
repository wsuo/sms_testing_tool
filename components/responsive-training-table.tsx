"use client"

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { WithAdminAuth } from '@/components/with-admin-auth'
import { Eye, Trash2, User } from 'lucide-react'

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

interface ResponsiveTrainingTableProps {
  records: TrainingRecord[]
  onViewDetails: (record: TrainingRecord) => void
  onDelete: (record: TrainingRecord) => void
  isLoading?: boolean
}

export function ResponsiveTrainingTable({ 
  records, 
  onViewDetails, 
  onDelete, 
  isLoading = false 
}: ResponsiveTrainingTableProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}分${secs}秒`
  }

  const getScoreColor = (score: number, passed: boolean) => {
    if (passed) return 'text-green-600'
    return 'text-red-600'
  }

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-pulse text-muted-foreground">加载中...</div>
      </div>
    )
  }

  if (records.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        暂无考试记录
      </div>
    )
  }

  return (
    <>
      {/* 桌面端表格 */}
      <div className="hidden md:block overflow-x-auto">
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
                    / {record.totalQuestions} 题
                  </div>
                </td>
                <td className="p-3">
                  <Badge variant={record.passed ? "default" : "destructive"}>
                    {record.passed ? "通过" : "未通过"}
                  </Badge>
                </td>
                <td className="p-3 text-sm">
                  {formatDuration(record.sessionDuration)}
                </td>
                <td className="p-3 text-sm">
                  {formatDateTime(record.completedAt)}
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewDetails(record)}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      查看
                    </Button>
                    <WithAdminAuth actionName="删除考试记录">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => onDelete(record)}
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

      {/* 移动端卡片布局 */}
      <div className="md:hidden space-y-4">
        {records.map((record) => (
          <Card key={record.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="space-y-3">
                {/* 头部信息 */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{record.employeeName}</h3>
                    <p className="text-sm text-muted-foreground">ID: {record.id}</p>
                  </div>
                  <Badge variant={record.passed ? "default" : "destructive"} className="ml-2">
                    {record.passed ? "通过" : "未通过"}
                  </Badge>
                </div>

                {/* 试卷信息 */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="font-medium text-sm mb-1">
                    {record.questionSet?.name || '未知试卷'}
                  </div>
                  {record.questionSet?.description && (
                    <div className="text-xs text-muted-foreground">
                      {record.questionSet.description}
                    </div>
                  )}
                </div>

                {/* 成绩和时间信息 */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground mb-1">得分</div>
                    <div className="font-semibold">
                      {record.score}/{record.totalQuestions}
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({Math.round((record.score / record.totalQuestions) * 100)}%)
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">用时</div>
                    <div className="font-semibold">
                      {formatDuration(record.sessionDuration)}
                    </div>
                  </div>
                </div>

                {/* 完成时间 */}
                <div className="text-sm">
                  <span className="text-muted-foreground">完成时间：</span>
                  <span className="font-medium">{formatDateTime(record.completedAt)}</span>
                </div>

                {/* 操作按钮 */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewDetails(record)}
                    className="flex-1"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    查看详情
                  </Button>
                  <WithAdminAuth actionName="删除考试记录">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onDelete(record)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </WithAdminAuth>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}