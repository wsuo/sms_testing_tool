import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertTriangle, Info, ChevronDown, ChevronUp } from "lucide-react"
import { getErrorMessage } from "@/lib/helpers/sms-helpers"

interface FailureReason {
  errorCode: string
  count: number
  percentage: number
}

interface CarrierFailureStats {
  carrier: string
  totalFailures: number
  failures: { errorCode: string; count: number }[]
}

interface TemplateFailureStats {
  template: string
  totalFailures: number
  failures: { errorCode: string; count: number }[]
}

interface FailureAnalysisProps {
  failureReasons: FailureReason[]
  carrierFailureStats: CarrierFailureStats[]
  templateFailureStats: TemplateFailureStats[]
  totalFailures: number
}

export const FailureAnalysis: React.FC<FailureAnalysisProps> = ({
  failureReasons,
  carrierFailureStats,
  templateFailureStats,
  totalFailures,
}) => {
  const [expandedReasons, setExpandedReasons] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState("overview")

  const toggleReasonExpansion = (errorCode: string) => {
    const newExpanded = new Set(expandedReasons)
    if (newExpanded.has(errorCode)) {
      newExpanded.delete(errorCode)
    } else {
      newExpanded.add(errorCode)
    }
    setExpandedReasons(newExpanded)
  }

  const getErrorCategoryColor = (errorCode: string) => {
    // 按错误类型分类颜色
    if (errorCode.includes('MOBILE_NOT_ON_SERVICE') || errorCode.includes('INVALID_NUMBER') || errorCode.includes('MOBILE_ACCOUNT_ABNORMAL')) {
      return 'destructive' // 用户号码问题 - 红色
    }
    if (errorCode.includes('CONTENT') || errorCode.includes('KEYWORD')) {
      return 'secondary' // 内容问题 - 灰色
    }
    if (errorCode.includes('MOBILE_IN_BLACK') || errorCode.includes('USER_REJECT')) {
      return 'outline' // 用户拒绝 - 轮廓
    }
    return 'default' // 其他问题 - 默认
  }

  const getErrorCategoryIcon = (errorCode: string) => {
    if (errorCode.includes('MOBILE_NOT_ON_SERVICE') || errorCode.includes('INVALID_NUMBER')) {
      return '📵' // 无信号
    }
    if (errorCode.includes('CONTENT') || errorCode.includes('KEYWORD')) {
      return '🚫' // 禁止
    }
    if (errorCode.includes('MOBILE_IN_BLACK') || errorCode.includes('USER_REJECT')) {
      return '🛑' // 停止
    }
    if (errorCode.includes('LIMIT')) {
      return '⏰' // 限制
    }
    return '⚠️' // 警告
  }

  if (totalFailures === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-green-600" />
            失败原因分析
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <div className="text-6xl mb-4">🎉</div>
            <p className="text-lg font-medium">暂无发送失败记录</p>
            <p className="text-sm">所有短信都成功送达了！</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-red-600" />
            失败原因分析
          </div>
          <Badge variant="destructive" className="text-sm">
            {totalFailures} 条失败
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">概览</TabsTrigger>
            <TabsTrigger value="carriers">按运营商</TabsTrigger>
            <TabsTrigger value="templates">按模板</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="space-y-4">
              {failureReasons.slice(0, 10).map((reason) => (
                <div key={reason.errorCode} className="border rounded-lg">
                  <div 
                    className="p-4 cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleReasonExpansion(reason.errorCode)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{getErrorCategoryIcon(reason.errorCode)}</span>
                        <div>
                          <span className="font-medium text-sm">{getErrorMessage(reason.errorCode).split('，')[0]}</span>
                          <div className="text-xs text-gray-500 mt-1">
                            {reason.errorCode}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={getErrorCategoryColor(reason.errorCode)}>
                          {reason.count} 次 ({reason.percentage.toFixed(1)}%)
                        </Badge>
                        {expandedReasons.has(reason.errorCode) ? 
                          <ChevronUp className="w-4 h-4" /> : 
                          <ChevronDown className="w-4 h-4" />
                        }
                      </div>
                    </div>
                    <Progress value={reason.percentage} className="h-2" />
                  </div>
                  
                  {expandedReasons.has(reason.errorCode) && (
                    <div className="px-4 pb-4 border-t bg-gray-50">
                      <Alert className="mt-3">
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          <div className="space-y-2">
                            <p><strong>详细说明：</strong>{getErrorMessage(reason.errorCode)}</p>
                            <p><strong>建议操作：</strong>
                              {reason.errorCode.includes('MOBILE_NOT_ON_SERVICE') && '核实手机号码状态，联系用户确认'}
                              {reason.errorCode.includes('CONTENT') && '检查短信内容，避免敏感词汇'}
                              {reason.errorCode.includes('LIMIT') && '控制发送频率，避免超限'}
                              {reason.errorCode.includes('BLACK') && '从发送列表中移除该号码'}
                              {!reason.errorCode.includes('MOBILE_NOT_ON_SERVICE') && 
                               !reason.errorCode.includes('CONTENT') && 
                               !reason.errorCode.includes('LIMIT') && 
                               !reason.errorCode.includes('BLACK') && '请联系技术支持分析具体原因'}
                            </p>
                          </div>
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="carriers" className="space-y-4">
            <div className="space-y-4">
              {carrierFailureStats.slice(0, 10).map((carrier) => (
                <Card key={carrier.carrier} className="border-l-4 border-l-orange-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{carrier.carrier}</Badge>
                        <span className="text-sm text-gray-600">
                          共 {carrier.totalFailures} 次失败
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {carrier.failures.map((failure) => (
                        <div key={failure.errorCode} className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <span>{getErrorCategoryIcon(failure.errorCode)}</span>
                            <span>{getErrorMessage(failure.errorCode).split('，')[0]}</span>
                          </span>
                          <Badge variant="secondary" size="sm">
                            {failure.count} 次
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <div className="space-y-4">
              {templateFailureStats.slice(0, 10).map((template) => (
                <Card key={template.template} className="border-l-4 border-l-purple-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate max-w-[200px]">
                          {template.template}
                        </span>
                        <span className="text-sm text-gray-600">
                          共 {template.totalFailures} 次失败
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {template.failures.map((failure) => (
                        <div key={failure.errorCode} className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <span>{getErrorCategoryIcon(failure.errorCode)}</span>
                            <span>{getErrorMessage(failure.errorCode).split('，')[0]}</span>
                          </span>
                          <Badge variant="secondary" size="sm">
                            {failure.count} 次
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}