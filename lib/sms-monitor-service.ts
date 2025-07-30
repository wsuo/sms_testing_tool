/**
 * 全局SMS状态监控服务 - 队列化版本
 * 提供高性能的后台批量SMS状态查询功能
 */

interface SmsStatusUpdate {
  outId: string
  status: string
  errorCode?: string
  receiveDate?: string
  phoneNumber: string
}

interface QueuedSmsTask {
  outId: string
  phoneNumber: string
  priority: number // 优先级：数字越小优先级越高
  retryCount: number
  addedAt: Date
  lastRetryAt?: Date
}

class SmsMonitorService {
  private processingInterval: NodeJS.Timeout | null = null
  private isRunning = false
  private taskQueue: QueuedSmsTask[] = [] // 优先级队列
  private processing = false // 防止重入
  private updateCallbacks = new Set<(updates: SmsStatusUpdate[]) => void>()
  
  // 配置参数
  private readonly PROCESSING_INTERVAL = 2000 // 2秒处理一轮
  private readonly BATCH_SIZE = 5 // 每批处理5个SMS
  private readonly MAX_CONCURRENT = 3 // 最大并发查询数
  private readonly MAX_RETRY_COUNT = 15 // 最大重试次数（减少以避免过度查询）
  private readonly PRIORITY_DECAY = 300000 // 5分钟后降低优先级
  private readonly RETRY_BACKOFF_BASE = 2 // 重试退避基数

  /**
   * 添加SMS到监控队列
   */
  addSmsForMonitoring(outId: string, phoneNumber?: string, priority: number = 1) {
    // 检查是否已在队列中
    const existingIndex = this.taskQueue.findIndex(task => task.outId === outId)
    if (existingIndex !== -1) {
      // 更新现有任务的优先级（如果新优先级更高）
      const existingTask = this.taskQueue[existingIndex]
      if (priority < existingTask.priority) {
        existingTask.priority = priority
        this.sortQueue()
      }
      return
    }

    // 如果没有提供手机号，异步获取
    if (!phoneNumber) {
      this.getSmsRecord(outId).then(record => {
        if (record?.phone_number) {
          this.addTaskToQueue({
            outId,
            phoneNumber: record.phone_number,
            priority,
            retryCount: 0,
            addedAt: new Date()
          })
        }
      })
    } else {
      this.addTaskToQueue({
        outId,
        phoneNumber,
        priority,
        retryCount: 0,
        addedAt: new Date()
      })
    }
  }

  /**
   * 添加任务到队列并排序
   */
  private addTaskToQueue(task: QueuedSmsTask) {
    this.taskQueue.push(task)
    this.sortQueue()
    
    console.log(`SMS任务已加入队列: ${task.outId} (优先级: ${task.priority}, 队列长度: ${this.taskQueue.length})`)
    
    // 如果服务未运行，则启动
    if (!this.isRunning) {
      this.start()
    }
  }

  /**
   * 按优先级和时间排序队列
   */
  private sortQueue() {
    this.taskQueue.sort((a, b) => {
      // 首先按优先级排序
      if (a.priority !== b.priority) {
        return a.priority - b.priority
      }
      
      // 相同优先级按添加时间排序（较早的优先）
      return a.addedAt.getTime() - b.addedAt.getTime()
    })
  }

  /**
   * 移除SMS监控
   */
  removeSmsFromMonitoring(outId: string) {
    const initialLength = this.taskQueue.length
    this.taskQueue = this.taskQueue.filter(task => task.outId !== outId)
    
    if (this.taskQueue.length !== initialLength) {
      console.log(`SMS任务已从队列移除: ${outId} (剩余: ${this.taskQueue.length})`)
    }
    
    // 如果没有待处理任务，停止服务
    if (this.taskQueue.length === 0) {
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
      const response = await fetch('/api/sms-records?status=发送中&limit=200')
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          const tasks: QueuedSmsTask[] = []
          
          result.data.forEach((record: any) => {
            // 只添加重试次数未超限的记录
            if (!record.retry_count || record.retry_count < this.MAX_RETRY_COUNT) {
              const age = new Date().getTime() - new Date(record.created_at).getTime()
              const priority = this.calculatePriority(age, record.retry_count || 0)
              
              tasks.push({
                outId: record.out_id,
                phoneNumber: record.phone_number,
                priority,
                retryCount: record.retry_count || 0,
                addedAt: new Date(record.created_at),
                lastRetryAt: record.last_retry_at ? new Date(record.last_retry_at) : undefined
              })
            }
          })
          
          // 批量添加任务
          this.taskQueue.push(...tasks)
          this.sortQueue()
          
          console.log(`已加载 ${tasks.length} 条待监控的SMS记录到队列`)
          
          // 如果有待处理任务且服务未运行，启动服务
          if (this.taskQueue.length > 0 && !this.isRunning) {
            this.start()
          }
        }
      }
    } catch (error) {
      console.error('加载待监控SMS记录失败:', error)
    }
  }

  /**
   * 计算任务优先级
   */
  private calculatePriority(ageMs: number, retryCount: number): number {
    // 基础优先级（新消息优先级高）
    let priority = 1
    
    // 年龄因子：超过5分钟的消息降低优先级
    if (ageMs > this.PRIORITY_DECAY) {
      priority += Math.floor(ageMs / this.PRIORITY_DECAY)
    }
    
    // 重试因子：重试次数越多优先级越低
    priority += retryCount
    
    return Math.min(priority, 10) // 最大优先级为10
  }

  /**
   * 启动监控服务
   */
  private start() {
    if (this.isRunning) return
    
    this.isRunning = true
    console.log('队列化SMS监控服务已启动')
    
    this.processingInterval = setInterval(async () => {
      await this.processQueue()
    }, this.PROCESSING_INTERVAL)
  }

  /**
   * 停止监控服务
   */
  private stop() {
    if (!this.isRunning) return
    
    this.isRunning = false
    console.log('队列化SMS监控服务已停止')
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
      this.processingInterval = null
    }
  }

  /**
   * 处理队列 - 核心批处理逻辑
   */
  private async processQueue() {
    if (this.processing || this.taskQueue.length === 0) {
      if (this.taskQueue.length === 0) {
        this.stop()
      }
      return
    }

    this.processing = true
    
    try {
      // 获取当前批次的任务
      const batch = this.getBatchToProcess()
      if (batch.length === 0) {
        return
      }

      console.log(`开始处理批次: ${batch.length} 个SMS任务`)

      // 并发处理批次
      const results = await this.processBatch(batch)
      
      // 处理结果
      await this.handleBatchResults(batch, results)

    } catch (error) {
      console.error('队列处理失败:', error)
    } finally {
      this.processing = false
    }
  }

  /**
   * 获取当前批次要处理的任务
   */
  private getBatchToProcess(): QueuedSmsTask[] {
    const batch: QueuedSmsTask[] = []
    const now = new Date()

    for (let i = 0; i < this.taskQueue.length && batch.length < this.BATCH_SIZE; i++) {
      const task = this.taskQueue[i]
      
      // 检查是否应该跳过（重试退避）
      if (this.shouldSkipTask(task, now)) {
        continue
      }
      
      batch.push(task)
    }

    return batch
  }

  /**
   * 检查是否应该跳过任务（实现指数退避）
   */
  private shouldSkipTask(task: QueuedSmsTask, now: Date): boolean {
    if (!task.lastRetryAt) {
      return false // 首次查询，不跳过
    }

    // 计算退避时间（指数增长）
    const backoffMs = Math.pow(this.RETRY_BACKOFF_BASE, task.retryCount) * 1000
    const timeSinceLastRetry = now.getTime() - task.lastRetryAt.getTime()
    
    return timeSinceLastRetry < backoffMs
  }

  /**
   * 并发处理批次
   */
  private async processBatch(batch: QueuedSmsTask[]): Promise<(SmsStatusUpdate | null)[]> {
    // 限制并发数量
    const chunks = this.chunkArray(batch, this.MAX_CONCURRENT)
    const allResults: (SmsStatusUpdate | null)[] = []

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(task => 
        this.checkSmsStatus(task.outId, task.phoneNumber)
      )
      
      const chunkResults = await Promise.allSettled(chunkPromises)
      
      // 处理每个结果
      const processedResults = chunkResults.map(result => 
        result.status === 'fulfilled' ? result.value : null
      )
      
      allResults.push(...processedResults)
    }

    return allResults
  }

  /**
   * 数组分块
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize))
    }
    return chunks
  }

  /**
   * 处理批次结果
   */
  private async handleBatchResults(batch: QueuedSmsTask[], results: (SmsStatusUpdate | null)[]) {
    const updates: SmsStatusUpdate[] = []
    const tasksToRemove: string[] = []
    const tasksToUpdate: QueuedSmsTask[] = []

    for (let i = 0; i < batch.length; i++) {
      const task = batch[i]
      const result = results[i]

      if (result) {
        updates.push(result)
        
        // 更新数据库
        await this.updateSmsRecord(task.outId, result)
        
        // 如果状态已完成，标记为移除
        if (result.status === '已送达' || result.status === '发送失败') {
          tasksToRemove.push(task.outId)
        } else {
          // 状态仍为发送中，更新重试信息
          task.retryCount++
          task.lastRetryAt = new Date()
          tasksToUpdate.push(task)
          
          // 更新数据库重试计数
          await this.incrementRetryCount(task.outId, task.retryCount, task.lastRetryAt)
        }
      } else {
        // 查询失败，更新重试信息
        task.retryCount++
        task.lastRetryAt = new Date()
        
        if (task.retryCount >= this.MAX_RETRY_COUNT) {
          tasksToRemove.push(task.outId)
          // 将状态更新为已停止查询
          await this.updateSmsRecord(task.outId, {
            outId: task.outId,
            status: '发送中(已停止查询)',
            phoneNumber: task.phoneNumber
          })
        } else {
          tasksToUpdate.push(task)
        }
        
        // 更新数据库重试计数
        await this.incrementRetryCount(task.outId, task.retryCount, task.lastRetryAt)
      }
    }

    // 从队列中移除已完成的任务
    tasksToRemove.forEach(outId => {
      this.removeSmsFromMonitoring(outId)
    })

    // 重新排序队列（优先级可能已变化）
    if (tasksToUpdate.length > 0) {
      this.sortQueue()
    }

    // 通知订阅者
    if (updates.length > 0) {
      console.log(`批次处理完成: ${updates.length} 个状态更新`)
      this.notifySubscribers(updates)
    }
  }

  /**
   * 通知所有订阅者
   */
  private notifySubscribers(updates: SmsStatusUpdate[]) {
    this.updateCallbacks.forEach(callback => {
      try {
        callback(updates)
      } catch (error) {
        console.error('状态更新回调执行失败:', error)
      }
    })
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
  private async incrementRetryCount(outId: string, retryCount: number, lastRetryAt: Date): Promise<void> {
    try {
      await fetch('/api/sms-records', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          out_id: outId,
          retry_count: retryCount,
          last_retry_at: lastRetryAt.toISOString()
        })
      })
    } catch (error) {
      console.error('更新重试计数失败:', error)
    }
  }

  /**
   * 获取队列监控状态
   */
  getMonitoringStatus() {
    return {
      isRunning: this.isRunning,
      queueLength: this.taskQueue.length,
      processing: this.processing,
      taskQueue: this.taskQueue.map(task => ({
        outId: task.outId,
        priority: task.priority,
        retryCount: task.retryCount,
        addedAt: task.addedAt,
        lastRetryAt: task.lastRetryAt
      }))
    }
  }

  /**
   * 手动触发队列处理
   */
  async triggerManualCheck() {
    if (this.taskQueue.length > 0) {
      await this.processQueue()
    }
  }

  /**
   * 调整队列配置（用于性能调优）
   */
  adjustQueueSettings(settings: {
    batchSize?: number
    maxConcurrent?: number
    processingInterval?: number
  }) {
    if (settings.batchSize && settings.batchSize > 0) {
      (this as any).BATCH_SIZE = settings.batchSize
    }
    if (settings.maxConcurrent && settings.maxConcurrent > 0) {
      (this as any).MAX_CONCURRENT = settings.maxConcurrent
    }
    if (settings.processingInterval && settings.processingInterval >= 1000) {
      (this as any).PROCESSING_INTERVAL = settings.processingInterval
      
      // 如果服务正在运行，重启以应用新的间隔
      if (this.isRunning) {
        this.stop()
        setTimeout(() => this.start(), 100)
      }
    }
    
    console.log('队列配置已更新:', settings)
  }

  /**
   * 清空队列（紧急情况使用）
   */
  clearQueue() {
    const originalLength = this.taskQueue.length
    this.taskQueue = []
    console.log(`队列已清空，移除了 ${originalLength} 个任务`)
    
    if (originalLength > 0) {
      this.stop()
    }
  }

  /**
   * 获取队列统计信息
   */
  getQueueStats() {
    const now = new Date()
    const priorityStats = this.taskQueue.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1
      return acc
    }, {} as Record<number, number>)

    const retryStats = this.taskQueue.reduce((acc, task) => {
      const retryBucket = Math.min(Math.floor(task.retryCount / 5), 3) // 0-4, 5-9, 10-14, 15+
      const bucketName = retryBucket === 3 ? '15+' : `${retryBucket * 5}-${retryBucket * 5 + 4}`
      acc[bucketName] = (acc[bucketName] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const ageStats = this.taskQueue.reduce((acc, task) => {
      const ageMinutes = Math.floor((now.getTime() - task.addedAt.getTime()) / 60000)
      const ageBucket = ageMinutes < 5 ? '<5min' : 
                      ageMinutes < 15 ? '5-15min' : 
                      ageMinutes < 60 ? '15-60min' : '60min+'
      acc[ageBucket] = (acc[ageBucket] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      totalTasks: this.taskQueue.length,
      isProcessing: this.processing,
      isRunning: this.isRunning,
      priorityDistribution: priorityStats,
      retryDistribution: retryStats,
      ageDistribution: ageStats,
      nextProcessing: this.isRunning ? 
        new Date(Date.now() + (this as any).PROCESSING_INTERVAL) : null
    }
  }
}

// 创建全局单例
const smsMonitorService = new SmsMonitorService()

export default smsMonitorService
export type { SmsStatusUpdate }