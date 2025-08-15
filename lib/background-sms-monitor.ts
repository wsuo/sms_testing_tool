/**
 * 后端自动SMS监控服务 - 服务器启动时自动运行
 * 独立于前端页面，在后台持续监控SMS状态
 */

import { smsRecordDB } from './database'

interface BackgroundSmsTask {
  outId: string
  phoneNumber: string
  retryCount: number
  lastRetryAt?: Date
  createdAt: Date
}

class BackgroundSmsMonitor {
  private monitorInterval: NodeJS.Timeout | null = null
  private isRunning = false
  private taskQueue: BackgroundSmsTask[] = []
  private processing = false

  // 配置参数 - 后台监控使用更保守的设置
  private readonly MONITOR_INTERVAL = 30000 // 30秒检查一次（比前端的2秒更保守）
  private readonly BATCH_SIZE = 10 // 每批处理10个SMS
  private readonly MAX_RETRY_COUNT = 15 // 最大重试次数
  private readonly RETRY_BACKOFF_BASE = 2 // 重试退避基数
  private readonly MIN_RETRY_INTERVAL = 60000 // 最小重试间隔1分钟

  /**
   * 启动后台监控服务
   */
  async start() {
    if (this.isRunning) {
      console.log('后台SMS监控服务已在运行')
      return
    }

    console.log('启动后台SMS监控服务...')
    this.isRunning = true

    // 加载待监控的SMS记录
    await this.loadPendingMessages()

    // 启动定时监控
    this.monitorInterval = setInterval(async () => {
      await this.processQueue()
    }, this.MONITOR_INTERVAL)

    console.log(`后台SMS监控服务已启动，监控间隔: ${this.MONITOR_INTERVAL/1000}秒`)
  }

  /**
   * 停止后台监控服务
   */
  stop() {
    if (!this.isRunning) return

    this.isRunning = false
    console.log('停止后台SMS监控服务')

    if (this.monitorInterval) {
      clearInterval(this.monitorInterval)
      this.monitorInterval = null
    }
  }

  /**
   * 添加新的SMS到监控队列
   */
  addSmsForMonitoring(outId: string, phoneNumber: string) {
    // 检查是否已在队列中
    const existingIndex = this.taskQueue.findIndex(task => task.outId === outId)
    if (existingIndex !== -1) {
      console.log(`SMS ${outId} 已在监控队列中`)
      return
    }

    const task: BackgroundSmsTask = {
      outId,
      phoneNumber,
      retryCount: 0,
      createdAt: new Date()
    }

    this.taskQueue.push(task)
    console.log(`添加SMS到后台监控队列: ${outId} (队列长度: ${this.taskQueue.length})`)

    // 如果服务未运行，启动服务
    if (!this.isRunning) {
      this.start()
    }
  }

  /**
   * 从数据库加载待监控的SMS记录
   */
  private async loadPendingMessages() {
    try {
      const pendingRecords = await smsRecordDB.findPendingRecords()
      const validTasks: BackgroundSmsTask[] = []

      for (const record of pendingRecords) {
        // 只添加重试次数未超限且符合重试间隔的记录
        if ((record.retry_count || 0) < this.MAX_RETRY_COUNT) {
          const lastRetryAt = record.last_retry_at ? new Date(record.last_retry_at) : undefined
          
          // 检查重试间隔
          if (this.shouldRetryNow(record.retry_count || 0, lastRetryAt)) {
            validTasks.push({
              outId: record.out_id,
              phoneNumber: record.phone_number,
              retryCount: record.retry_count || 0,
              lastRetryAt,
              createdAt: new Date(record.created_at || Date.now())
            })
          }
        }
      }

      this.taskQueue = validTasks
      console.log(`加载了 ${validTasks.length} 条待监控的SMS记录`)

      // 如果没有待监控任务，停止服务
      if (this.taskQueue.length === 0) {
        this.stop()
      }
    } catch (error) {
      console.error('加载待监控SMS记录失败:', error)
    }
  }

  /**
   * 检查是否应该立即重试
   */
  private shouldRetryNow(retryCount: number, lastRetryAt?: Date): boolean {
    if (!lastRetryAt) {
      return true // 首次查询，立即执行
    }

    // 计算退避时间（指数增长，但有上限）
    const backoffMs = Math.min(
      Math.pow(this.RETRY_BACKOFF_BASE, retryCount) * this.MIN_RETRY_INTERVAL,
      10 * 60 * 1000 // 最大退避时间10分钟
    )

    const timeSinceLastRetry = Date.now() - lastRetryAt.getTime()
    return timeSinceLastRetry >= backoffMs
  }

  /**
   * 处理监控队列
   */
  private async processQueue() {
    if (this.processing || this.taskQueue.length === 0) {
      if (this.taskQueue.length === 0) {
        console.log('没有待监控的SMS，停止后台监控服务')
        this.stop()
      }
      return
    }

    this.processing = true

    try {
      // 获取当前批次要处理的任务
      const batch = this.getBatchToProcess()
      if (batch.length === 0) {
        return
      }

      console.log(`后台处理SMS批次: ${batch.length} 个任务`)

      // 逐个处理（避免并发压力过大）
      for (const task of batch) {
        await this.processSingleTask(task)
        // 添加小延迟避免频繁请求
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      // 重新加载队列（清理已完成的任务）
      await this.refreshQueue()

    } catch (error) {
      console.error('后台监控队列处理失败:', error)
    } finally {
      this.processing = false
    }
  }

  /**
   * 获取当前批次要处理的任务
   */
  private getBatchToProcess(): BackgroundSmsTask[] {
    const batch: BackgroundSmsTask[] = []
    const now = new Date()

    for (const task of this.taskQueue) {
      if (batch.length >= this.BATCH_SIZE) break

      // 检查是否应该重试
      if (this.shouldRetryNow(task.retryCount, task.lastRetryAt)) {
        batch.push(task)
      }
    }

    return batch
  }

  /**
   * 处理单个SMS任务
   */
  private async processSingleTask(task: BackgroundSmsTask) {
    try {
      // 查询SMS状态
      const statusUpdate = await this.checkSmsStatus(task.outId, task.phoneNumber)

      if (statusUpdate) {
        // 更新数据库状态
        await smsRecordDB.updateStatus(task.outId, {
          status: statusUpdate.status,
          error_code: statusUpdate.errorCode,
          receive_date: statusUpdate.receiveDate
        })

        console.log(`SMS状态已更新: ${task.outId} -> ${statusUpdate.status}`)

        // 如果状态已完成，任务会在refreshQueue中被移除
      } else {
        // 查询失败，增加重试计数
        task.retryCount++
        task.lastRetryAt = new Date()

        // 检查是否达到最大重试次数
        if (task.retryCount >= this.MAX_RETRY_COUNT) {
          await smsRecordDB.updateStatus(task.outId, {
            status: '发送中(已停止查询)'
          })
          console.log(`SMS达到最大重试次数: ${task.outId}`)
        }

        // 更新重试计数
        await smsRecordDB.incrementRetryCount(task.outId)
      }
    } catch (error) {
      console.error(`处理SMS任务失败: ${task.outId}`, error)
    }
  }

  /**
   * 查询SMS状态
   */
  private async checkSmsStatus(outId: string, phoneNumber: string): Promise<any> {
    try {
      const response = await fetch('http://localhost:3030/api/sms-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ outId, phoneNumber })
      })

      if (!response.ok) {
        return null
      }

      const data = await response.json()
      return {
        status: data.status,
        errorCode: data.errorCode,
        receiveDate: data.receiveDate
      }
    } catch (error) {
      console.error('查询SMS状态失败:', error)
      return null
    }
  }

  /**
   * 刷新队列（移除已完成的任务）
   */
  private async refreshQueue() {
    try {
      // 重新从数据库加载状态，移除已完成的任务
      const currentOutIds = this.taskQueue.map(task => task.outId)
      
      if (currentOutIds.length === 0) return

      // 查询这些SMS的当前状态
      const stillPendingTasks: BackgroundSmsTask[] = []

      for (const task of this.taskQueue) {
        const record = await smsRecordDB.findByOutId(task.outId)
        
        if (record && record.status === '发送中' && (record.retry_count || 0) < this.MAX_RETRY_COUNT) {
          // 更新任务的重试计数
          task.retryCount = record.retry_count || 0
          task.lastRetryAt = record.last_retry_at ? new Date(record.last_retry_at) : undefined
          stillPendingTasks.push(task)
        }
      }

      const removedCount = this.taskQueue.length - stillPendingTasks.length
      this.taskQueue = stillPendingTasks

      if (removedCount > 0) {
        console.log(`从后台监控队列移除了 ${removedCount} 个已完成的任务，剩余: ${this.taskQueue.length}`)
      }
    } catch (error) {
      console.error('刷新监控队列失败:', error)
    }
  }

  /**
   * 获取监控状态
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      queueLength: this.taskQueue.length,
      processing: this.processing,
      lastCheck: new Date(),
      tasks: this.taskQueue.map(task => ({
        outId: task.outId,
        retryCount: task.retryCount,
        lastRetryAt: task.lastRetryAt,
        nextRetry: task.lastRetryAt ? 
          new Date(task.lastRetryAt.getTime() + Math.pow(this.RETRY_BACKOFF_BASE, task.retryCount) * this.MIN_RETRY_INTERVAL) : 
          new Date()
      }))
    }
  }
}

// 创建全局单例
const backgroundSmsMonitor = new BackgroundSmsMonitor()

export default backgroundSmsMonitor