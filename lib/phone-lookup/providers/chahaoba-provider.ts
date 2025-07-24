import { IPhoneProvider, PhoneResult, BatchPhoneResult, PhoneInfo } from '../interfaces'

/**
 * Chahaoba.com 电话号码批量查询提供商
 */
export class ChahabaoProvider implements IPhoneProvider {
  name = 'chahaoba'
  priority = 1 // 最高优先级
  canBatch = true
  requiresToken = true

  private token: string = ''
  private cache = new Map<string, PhoneInfo>()
  private lastRequestTime = 0
  private readonly MIN_REQUEST_INTERVAL = 1000 // 1秒间隔
  private readonly MAX_BATCH_SIZE = 20 // 最大批量查询数量
  private readonly TIMEOUT = 30000 // 30秒超时
  private readonly MAX_RETRIES = 2

  /**
   * 运营商名称映射
   */
  private carrierMap: Record<string, string> = {
    '中国移动': '中国移动',
    '中国联通': '中国联通',
    '中国电信': '中国电信',
    '移动': '中国移动',
    '联通': '中国联通',
    '电信': '中国电信'
  }

  constructor(token?: string) {
    if (token) {
      this.token = token
    }
  }

  /**
   * 设置Token
   */
  setToken(token: string): void {
    this.token = token
  }

  /**
   * 检查提供商是否可用
   */
  async isAvailable(): Promise<boolean> {
    // 如果没有token，直接返回不可用
    if (!this.token) {
      console.log('Chahaoba provider不可用：缺少token')
      return false
    }

    // 简单的token格式验证，避免发送真实请求触发反爬虫
    if (this.token.length < 10) {
      console.log('Chahaoba provider不可用：token格式无效')
      return false
    }

    console.log('Chahaoba provider标记为可用（基于token存在性检查）')
    return true
  }

  /**
   * 单个电话号码查询
   */
  async lookup(phoneNumber: string): Promise<PhoneResult> {
    // 验证手机号码格式
    if (!this.isValidPhoneNumber(phoneNumber)) {
      return {
        success: false,
        error: '无效的手机号码格式',
        provider: this.name
      }
    }

    // 检查缓存
    const cached = this.cache.get(phoneNumber)
    if (cached) {
      return {
        success: true,
        data: cached,
        provider: this.name
      }
    }

    // 使用批量查询接口查询单个号码
    const batchResult = await this.batchLookup([phoneNumber])
    
    if (batchResult.success && batchResult.results.has(phoneNumber)) {
      const result = batchResult.results.get(phoneNumber)!
      return {
        ...result,
        provider: this.name
      }
    }

    return {
      success: false,
      error: '查询失败',
      provider: this.name
    }
  }

  /**
   * 批量电话号码查询
   */
  async batchLookup(phoneNumbers: string[]): Promise<BatchPhoneResult> {
    if (!this.token) {
      return {
        success: false,
        results: new Map(),
        totalCount: phoneNumbers.length,
        successCount: 0,
        failureCount: phoneNumbers.length,
        provider: this.name
      }
    }

    // 验证所有手机号码格式
    const validPhoneNumbers = phoneNumbers.filter(phone => this.isValidPhoneNumber(phone))
    const invalidCount = phoneNumbers.length - validPhoneNumbers.length

    if (validPhoneNumbers.length === 0) {
      return {
        success: false,
        results: new Map(),
        totalCount: phoneNumbers.length,
        successCount: 0,
        failureCount: phoneNumbers.length,
        provider: this.name
      }
    }

    // 检查缓存
    const results = new Map<string, PhoneResult>()
    const uncachedNumbers: string[] = []

    for (const phoneNumber of validPhoneNumbers) {
      const cached = this.cache.get(phoneNumber)
      if (cached) {
        results.set(phoneNumber, {
          success: true,
          data: cached,
          provider: this.name
        })
      } else {
        uncachedNumbers.push(phoneNumber)
      }
    }

    // 如果所有号码都有缓存，直接返回
    if (uncachedNumbers.length === 0) {
      return {
        success: true,
        results,
        totalCount: phoneNumbers.length,
        successCount: results.size,
        failureCount: invalidCount,
        provider: this.name
      }
    }

    // 批量查询未缓存的号码
    await this.rateLimit()

    // 分批处理（每批最多20个）
    const batches = this.chunkArray(uncachedNumbers, this.MAX_BATCH_SIZE)
    
    for (const batch of batches) {
      try {
        const batchResults = await this.makeBatchRequest(batch)
        
        // 合并结果
        for (const [phone, result] of batchResults.entries()) {
          results.set(phone, result)
          
          // 缓存成功的结果
          if (result.success && result.data) {
            this.cache.set(phone, result.data)
          }
        }
        
        // 批次间延迟
        if (batches.length > 1) {
          await this.delay(this.MIN_REQUEST_INTERVAL)
        }
      } catch (error) {
        console.error(`Chahaoba批量查询失败:`, error)
        
        // 为这批失败的号码创建错误结果
        for (const phone of batch) {
          results.set(phone, {
            success: false,
            error: error instanceof Error ? error.message : '查询失败',
            provider: this.name
          })
        }
      }
    }

    const successCount = Array.from(results.values()).filter(r => r.success).length
    const failureCount = phoneNumbers.length - successCount

    return {
      success: successCount > 0,
      results,
      totalCount: phoneNumbers.length,
      successCount,
      failureCount,
      provider: this.name
    }
  }

  /**
   * 发起批量查询请求
   */
  private async makeBatchRequest(phoneNumbers: string[]): Promise<Map<string, PhoneResult>> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.TIMEOUT)

    try {
      // 构建请求体
      const phoneRanges = phoneNumbers.join('\n')
      const body = new URLSearchParams({
        phone_ranges: phoneRanges,
        token: this.token
      })

      const response = await fetch('https://www.chahaoba.cn/page/query_mobile_all_com.php', {
        method: 'POST',
        headers: {
          'accept': '*/*',
          'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'content-type': 'application/x-www-form-urlencoded',
          'priority': 'u=1, i',
          'sec-ch-ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"macOS"',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'cross-site',
          'referer': 'https://www.chahaoba.com/',
          'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
        },
        body: body.toString(),
        signal: controller.signal
      })

      clearTimeout(timeout)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log(`Chahaoba批量查询返回数据:`, data)

      return this.parseResponse(data, phoneNumbers)

    } catch (error) {
      clearTimeout(timeout)
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('查询超时')
      }
      
      throw error
    }
  }

  /**
   * 解析API响应
   */
  private parseResponse(data: any, requestedNumbers: string[]): Map<string, PhoneResult> {
    const results = new Map<string, PhoneResult>()

    // 检查API返回的错误类型
    if (!data.success) {
      let errorMessage = data.error || '查询服务返回错误'
      
      // 识别特定的错误类型
      if (typeof data.error === 'string') {
        if (data.error.includes('reCAPTCHA') || data.error.includes('验证失败')) {
          errorMessage = 'reCAPTCHA验证失败，服务暂时不可用'
          console.warn('Chahaoba服务触发反爬虫验证，暂时不可用')
        } else if (data.error.includes('token') || data.error.includes('令牌')) {
          errorMessage = 'Token无效或已过期'
        }
      }
      
      // 如果整个请求失败，为所有号码创建错误结果
      for (const phone of requestedNumbers) {
        results.set(phone, {
          success: false,
          error: errorMessage,
          provider: this.name
        })
      }
      return results
    }

    if (!Array.isArray(data.results)) {
      // 如果整个请求失败，为所有号码创建错误结果
      for (const phone of requestedNumbers) {
        results.set(phone, {
          success: false,
          error: '查询服务返回数据格式错误',
          provider: this.name
        })
      }
      return results
    }

    // 处理成功的结果
    for (const item of data.results) {
      if (!item.query) continue

      const phoneNumber = item.query
      
      try {
        const phoneInfo: PhoneInfo = {
          phoneNumber,
          carrier: this.normalizeCarrier(item.operators || '未知'),
          province: item.province || '未知',
          city: item.city || '未知'
        }

        // 生成备注
        if (phoneInfo.carrier && phoneInfo.province && phoneInfo.city) {
          phoneInfo.note = `${phoneInfo.carrier} - ${phoneInfo.province}${phoneInfo.city === phoneInfo.province ? '' : phoneInfo.city}`
        }

        results.set(phoneNumber, {
          success: true,
          data: phoneInfo,
          provider: this.name
        })
      } catch (error) {
        results.set(phoneNumber, {
          success: false,
          error: error instanceof Error ? error.message : '解析响应失败',
          provider: this.name
        })
      }
    }

    // 为没有返回结果的号码创建错误结果
    for (const phone of requestedNumbers) {
      if (!results.has(phone)) {
        results.set(phone, {
          success: false,
          error: '未返回查询结果',
          provider: this.name
        })
      }
    }

    return results
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
}