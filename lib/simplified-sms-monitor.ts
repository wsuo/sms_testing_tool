/**
 * 简化的后端SMS监控服务
 * 在API路由中运行，不依赖复杂的后台任务
 */

import { smsRecordDB } from './database'

interface SimpleSmsMonitor {
  isRunning: boolean
  lastCheck: Date | null
}

class SimplifiedSmsMonitor {
  private status: SimpleSmsMonitor = {
    isRunning: false,
    lastCheck: null
  }

  /**
   * 手动处理待监控的SMS记录
   */
  async processPendingMessages(): Promise<{ processed: number; updated: number }> {
    try {
      console.log('开始处理待监控的SMS记录...')
      this.status.isRunning = true
      this.status.lastCheck = new Date()

      // 获取所有"发送中"状态且重试次数未超限的记录
      const pendingRecords = await smsRecordDB.findPendingRecords()
      const validRecords = pendingRecords.filter(record => 
        (record.retry_count || 0) < 15 // 最大重试15次
      )

      console.log(`找到 ${validRecords.length} 条待处理的SMS记录`)

      let updatedCount = 0

      // 逐个处理（避免并发压力）
      for (const record of validRecords) {
        try {
          // 检查重试间隔
          if (record.last_retry_at) {
            const lastRetryTime = new Date(record.last_retry_at).getTime()
            const now = Date.now()
            const retryInterval = Math.pow(2, record.retry_count || 0) * 60000 // 指数退避，分钟级
            
            if (now - lastRetryTime < retryInterval) {
              continue // 跳过，还未到重试时间
            }
          }

          // 查询SMS状态
          const statusUpdate = await this.checkSmsStatus(record.out_id, record.phone_number)
          
          if (statusUpdate) {
            // 更新状态
            await smsRecordDB.updateStatus(record.out_id, {
              status: statusUpdate.status,
              error_code: statusUpdate.errorCode,
              receive_date: statusUpdate.receiveDate
            })

            console.log(`SMS状态更新: ${record.out_id} -> ${statusUpdate.status}`)
            updatedCount++
          } else {
            // 查询失败，增加重试计数
            const newRetryCount = (record.retry_count || 0) + 1
            
            if (newRetryCount >= 15) {
              // 达到最大重试次数，停止监控
              await smsRecordDB.updateStatus(record.out_id, {
                status: '发送中(已停止查询)'
              })
              console.log(`SMS达到最大重试次数: ${record.out_id}`)
            }

            // 更新重试计数
            await smsRecordDB.incrementRetryCount(record.out_id)
          }

          // 添加延迟避免频繁请求
          await new Promise(resolve => setTimeout(resolve, 1000))

        } catch (error) {
          console.error(`处理SMS记录失败: ${record.out_id}`, error)
        }
      }

      console.log(`SMS监控处理完成，共处理 ${validRecords.length} 条，更新 ${updatedCount} 条`)

      return {
        processed: validRecords.length,
        updated: updatedCount
      }

    } catch (error) {
      console.error('处理待监控SMS记录失败:', error)
      return { processed: 0, updated: 0 }
    } finally {
      this.status.isRunning = false
    }
  }

  /**
   * 查询单个SMS状态
   */
  private async checkSmsStatus(outId: string, phoneNumber: string): Promise<any> {
    try {
      // 构建内部API调用URL
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3030'
      
      const response = await fetch(`${baseUrl}/api/sms-status`, {
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
   * 获取监控状态
   */
  getStatus(): SimpleSmsMonitor {
    return { ...this.status }
  }

  /**
   * 添加新SMS到数据库监控（简化版）
   */
  async addSmsForMonitoring(outId: string, phoneNumber: string): Promise<boolean> {
    try {
      // 这里只是确保SMS记录存在于数据库中
      // 实际的监控会通过定时调用processPendingMessages来处理
      const record = await smsRecordDB.findByOutId(outId)
      
      if (record && record.status === '发送中') {
        console.log(`SMS ${outId} 已在监控队列中`)
        return true
      }
      
      return false
    } catch (error) {
      console.error('添加SMS监控失败:', error)
      return false
    }
  }
}

// 创建全局单例
const simplifiedSmsMonitor = new SimplifiedSmsMonitor()

export default simplifiedSmsMonitor