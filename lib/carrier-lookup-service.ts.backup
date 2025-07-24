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
  private cookieCache: string | null = null // 缓存获取的cookie
  private cookieExpiry = 0
  private lastRequestTime = 0
  private readonly MIN_REQUEST_INTERVAL = 2000 // 请求间隔2秒
  private readonly MAX_RETRIES = 2
  private readonly TIMEOUT = 15000
  private readonly COOKIE_CACHE_DURATION = 30 * 60 * 1000 // Cookie缓存30分钟

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
   * 获取有效的Cookie
   */
  private async getValidCookies(): Promise<string> {
    // 检查缓存的cookie是否还有效
    if (this.cookieCache && Date.now() < this.cookieExpiry) {
      return this.cookieCache
    }

    console.log('正在获取新的session cookie...')
    
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.TIMEOUT)

    try {
      // 访问主页获取cookie
      const response = await fetch('https://tool.lu/mobile/', {
        method: 'GET',
        headers: {
          'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'cache-control': 'no-cache',
          'pragma': 'no-cache',
          'sec-ch-ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"macOS"',
          'sec-fetch-dest': 'document',
          'sec-fetch-mode': 'navigate',
          'sec-fetch-site': 'none',
          'sec-fetch-user': '?1',
          'upgrade-insecure-requests': '1',
          'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
        },
        signal: controller.signal
      })

      clearTimeout(timeout)

      if (!response.ok) {
        throw new Error(`获取主页失败: ${response.status}`)
      }

      // 在Node.js中，需要特殊处理Set-Cookie头
      let cookieHeaders = response.headers.getSetCookie?.() || []
      
      if (cookieHeaders.length === 0) {
        // 尝试其他方式获取cookie
        const rawCookie = response.headers.get('set-cookie')
        if (!rawCookie) {
          throw new Error('未获取到cookie')
        }
        console.log('使用fallback方式解析cookie:', rawCookie.substring(0, 100) + '...')
        // 手动分割多个cookie
        cookieHeaders = rawCookie.split(/,(?=\s*[a-zA-Z_][a-zA-Z0-9_]*=)/)
      }

      // 解析cookie，只取name=value部分
      const cookies = cookieHeaders.map(cookie => {
        const [nameValue] = cookie.split(';')
        return nameValue.trim()
      }).filter(Boolean).join('; ')

      if (!cookies) {
        throw new Error('未能解析到有效cookie')
      }

      // 缓存cookie
      this.cookieCache = cookies
      this.cookieExpiry = Date.now() + this.COOKIE_CACHE_DURATION
      
      console.log('成功获取session cookie:', cookies.substring(0, 100) + '...')
      return cookies

    } catch (error) {
      clearTimeout(timeout)
      console.warn('获取cookie失败:', error)
      // 返回空字符串，makeRequest会处理这种情况
      return ''
    }
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
      // 先获取有效的cookie
      const cookies = await this.getValidCookies()
      
      // 构建请求头
      const headers: Record<string, string> = {
        'accept': 'application/json, text/javascript, */*; q=0.01',
        'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'priority': 'u=1, i',
        'sec-ch-ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'x-requested-with': 'XMLHttpRequest',
        'referer': 'https://tool.lu/mobile/',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
      }

      // 如果有cookie，添加到请求头
      if (cookies) {
        headers['cookie'] = cookies
      }

      // 模拟浏览器请求，使用获取到的cookie
      const response = await fetch('https://tool.lu/mobile/ajax.html', {
        method: 'POST',
        headers,
        body: `mobile=${phoneNumber}&operate=query`,
        signal: controller.signal
      })

      clearTimeout(timeout)

      if (!response.ok) {
        // 403错误可能是cookie失效，清除缓存后使用备用方案
        if (response.status === 403) {
          console.warn(`手机号码 ${phoneNumber} 查询被拒绝 (403)，清除cookie缓存并使用离线数据库`)
          console.warn(`当前使用的cookie: ${cookies ? cookies.substring(0, 100) + '...' : '无cookie'}`)
          this.cookieCache = null
          this.cookieExpiry = 0
          return this.fallbackLookup(phoneNumber)
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log(`手机号码 ${phoneNumber} 查询成功，返回数据:`, data)

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
   * 离线查询备用方案 - 基于手机号码前缀判断运营商
   */
  private fallbackLookup(phoneNumber: string): CarrierLookupResult {
    const prefix = phoneNumber.substring(0, 3)
    
    // 中国移动号段
    const cmccPrefixes = [
      '134', '135', '136', '137', '138', '139', '147', '148', '150', '151',
      '152', '157', '158', '159', '172', '178', '182', '183', '184', '187',
      '188', '195', '197', '198'
    ]
    
    // 中国联通号段
    const cuccPrefixes = [
      '130', '131', '132', '145', '146', '155', '156', '166', '167', '171',
      '175', '176', '185', '186', '196'
    ]
    
    // 中国电信号段
    const ctccPrefixes = [
      '133', '153', '162', '173', '174', '177', '180', '181', '189', '190',
      '191', '193', '199'
    ]

    let carrier = '其他'
    let province = '未知'
    let city = '未知'

    if (cmccPrefixes.includes(prefix)) {
      carrier = '中国移动'
    } else if (cuccPrefixes.includes(prefix)) {
      carrier = '中国联通'
    } else if (ctccPrefixes.includes(prefix)) {
      carrier = '中国电信'
    }

    return {
      success: true,
      data: {
        carrier,
        province,
        city
      }
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