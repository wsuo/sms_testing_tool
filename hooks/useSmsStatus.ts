import { useState, useCallback } from "react"
import * as Sentry from "@sentry/nextjs"
import { useToast } from "@/hooks/use-toast"

export interface SmsStatus {
  outId: string
  status: string
  errorCode?: string
  receiveDate?: string
  sendDate?: string
  phoneNumber: string
  retryCount?: number
  lastRetryAt?: string
  createdAt?: string
}

export interface SmsStatusState {
  smsStatuses: SmsStatus[]
  isRefreshing: boolean
  resendingOutIds: Set<string>
  isLoadingSmsHistory: boolean
  isSending: boolean
}

export interface SmsStatusActions {
  setSmsStatuses: (statuses: SmsStatus[] | ((prev: SmsStatus[]) => SmsStatus[])) => void
  setIsRefreshing: (refreshing: boolean) => void
  setResendingOutIds: (outIds: Set<string> | ((prev: Set<string>) => Set<string>)) => void
  setIsLoadingSmsHistory: (loading: boolean) => void
  setIsSending: (sending: boolean) => void
  loadSmsHistory: () => Promise<void>
  sendSms: (
    selectedTemplate: any,
    phoneNumber: string,
    templateParams: Record<string, string>,
    callAdminApi: Function
  ) => Promise<void>
  refreshPendingStatuses: () => Promise<void>
  resendSms: (outId: string, adminToken: string) => Promise<void>
  canResend: (status: string) => boolean
}

export const useSmsStatus = (): SmsStatusState & SmsStatusActions => {
  const { toast } = useToast()
  
  // Status monitoring
  const [smsStatuses, setSmsStatuses] = useState<SmsStatus[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoadingSmsHistory, setIsLoadingSmsHistory] = useState(true)
  const [isSending, setIsSending] = useState(false)
  
  // Resend functionality
  const [resendingOutIds, setResendingOutIds] = useState<Set<string>>(new Set())

  // Load SMS history from database (using batch API)
  const loadSmsHistory = useCallback(async () => {
    try {
      setIsLoadingSmsHistory(true)
      
      // 使用新的批量查询API获取最近的SMS记录
      const response = await fetch('/api/sms-status/batch?limit=10&status=all')
      
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          // Convert to SmsStatus format
          const historyStatuses: SmsStatus[] = result.data.map((record: any) => ({
            outId: record.outId,
            status: record.status,
            errorCode: record.errorCode,
            receiveDate: record.receiveDate,
            sendDate: record.sendDate,
            phoneNumber: record.phoneNumber,
            retryCount: record.retryCount,
            lastRetryAt: record.lastRetryAt,
            createdAt: record.createdAt
          }))
          
          setSmsStatuses(historyStatuses)
        }
      }
    } catch (error) {
      console.error('Failed to load SMS history:', error)
      Sentry.captureException(error, {
        tags: { operation: 'load_sms_history' }
      })
    } finally {
      setIsLoadingSmsHistory(false)
    }
  }, [])

  // Send SMS
  const sendSms = useCallback(async (
    selectedTemplate: any, 
    phoneNumber: string, 
    templateParams: Record<string, string>, 
    callAdminApi: Function
  ) => {
    if (!selectedTemplate || !phoneNumber.trim()) {
      toast({
        title: "错误",
        description: "请选择模板和填写手机号码",
        variant: "destructive",
      })
      return
    }

    setIsSending(true)

    try {
      const response = await callAdminApi("/admin-api/system/sms-template/send-sms", {
        method: "POST",
        body: JSON.stringify({
          content: selectedTemplate.content,
          params: selectedTemplate.params,
          mobile: phoneNumber,
          templateCode: selectedTemplate.code,
          templateParams: templateParams,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        
        // Check for authentication error in response body
        if (data.code === 401) {
          if (!localStorage.getItem("sms-admin-token")) {
            toast({
              title: "需要配置",
              description: "请配置管理后台令牌以使用系统",
              variant: "destructive",
            })
          }
          return
        }
        
        if (data.code !== 0) {
          throw new Error(data.msg || "发送失败")
        }
        
        const outId = data.data ? String(data.data) : `${Date.now()}`

        // Save to database - query phone number details first
        try {
          // Query phone number details
          let carrier = '';
          let phoneNote = '';
          
          try {
            const phoneResponse = await fetch(`/api/phone-numbers?number=${encodeURIComponent(phoneNumber)}`);
            if (phoneResponse.ok) {
              const phoneData = await phoneResponse.json();
              if (phoneData.success && phoneData.data) {
                carrier = phoneData.data.carrier || '';
                phoneNote = phoneData.data.note || '';
              }
            }
          } catch (phoneError) {
            console.error('Failed to query phone number details:', phoneError);
          }
          
          // 渲染真实内容，替换占位符
          const renderContent = (template: string, params: Record<string, string>) => {
            let rendered = template;
            Object.keys(params).forEach(key => {
              const placeholder = `\${${key}}`;
              rendered = rendered.replaceAll(placeholder, params[key] || key);
            });
            return rendered;
          };
          
          const actualContent = selectedTemplate?.content ? 
            renderContent(selectedTemplate.content, templateParams) : 
            selectedTemplate?.content;
          
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
              template_code: selectedTemplate?.code,
              template_name: selectedTemplate?.name,
              template_params: templateParams,
              content: actualContent,
              send_date: new Date().toLocaleString("zh-CN"),
              status: "发送中"
            })
          })
        } catch (dbError) {
          console.error('Failed to save SMS record to database:', dbError)
        }

        // Add new SMS to background monitoring service
        try {
          await fetch('/api/background-monitor', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'add_sms',
              outId,
              phoneNumber: phoneNumber.trim()
            })
          })
        } catch (monitorError) {
          console.error('Failed to add SMS to background monitoring:', monitorError)
        }

        // Add to local status list
        const newStatus: SmsStatus = {
          outId,
          status: "发送中",
          sendDate: new Date().toLocaleString("zh-CN"),
          phoneNumber: phoneNumber.trim(),
        }

        setSmsStatuses((prev) => [newStatus, ...prev])

        toast({
          title: "成功",
          description: `短信发送成功，OutId: ${outId}`,
        })
      } else if (response.status === 401) {
        if (!localStorage.getItem("sms-admin-token")) {
          toast({
            title: "需要配置",
            description: "请配置管理后台令牌以使用系统",
            variant: "destructive",
          })
        }
      } else {
        throw new Error("发送失败")
      }
    } catch (error) {
      Sentry.captureException(error, {
        tags: { operation: 'send_sms' },
        extra: {
          templateId: selectedTemplate?.id,
          phoneNumber: phoneNumber,
        }
      })
      toast({
        title: "错误",
        description: "短信发送失败，请检查配置和参数",
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
    }
  }, [toast])

  // 批量刷新发送中SMS的状态 - 新的高效方法
  const refreshPendingStatuses = useCallback(async () => {
    setIsRefreshing(true)
    try {
      // 1. 获取当前显示的所有"发送中"状态的SMS
      const pendingOutIds = smsStatuses
        .filter(sms => sms.status === "发送中")
        .map(sms => sms.outId)
      
      if (pendingOutIds.length === 0) {
        toast({
          title: "刷新完成",
          description: "没有发送中的记录需要查询",
        })
        return
      }

      console.log(`批量查询 ${pendingOutIds.length} 条发送中的SMS状态`)

      // 2. 使用批量查询API获取最新状态
      const response = await fetch('/api/sms-status/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          outIds: pendingOutIds
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          let updateCount = 0
          
          // 3. 更新本地状态
          setSmsStatuses(prevStatuses => {
            const updatedStatuses = [...prevStatuses]
            
            result.data.forEach((updatedRecord: any) => {
              const index = updatedStatuses.findIndex(sms => sms.outId === updatedRecord.outId)
              if (index !== -1) {
                const oldStatus = updatedStatuses[index].status
                const newStatus = updatedRecord.status
                
                if (oldStatus !== newStatus) {
                  updateCount++
                }
                
                updatedStatuses[index] = {
                  ...updatedStatuses[index],
                  status: newStatus,
                  errorCode: updatedRecord.errorCode,
                  receiveDate: updatedRecord.receiveDate,
                  retryCount: updatedRecord.retryCount,
                  lastRetryAt: updatedRecord.lastRetryAt
                }
              }
            })
            
            return updatedStatuses
          })
          
          toast({
            title: "刷新完成",
            description: updateCount > 0 
              ? `发现 ${updateCount} 条状态更新` 
              : "所有SMS状态均为最新",
          })
        }
      } else {
        throw new Error('批量查询失败')
      }
      
    } catch (error) {
      console.error('批量刷新SMS状态失败:', error)
      Sentry.captureException(error, {
        tags: { operation: 'refresh_pending_statuses' }
      })
      toast({
        title: "刷新失败",
        description: "无法更新SMS状态，请稍后重试",
        variant: "destructive",
      })
    } finally {
      setIsRefreshing(false)
    }
  }, [smsStatuses, toast])

  // 重发SMS
  const resendSms = useCallback(async (outId: string, adminToken: string) => {
    if (resendingOutIds.has(outId)) {
      return
    }

    setResendingOutIds(prev => new Set(prev).add(outId))

    try {
      const response = await fetch('/api/sms-records/resend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          out_id: outId,
          admin_token: adminToken
        })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast({
          title: "重发成功",
          description: `短信重发成功，新OutId: ${result.data.new_out_id}`,
        })

        // Add new SMS to background monitoring
        if (result.data.new_record) {
          try {
            await fetch('/api/background-monitor', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                action: 'add_sms',
                outId: result.data.new_out_id,
                phoneNumber: result.data.new_record.phone_number.trim()
              })
            })
          } catch (monitorError) {
            console.error('Failed to add resent SMS to background monitoring:', monitorError)
          }

          const newStatus: SmsStatus = {
            outId: result.data.new_out_id,
            status: "发送中",
            sendDate: new Date().toLocaleString("zh-CN"),
            phoneNumber: result.data.new_record.phone_number,
          }

          setSmsStatuses((prev) => [newStatus, ...prev])
        }

        // 重新加载SMS历史记录
        await loadSmsHistory()

      } else {
        throw new Error(result.error || '重发失败')
      }

    } catch (error) {
      console.error('重发SMS失败:', error)
      toast({
        title: "重发失败",
        description: error instanceof Error ? error.message : "重发SMS失败，请稍后重试",
        variant: "destructive",
      })
    } finally {
      setResendingOutIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(outId)
        return newSet
      })
    }
  }, [resendingOutIds, toast, loadSmsHistory])

  // 检查记录是否可以重发
  const canResend = useCallback((status: string) => {
    const resendableStatuses = ['发送失败', '发送中(已停止查询)']
    return resendableStatuses.includes(status)
  }, [])

  return {
    // State
    smsStatuses,
    isRefreshing,
    resendingOutIds,
    isLoadingSmsHistory,
    isSending,
    
    // Actions
    setSmsStatuses,
    setIsRefreshing,
    setResendingOutIds,
    setIsLoadingSmsHistory,
    setIsSending,
    loadSmsHistory,
    sendSms,
    refreshPendingStatuses, // 新的批量刷新方法
    resendSms,
    canResend,
  }
}