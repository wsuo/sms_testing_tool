/**
 * 全局SMS状态监控服务
 * 提供后台自动查询SMS状态的功能，不依赖于页面状态
 */

interface SmsStatusUpdate {
  outId: string
  status: string
  errorCode?: string
  receiveDate?: string
  phoneNumber: string
}

class SmsMonitorService {
  private interval: NodeJS.Timeout | null = null
  private isRunning = false
  private pendingMessages = new Set<string>() // 存储待查询的outId
  private updateCallbacks = new Set<(updates: SmsStatusUpdate[]) => void>()
  private readonly QUERY_INTERVAL = 3000 // 3秒查询一次
  private readonly MAX_RETRY_COUNT = 20 // 最大重试次数

  /**
   * 添加需要监控的SMS
   */
  addSmsForMonitoring(outId: string) {
    this.pendingMessages.add(outId)
    
    // 如果服务未运行，则启动
    if (!this.isRunning) {
      this.start()
    }
  }

  /**
   * 移除SMS监控
   */
  removeSmsFromMonitoring(outId: string) {
    this.pendingMessages.delete(outId)
    
    // 如果没有待监控的消息，停止服务
    if (this.pendingMessages.size === 0) {
      this.stop()
    }
  }

  /**
   * 注册状态更新回调
   */
  onStatusUpdate(callback: (updates: SmsStatusUpdate[]) => void) {
    this.updateCallbacks.add(callback)
    
    // 返回取消订阅函数
    return () => {
      this.updateCallbacks.delete(callback)
    }
  }

  /**
   * 从数据库加载待监控的SMS记录
   */
  async loadPendingMessages() {
    try {
      const response = await fetch('/api/sms-records?status=发送中&limit=100')
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          // 添加所有发送中的消息到监控列表
          result.data.forEach((record: any) => {
            // 只添加重试次数未超限的记录
            if (!record.retry_count || record.retry_count < this.MAX_RETRY_COUNT) {
              this.pendingMessages.add(record.out_id)
            }
          })
          
          console.log(`已加载 ${this.pendingMessages.size} 条待监控的SMS记录`)
          
          // 如果有待监控的消息且服务未运行，启动服务
          if (this.pendingMessages.size > 0 && !this.isRunning) {
            this.start()
          }
        }
      }
    } catch (error) {
      console.error('加载待监控SMS记录失败:', error)
    }
  }

  /**
   * 启动监控服务
   */
  private start() {
    if (this.isRunning) return
    
    this.isRunning = true
    console.log('SMS监控服务已启动')
    
    this.interval = setInterval(async () => {
      await this.checkAllPendingMessages()
    }, this.QUERY_INTERVAL)
  }

  /**
   * 停止监控服务
   */
  private stop() {
    if (!this.isRunning) return
    
    this.isRunning = false
    console.log('SMS监控服务已停止')
    
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
  }

  /**
   * 检查所有待查询的消息
   */
  private async checkAllPendingMessages() {
    if (this.pendingMessages.size === 0) {
      this.stop()
      return
    }

    const updates: SmsStatusUpdate[] = []
    const messagesToRemove: string[] = []

    for (const outId of this.pendingMessages) {
      try {
        // 检查数据库中的重试记录
        const shouldSkip = await this.checkRetryLimit(outId)
        if (shouldSkip) {
          messagesToRemove.push(outId)
          continue
        }

        // 获取SMS记录以获取手机号码
        const smsRecord = await this.getSmsRecord(outId)
        if (!smsRecord) {
          messagesToRemove.push(outId)
          continue
        }

        // 查询SMS状态
        const statusUpdate = await this.checkSmsStatus(outId, smsRecord.phone_number)
        if (statusUpdate) {
          updates.push(statusUpdate)
          
          // 更新数据库
          await this.updateSmsRecord(outId, statusUpdate)
          
          // 如果状态已完成，从监控列表中移除
          if (statusUpdate.status === '已送达' || statusUpdate.status === '发送失败') {
            messagesToRemove.push(outId)
          }
        }

        // 更新重试计数
        await this.incrementRetryCount(outId)
        
      } catch (error) {
        console.error(`检查SMS状态失败 (OutId: ${outId}):`, error)
      }
    }

    // 移除已完成或达到重试上限的消息
    messagesToRemove.forEach(outId => {
      this.pendingMessages.delete(outId)
    })

    // 通知所有订阅者
    if (updates.length > 0) {
      this.updateCallbacks.forEach(callback => {
        try {
          callback(updates)
        } catch (error) {
          console.error('状态更新回调执行失败:', error)
        }
      })
    }
  }

  /**
   * 检查重试限制
   */
  private async checkRetryLimit(outId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/sms-records?out_id=${outId}`)
      if (response.ok) {
        const result = await response.json()
        const record = result.data?.[0]
        
        if (record && record.retry_count && record.retry_count >= this.MAX_RETRY_COUNT) {
          return true // 跳过查询
        }
      }
    } catch (error) {
      console.error('检查重试计数失败:', error)
    }
    return false
  }

  /**
   * 获取SMS记录
   */
  private async getSmsRecord(outId: string): Promise<any> {
    try {
      const response = await fetch(`/api/sms-records?out_id=${outId}`)
      if (response.ok) {
        const result = await response.json()
        return result.data?.[0]
      }
    } catch (error) {
      console.error('获取SMS记录失败:', error)
    }
    return null
  }

  /**
   * 查询SMS状态
   */
  private async checkSmsStatus(outId: string, phoneNumber: string): Promise<SmsStatusUpdate | null> {
    try {
      const response = await fetch('/api/sms-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          outId,
          phoneNumber
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("API调用失败:", errorData)
        return null
      }

      const data = await response.json()
      return {
        outId,
        status: data.status,
        errorCode: data.errorCode,
        receiveDate: data.receiveDate,
        phoneNumber
      }

    } catch (error) {
      console.error("查询短信状态失败:", error)
      return null
    }
  }

  /**
   * 更新SMS记录
   */
  private async updateSmsRecord(outId: string, statusUpdate: SmsStatusUpdate): Promise<void> {
    try {
      await fetch('/api/sms-records', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          out_id: outId,
          status: statusUpdate.status,
          error_code: statusUpdate.errorCode,
          receive_date: statusUpdate.receiveDate
        })
      })
    } catch (error) {
      console.error('更新SMS记录失败:', error)
    }
  }

  /**
   * 增加重试计数
   */
  private async incrementRetryCount(outId: string): Promise<void> {
    try {
      const record = await this.getSmsRecord(outId)
      const newRetryCount = (record?.retry_count || 0) + 1
      
      await fetch('/api/sms-records', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          out_id: outId,
          retry_count: newRetryCount,
          last_retry_at: new Date().toISOString()
        })
      })
    } catch (error) {
      console.error('更新重试计数失败:', error)
    }
  }

  /**
   * 获取当前监控状态
   */
  getMonitoringStatus() {
    return {
      isRunning: this.isRunning,
      pendingCount: this.pendingMessages.size,
      pendingMessages: Array.from(this.pendingMessages)
    }
  }

  /**
   * 手动触发一次检查
   */
  async triggerManualCheck() {
    if (this.pendingMessages.size > 0) {
      await this.checkAllPendingMessages()
    }
  }
}

// 创建全局单例
const smsMonitorService = new SmsMonitorService()

export default smsMonitorService
export type { SmsStatusUpdate }