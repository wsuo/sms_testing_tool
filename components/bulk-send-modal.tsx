"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Send, Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import PhoneNumberSelector from "@/components/phone-number-selector"

interface SmsTemplate {
  id: string
  name: string
  content: string
  params: string[]
  code: string
}

interface BulkSendProgress {
  total: number
  sent: number
  success: number
  failed: number
  current?: string
  isComplete: boolean
}

interface BulkSendModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedTemplate: SmsTemplate | null
  templateParams: Record<string, string>
  onSendComplete?: (results: any[]) => void
}

export default function BulkSendModal({
  open,
  onOpenChange,
  selectedTemplate,
  templateParams,
  onSendComplete
}: BulkSendModalProps) {
  const { toast } = useToast()
  
  const [selectedNumbers, setSelectedNumbers] = useState<string[]>([])
  const [isSending, setIsSending] = useState(false)
  
  const [sendProgress, setSendProgress] = useState<BulkSendProgress>({
    total: 0,
    sent: 0,
    success: 0,
    failed: 0,
    isComplete: false
  })

  // 优化的电话号码选择回调
  const handlePhoneNumberChange = useCallback((numbers: string[]) => {
    setSelectedNumbers(numbers)
  }, [])

  // 批量发送SMS
  const handleBulkSend = async () => {
    if (selectedNumbers.length === 0) {
      toast({
        title: "提示",
        description: "请至少选择一个手机号码",
        variant: "destructive",
      })
      return
    }

    if (!selectedTemplate) {
      toast({
        title: "错误",
        description: "未选择短信模板",
        variant: "destructive",
      })
      return
    }

    setIsSending(true)
    setSendProgress({
      total: selectedNumbers.length,
      sent: 0,
      success: 0,
      failed: 0,
      isComplete: false
    })

    const results = []
    
    try {
      // 批量发送SMS
      for (let i = 0; i < selectedNumbers.length; i++) {
        const phoneNumber = selectedNumbers[i]
        
        setSendProgress(prev => ({
          ...prev,
          current: phoneNumber,
          sent: i
        }))

        // 获取手机号详细信息 - 移到外层作用域
        let carrier = ''
        let phoneNote = ''
        
        try {
          const phoneResponse = await fetch(`/api/phone-numbers?number=${encodeURIComponent(phoneNumber)}`)
          if (phoneResponse.ok) {
            const phoneData = await phoneResponse.json()
            if (phoneData.success && phoneData.data) {
              carrier = phoneData.data.carrier || ''
              phoneNote = phoneData.data.note || ''
            }
          }
        } catch (phoneError) {
          console.error('Failed to query phone number details:', phoneError)
        }

        try {
          // 调用发送SMS API
          const response = await fetch("/admin-api/system/sms-template/send-sms", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${localStorage.getItem("sms-admin-token")}`
            },
            body: JSON.stringify({
              content: selectedTemplate.content,
              params: selectedTemplate.params,
              mobile: phoneNumber,
              templateCode: selectedTemplate.code,
              templateParams: templateParams,
            }),
          })

          const data = await response.json()
          
          if (response.ok && data.code === 0) {
            const outId = data.data ? String(data.data) : `${Date.now()}-${i}`
            
            // 保存到数据库
            try {
              // 渲染真实内容
              const renderContent = (template: string, params: Record<string, string>) => {
                let rendered = template
                Object.keys(params).forEach(key => {
                  const placeholder = `\${${key}}`
                  rendered = rendered.replaceAll(placeholder, params[key] || key)
                })
                return rendered
              }

              const actualContent = selectedTemplate.content ? 
                renderContent(selectedTemplate.content, templateParams) : 
                selectedTemplate.content

              await fetch('/api/sms-records', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  out_id: outId,
                  phone_number: phoneNumber,
                  carrier: carrier,
                  phone_note: phoneNote,
                  template_code: selectedTemplate.code,
                  template_name: selectedTemplate.name,
                  template_params: templateParams,
                  content: actualContent,
                  send_date: new Date().toLocaleString("zh-CN"),
                  status: "发送中"
                })
              })
            } catch (dbError) {
              console.error('Failed to save SMS record:', dbError)
            }

            results.push({
              phone: phoneNumber,
              outId,
              status: 'success',
              carrier: carrier,
              note: phoneNote
            })

            setSendProgress(prev => ({
              ...prev,
              success: prev.success + 1
            }))
          } else {
            throw new Error(data.msg || "发送失败")
          }
        } catch (error) {
          console.error(`发送失败 (${phoneNumber}):`, error)
          results.push({
            phone: phoneNumber,
            status: 'failed',
            error: error instanceof Error ? error.message : '发送失败'
          })

          setSendProgress(prev => ({
            ...prev,
            failed: prev.failed + 1
          }))
        }

        // 添加延迟避免请求过快
        if (i < selectedNumbers.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200))
        }
      }

      setSendProgress(prev => ({
        ...prev,
        sent: selectedNumbers.length,
        isComplete: true,
        current: undefined
      }))

      const successCount = results.filter(r => r.status === 'success').length
      const failedCount = results.filter(r => r.status === 'failed').length

      toast({
        title: "批量发送完成",
        description: `成功发送 ${successCount} 条，失败 ${failedCount} 条`,
      })

      // 回调通知父组件
      onSendComplete?.(results)

    } catch (error) {
      console.error('批量发送失败:', error)
      toast({
        title: "批量发送失败",
        description: "发送过程中出现错误",
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
    }
  }

  // 重置状态
  const handleClose = () => {
    if (!isSending) {
      setSelectedNumbers([])
      setSendProgress({
        total: 0,
        sent: 0,
        success: 0,
        failed: 0,
        isComplete: false
      })
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            一键批量发送短信
            {selectedTemplate && (
              <Badge variant="outline" className="ml-2">
                {selectedTemplate.name}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* 发送进度 */}
          {isSending && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>发送进度: {sendProgress.sent}/{sendProgress.total}</span>
                    <span>成功: {sendProgress.success} | 失败: {sendProgress.failed}</span>
                  </div>
                  <Progress 
                    value={sendProgress.total > 0 ? (sendProgress.sent / sendProgress.total) * 100 : 0} 
                    className="w-full"
                  />
                  {sendProgress.current && (
                    <div className="text-xs text-gray-600">
                      正在发送: {sendProgress.current}
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* 手机号码选择器 */}
          <div className="flex-1 overflow-hidden">
            <PhoneNumberSelector
              selectedNumbers={selectedNumbers}
              onSelectionChange={handlePhoneNumberChange}
              maxHeight="400px"
              disabled={isSending}
              showSearch={true}
              showGrouping={true}
            />
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-gray-600">
            {selectedTemplate && (
              <>
                模板: {selectedTemplate.name} | 
                已选择 {selectedNumbers.length} 个手机号码
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSending}
            >
              {isSending ? '发送中...' : '取消'}
            </Button>
            <Button
              onClick={handleBulkSend}
              disabled={selectedNumbers.length === 0 || isSending || !selectedTemplate}
            >
              {isSending ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  发送中... ({sendProgress.sent}/{sendProgress.total})
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  发送给 {selectedNumbers.length} 个号码
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}