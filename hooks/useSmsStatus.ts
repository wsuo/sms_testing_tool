import { useState, useCallback } from "react"
import * as Sentry from "@sentry/nextjs"
import { useToast } from "@/hooks/use-toast"
import smsMonitorService, { SmsStatusUpdate } from "@/lib/sms-monitor-service"

export interface SmsStatus {
  outId: string
  status: string
  errorCode?: string
  receiveDate?: string
  sendDate?: string
  phoneNumber: string
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
  checkSmsStatus: (outId: string, smsPhoneNumber?: string) => Promise<any>
  refreshStatuses: () => Promise<void>
  resendSms: (outId: string, adminToken: string) => Promise<void>
  canResend: (status: string) => boolean
  setupSmsMonitorListener: () => () => void
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

  // Load SMS history from database
  const loadSmsHistory = useCallback(async () => {
    try {
      setIsLoadingSmsHistory(true)
      const response = await fetch('/api/sms-records?limit=5')
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          // Convert database records to SmsStatus format
          const historyStatuses: SmsStatus[] = result.data.map((record: any) => ({
            outId: record.out_id,
            status: record.status,
            errorCode: record.error_code,
            receiveDate: record.receive_date,
            sendDate: record.send_date || record.created_at,
            phoneNumber: record.phone_number,
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
        
        const outId = data.data ? String(data.data) : `${Date.now()}` // Convert to string for consistency

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
            // Continue without carrier/note info
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
              content: actualContent, // 保存渲染后的真实内容
              send_date: new Date().toLocaleString("zh-CN"),
              status: "发送中"
            })
          })
        } catch (dbError) {
          console.error('Failed to save SMS record to database:', dbError)
          // 不阻断用户流程，只记录错误
        }

        // Add to status monitoring
        const newStatus: SmsStatus = {
          outId,
          status: "发送中",
          sendDate: new Date().toLocaleString("zh-CN"),
          phoneNumber,
        }

        setSmsStatuses((prev) => [newStatus, ...prev])
        
        // 添加到后台监控服务 - 新SMS具有最高优先级
        smsMonitorService.addSmsForMonitoring(outId, phoneNumber.trim(), 1)

        toast({
          title: "成功",
          description: `短信发送成功，OutId: ${outId}`,
        })
      } else if (response.status === 401) {
        // If still 401 after refresh attempt
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

  // Check SMS status using Aliyun SDK
  const checkSmsStatus = useCallback(async (outId: string, smsPhoneNumber?: string) => {
    try {
      // 优先使用SMS记录的手机号，其次使用当前选择的手机号
      const phoneToUse = smsPhoneNumber
      
      if (!phoneToUse) {
        console.error("手机号码未配置")
        return null
      }

      const response = await fetch('/api/sms-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          outId,
          phoneNumber: phoneToUse // 使用正确的手机号
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("API调用失败:", errorData)
        throw new Error(errorData.error || '未知错误')
      }

      const data = await response.json()
      return data

    } catch (error) {
      console.error("查询短信状态失败:", error)
      
      // Only capture non-network errors to avoid spam
      if (error instanceof Error && !error.message.includes('fetch')) {
        Sentry.captureException(error, {
          tags: { operation: 'check_sms_status' },
          extra: { outId, phoneNumber: smsPhoneNumber }
        })
      }
      
      // Show user-friendly error message only occasionally to avoid spam
      const shouldShowToast = Math.random() < 0.3 // Show toast for 30% of errors
      
      if (shouldShowToast) {
        toast({
          title: "状态查询失败",
          description: error instanceof Error ? error.message : "无法连接到阿里云API，请检查配置",
          variant: "destructive",
        })
      }
      
      return null
    }
  }, [toast])

  // 手动刷新SMS状态
  const refreshStatuses = useCallback(async () => {
    setIsRefreshing(true)
    try {
      // 1. 触发后台监控服务的手动检查
      await smsMonitorService.triggerManualCheck()
      
      // 2. 主动查询所有"发送中"状态的SMS记录
      const pendingStatuses = smsStatuses.filter(sms => 
        sms.status === "发送中" || sms.status === "发送中(已停止查询)"
      )
      
      if (pendingStatuses.length > 0) {
        
        // 并行查询所有发送中的SMS状态
        const statusPromises = pendingStatuses.map(async (sms) => {
          try {
            const statusUpdate = await checkSmsStatus(sms.outId, sms.phoneNumber)
            if (statusUpdate) {
              // 更新数据库
              await fetch('/api/sms-records', {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  out_id: sms.outId,
                  status: statusUpdate.status,
                  error_code: statusUpdate.errorCode,
                  receive_date: statusUpdate.receiveDate
                })
              })
              
              return {
                outId: sms.outId,
                updates: statusUpdate
              }
            }
          } catch (error) {
            // 静默处理错误
          }
          return null
        })
        
        const results = await Promise.all(statusPromises)
        const successCount = results.filter(result => result !== null).length
        
        // 更新本地状态
        setSmsStatuses(prevStatuses => {
          const updatedStatuses = [...prevStatuses]
          results.forEach(result => {
            if (result) {
              const index = updatedStatuses.findIndex(sms => sms.outId === result.outId)
              if (index !== -1) {
                updatedStatuses[index] = {
                  ...updatedStatuses[index],
                  status: result.updates.status,
                  errorCode: result.updates.errorCode,
                  receiveDate: result.updates.receiveDate
                }
              }
            }
          })
          return updatedStatuses
        })
        
        if (successCount > 0) {
          toast({
            title: "刷新完成",
            description: `已更新SMS状态，成功查询 ${successCount}/${pendingStatuses.length} 条记录`,
          })
        } else {
          toast({
            title: "刷新完成",
            description: "未获取到新的状态更新，可能阿里云仍在处理中",
          })
        }
      } else {
        toast({
          title: "刷新完成",
          description: "没有发送中的记录需要查询",
        })
      }
      
      // 3. 重新加载SMS历史记录以获取最新状态
      await loadSmsHistory()
      
    } catch (error) {
      Sentry.captureException(error, {
        tags: { operation: 'refresh_statuses' },
        extra: { pendingCount: smsStatuses.filter(sms => sms.status === "发送中").length }
      })
      toast({
        title: "刷新失败",
        description: "无法更新SMS状态",
        variant: "destructive",
      })
    } finally {
      setIsRefreshing(false)
    }
  }, [smsStatuses, checkSmsStatus, loadSmsHistory, toast])

  // 重发SMS
  const resendSms = useCallback(async (outId: string, adminToken: string) => {
    // 检查是否正在重发
    if (resendingOutIds.has(outId)) {
      return
    }

    // 添加到重发状态
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

        // 添加新记录到状态监控
        if (result.data.new_record) {
          const newStatus: SmsStatus = {
            outId: result.data.new_out_id,
            status: "发送中",
            sendDate: new Date().toLocaleString("zh-CN"),
            phoneNumber: result.data.new_record.phone_number,
          }

          setSmsStatuses((prev) => [newStatus, ...prev])
          
          // 添加到后台监控服务
          smsMonitorService.addSmsForMonitoring(result.data.new_out_id, result.data.new_record.phone_number.trim(), 1)
        }

        // 重新加载SMS历史记录以获取最新状态
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
      // 从重发状态中移除
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

  // 设置SMS状态更新监听器
  const setupSmsMonitorListener = useCallback(() => {
    const unsubscribe = smsMonitorService.onStatusUpdate((updates: SmsStatusUpdate[]) => {
      setSmsStatuses(prevStatuses => {
        const updatedStatuses = [...prevStatuses]
        
        updates.forEach(update => {
          const index = updatedStatuses.findIndex(sms => sms.outId === update.outId)
          if (index !== -1) {
            updatedStatuses[index] = {
              ...updatedStatuses[index],
              status: update.status,
              errorCode: update.errorCode,
              receiveDate: update.receiveDate
            }
          }
        })
        
        return updatedStatuses
      })
    })
    
    return unsubscribe
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
    checkSmsStatus,
    refreshStatuses,
    resendSms,
    canResend,
    setupSmsMonitorListener,
  }
}