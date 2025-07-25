import React from "react"
import Link from "next/link"
import { Clock, RefreshCw, RotateCcw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SmsStatus } from "@/hooks/useSmsStatus"
import { getStatusBadgeVariant, getErrorMessage } from "@/lib/helpers/sms-helpers"

interface StatusMonitoringProps {
  smsStatuses: SmsStatus[]
  isRefreshing: boolean
  resendingOutIds: Set<string>
  isLoadingSmsHistory: boolean
  onRefreshStatuses: () => void
  onResendSms: (outId: string) => void
  canResend: (status: string) => boolean
  monitoringStatus: {
    isMonitoring: boolean
    text: string
    variant: "default" | "secondary"
  }
}

export const StatusMonitoring: React.FC<StatusMonitoringProps> = ({
  smsStatuses,
  isRefreshing,
  resendingOutIds,
  isLoadingSmsHistory,
  onRefreshStatuses,
  onResendSms,
  canResend,
  monitoringStatus,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            实时状态
          </div>
          <div className="flex gap-2">
            <Link href="/monitor">
              <Button variant="outline" size="sm">
                查看详情
              </Button>
            </Link>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRefreshStatuses} 
              disabled={isRefreshing}
              title="刷新状态并主动查询阿里云最新状态"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "查询中..." : "强制刷新"}
            </Button>
            <Badge variant={monitoringStatus.variant}>
              {monitoringStatus.text}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoadingSmsHistory ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-500">加载监控记录中...</p>
          </div>
        ) : smsStatuses.length === 0 ? (
          <div className="text-center py-8 text-gray-500">暂无发送记录</div>
        ) : (
          <div className="space-y-4">
            {smsStatuses.slice(0, 5).map((sms) => (
              <div key={sms.outId} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">OutId: {sms.outId}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusBadgeVariant(sms.status)}>{sms.status}</Badge>
                    {canResend(sms.status) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onResendSms(sms.outId)}
                        disabled={resendingOutIds.has(sms.outId)}
                        className="h-6 px-2"
                        title="重发短信"
                      >
                        <RotateCcw className={`w-3 h-3 ${resendingOutIds.has(sms.outId) ? 'animate-spin' : ''}`} />
                        {resendingOutIds.has(sms.outId) ? '重发中' : '重发'}
                      </Button>
                    )}
                  </div>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>手机号码: {sms.phoneNumber}</p>
                  <p>发送时间: {sms.sendDate}</p>
                  {sms.receiveDate && <p>送达时间: {sms.receiveDate}</p>}
                  {sms.errorCode && sms.errorCode !== "DELIVERED" && sms.status === "发送失败" && (
                    <div className="bg-red-50 border border-red-200 rounded p-2 mt-2">
                      <p className="text-red-800 font-medium text-sm">失败原因: {getErrorMessage(sms.errorCode)}</p>
                      <p className="text-red-600 text-xs mt-1">错误代码: {sms.errorCode}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {smsStatuses.length > 3 && (
              <div className="text-center pt-2">
                <Link href="/monitor">
                  <Button variant="outline" size="sm">
                    查看全部 {smsStatuses.length} 条记录
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}