/**
 * 运营商查询服务
 * 使用第三方API自动查询手机号码的运营商、省份、城市信息
 */

export interface CarrierInfo {
  carrier: string  // 运营商
  province: string // 省份
  city: string     // 城市
  areacode?: string // 区号
  postcode?: string // 邮编
}

export interface CarrierLookupResult {
  success: boolean
  data?: CarrierInfo
  error?: string
}

class CarrierLookupService {
  private cache = new Map<string, CarrierInfo>()
  private lastRequestTime = 0
  private readonly MIN_REQUEST_INTERVAL = 1000 // 最小请求间隔1秒
  private readonly MAX_RETRIES = 3
  private readonly TIMEOUT = 10000 // 10秒超时

  /**
   * 运营商名称映射
   */
  private carrierMap: Record<string, string> = {
    '移动': '中国移动',
    '联通': '中国联通', 
    '电信': '中国电信',
    '中国移动': '中国移动',
    '中国联通': '中国联通',
    '中国电信': '中国电信',
  }

  /**
   * 查询手机号码的运营商信息
   */
  async lookupCarrier(phoneNumber: string): Promise<CarrierLookupResult> {
    // 验证手机号码格式
    if (!this.isValidPhoneNumber(phoneNumber)) {
      return {
        success: false,
        error: '无效的手机号码格式'
      }
    }

    // 检查缓存
    const cached = this.cache.get(phoneNumber)
    if (cached) {
      return {
        success: true,
        data: cached
      }
    }

    // 请求限速
    await this.rateLimit()

    // 重试机制
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const result = await this.makeRequest(phoneNumber)
        if (result.success && result.data) {
          // 缓存结果
          this.cache.set(phoneNumber, result.data)
          return result
        }
        
        // 如果不是最后一次尝试，等待后重试
        if (attempt < this.MAX_RETRIES) {
          await this.delay(1000 * attempt) // 递增延迟
        }
      } catch (error) {
        console.error(`运营商查询失败 (尝试 ${attempt}/${this.MAX_RETRIES}):`, error)
        
        // 如果是最后一次尝试，返回错误
        if (attempt === this.MAX_RETRIES) {
          return {
            success: false,
            error: error instanceof Error ? error.message : '查询运营商信息失败'
          }
        }
        
        // 等待后重试
        await this.delay(1000 * attempt)
      }
    }

    return {
      success: false,
      error: '查询运营商信息失败，已达到最大重试次数'
    }
  }

  /**
   * 批量查询运营商信息
   */
  async batchLookupCarriers(phoneNumbers: string[]): Promise<Map<string, CarrierLookupResult>> {
    const results = new Map<string, CarrierLookupResult>()
    
    for (const phoneNumber of phoneNumbers) {
      try {
        const result = await this.lookupCarrier(phoneNumber)
        results.set(phoneNumber, result)
        
        // 批量查询时添加额外延迟，避免请求过于频繁
        await this.delay(500)
      } catch (error) {
        results.set(phoneNumber, {
          success: false,
          error: error instanceof Error ? error.message : '查询失败'
        })
      }
    }
    
    return results
  }

  /**
   * 发起API请求
   */
  private async makeRequest(phoneNumber: string): Promise<CarrierLookupResult> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.TIMEOUT)

    try {
      const response = await fetch('https://tool.lu/mobile/ajax.html', {
        method: 'POST',
        headers: {
          'accept': 'application/json, text/javascript, */*; q=0.01',
          'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'x-requested-with': 'XMLHttpRequest',
          'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        },
        body: `mobile=${phoneNumber}&operate=query`,
        signal: controller.signal
      })

      clearTimeout(timeout)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (!data.status) {
        throw new Error(data.message || '查询失败')
      }

      if (!data.text) {
        throw new Error('未返回有效数据')
      }

      // 转换数据格式
      const carrierInfo: CarrierInfo = {
        carrier: this.normalizeCarrier(data.text.corp || '未知'),
        province: data.text.province || '未知',
        city: data.text.city || '未知',
        areacode: data.text.areacode,
        postcode: data.text.postcode
      }

      return {
        success: true,
        data: carrierInfo
      }

    } catch (error) {
      clearTimeout(timeout)
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('查询超时')
      }
      
      throw error
    }
  }

  /**
   * 规范化运营商名称
   */
  private normalizeCarrier(carrier: string): string {
    return this.carrierMap[carrier] || '其他'
  }

  /**
   * 验证手机号码格式
   */
  private isValidPhoneNumber(phoneNumber: string): boolean {
    return /^1[3-9]\d{9}$/.test(phoneNumber)
  }

  /**
   * 请求限速
   */
  private async rateLimit(): Promise<void> {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    
    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      const waitTime = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest
      await this.delay(waitTime)
    }
    
    this.lastRequestTime = Date.now()
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * 获取缓存状态
   */
  getCacheStatus(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    }
  }
}

// 创建全局单例
const carrierLookupService = new CarrierLookupService()

export default carrierLookupService
export { CarrierLookupService }