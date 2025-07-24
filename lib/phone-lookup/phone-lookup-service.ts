import { 
  IPhoneProvider, 
  PhoneResult, 
  BatchPhoneResult, 
  PhoneLookupConfig,
  TokenConfig 
} from './interfaces'
import { ChahabaoProvider } from './providers/chahaoba-provider'
import { ToolLuProvider } from './providers/tool-lu-provider'
import { OfflineProvider } from './providers/offline-provider'

/**
 * 电话号码查询服务主类
 */
export class PhoneLookupService {
  private providers: Map<string, IPhoneProvider> = new Map()
  private globalCache = new Map<string, { data: any, timestamp: number }>()
  private config: PhoneLookupConfig

  constructor(config?: Partial<PhoneLookupConfig>) {
    // 默认配置
    this.config = {
      providers: {
        chahaoba: { enabled: true, priority: 1, token: '' },
        toolLu: { enabled: true, priority: 2 },
        offline: { enabled: true, priority: 9 }
      },
      cache: {
        enabled: true,
        ttl: 60 * 60 * 1000 // 1小时
      },
      retry: {
        enabled: true,
        maxAttempts: 2,
        delay: 1000
      },
      ...config
    }

    // 初始化providers
    this.initializeProviders()
  }

  /**
   * 初始化所有providers
   */
  private initializeProviders(): void {
    // Chahaoba Provider
    if (this.config.providers.chahaoba.enabled) {
      const chahaoba = new ChahabaoProvider(this.config.providers.chahaoba.token)
      this.providers.set('chahaoba', chahaoba)
    }

    // Tool.lu Provider
    if (this.config.providers.toolLu.enabled) {
      const toolLu = new ToolLuProvider()
      this.providers.set('toolLu', toolLu)
    }

    // Offline Provider
    if (this.config.providers.offline.enabled) {
      const offline = new OfflineProvider()
      this.providers.set('offline', offline)
    }

    console.log(`PhoneLookupService初始化完成，已加载${this.providers.size}个providers`)
  }

  /**
   * 获取按优先级排序的可用providers
   */
  private async getAvailableProviders(): Promise<IPhoneProvider[]> {
    const providers: IPhoneProvider[] = []
    
    for (const provider of this.providers.values()) {
      try {
        if (await provider.isAvailable()) {
          providers.push(provider)
        }
      } catch (error) {
        console.warn(`Provider ${provider.name} 可用性检查失败:`, error)
      }
    }

    // 按优先级排序
    return providers.sort((a, b) => a.priority - b.priority)
  }

  /**
   * 单个电话号码查询
   */
  async lookup(phoneNumber: string): Promise<PhoneResult> {
    // 检查全局缓存
    if (this.config.cache.enabled) {
      const cached = this.getCachedResult(phoneNumber)
      if (cached) {
        return {
          ...cached,
          provider: cached.provider + '(cached)'
        }
      }
    }

    const availableProviders = await this.getAvailableProviders()
    
    if (availableProviders.length === 0) {
      return {
        success: false,
        error: '没有可用的查询提供商'
      }
    }

    // 依次尝试每个provider
    for (const provider of availableProviders) {
      try {
        console.log(`尝试使用${provider.name}查询手机号码: ${phoneNumber}`)
        
        let result: PhoneResult
        
        if (this.config.retry.enabled) {
          result = await this.retryOperation(
            () => provider.lookup(phoneNumber),
            this.config.retry.maxAttempts,
            this.config.retry.delay
          )
        } else {
          result = await provider.lookup(phoneNumber)
        }

        if (result.success) {
          // 缓存成功结果
          if (this.config.cache.enabled && result.data) {
            this.setCachedResult(phoneNumber, result)
          }
          
          console.log(`${provider.name}查询成功:`, result.data)
          return result
        } else {
          console.warn(`${provider.name}查询失败: ${result.error}`)
        }
      } catch (error) {
        console.error(`${provider.name}查询异常:`, error)
      }
    }

    return {
      success: false,
      error: '所有查询提供商都失败了'
    }
  }

  /**
   * 批量电话号码查询
   */
  async batchLookup(phoneNumbers: string[]): Promise<BatchPhoneResult> {
    if (phoneNumbers.length === 0) {
      return {
        success: true,
        results: new Map(),
        totalCount: 0,
        successCount: 0,
        failureCount: 0
      }
    }

    // 检查缓存
    const results = new Map<string, PhoneResult>()
    const uncachedNumbers: string[] = []

    if (this.config.cache.enabled) {
      for (const phoneNumber of phoneNumbers) {
        const cached = this.getCachedResult(phoneNumber)
        if (cached) {
          results.set(phoneNumber, {
            ...cached,
            provider: cached.provider + '(cached)'
          })
        } else {
          uncachedNumbers.push(phoneNumber)
        }
      }
    } else {
      uncachedNumbers.push(...phoneNumbers)
    }

    if (uncachedNumbers.length === 0) {
      // 全部命中缓存
      const successCount = Array.from(results.values()).filter(r => r.success).length
      return {
        success: true,
        results,
        totalCount: phoneNumbers.length,
        successCount,
        failureCount: phoneNumbers.length - successCount,
        provider: 'cache'
      }
    }

    const availableProviders = await this.getAvailableProviders()
    
    if (availableProviders.length === 0) {
      // 没有可用provider，为剩余号码创建失败结果
      for (const phoneNumber of uncachedNumbers) {
        results.set(phoneNumber, {
          success: false,
          error: '没有可用的查询提供商'
        })
      }
    } else {
      // 优先使用支持批量查询的provider
      const batchProviders = availableProviders.filter(p => p.canBatch)
      const singleProviders = availableProviders.filter(p => !p.canBatch)
      
      let remainingNumbers = [...uncachedNumbers]

      // 先尝试批量查询providers
      for (const provider of batchProviders) {
        if (remainingNumbers.length === 0) break

        try {
          console.log(`尝试使用${provider.name}批量查询${remainingNumbers.length}个手机号码`)
          
          let batchResult: BatchPhoneResult
          
          if (this.config.retry.enabled) {
            batchResult = await this.retryOperation(
              () => provider.batchLookup!(remainingNumbers),
              this.config.retry.maxAttempts,
              this.config.retry.delay
            )
          } else {
            batchResult = await provider.batchLookup!(remainingNumbers)
          }

          // 合并结果
          for (const [phone, result] of batchResult.results.entries()) {
            results.set(phone, result)
            
            // 缓存成功结果
            if (this.config.cache.enabled && result.success && result.data) {
              this.setCachedResult(phone, result)
            }
          }

          // 移除已成功查询的号码
          const successfulNumbers = Array.from(batchResult.results.entries())
            .filter(([_, result]) => result.success)
            .map(([phone, _]) => phone)
            
          remainingNumbers = remainingNumbers.filter(phone => !successfulNumbers.includes(phone))
          
          console.log(`${provider.name}批量查询完成，成功${batchResult.successCount}个，剩余${remainingNumbers.length}个`)

          // 如果批量查询很成功，就不再尝试其他provider
          if (batchResult.successCount > batchResult.failureCount) {
            break
          }
        } catch (error) {
          console.error(`${provider.name}批量查询异常:`, error)
        }
      }

      // 对剩余号码使用单个查询providers
      if (remainingNumbers.length > 0 && singleProviders.length > 0) {
        console.log(`对剩余${remainingNumbers.length}个号码使用单个查询`)
        
        for (const phoneNumber of remainingNumbers) {
          let found = false
          
          for (const provider of singleProviders) {
            try {
              const result = await provider.lookup(phoneNumber)
              
              if (result.success) {
                results.set(phoneNumber, result)
                
                // 缓存成功结果
                if (this.config.cache.enabled && result.data) {
                  this.setCachedResult(phoneNumber, result)
                }
                
                found = true
                break
              }
            } catch (error) {
              console.error(`${provider.name}单个查询异常:`, error)
            }
          }
          
          // 如果所有provider都失败了
          if (!found) {
            results.set(phoneNumber, {
              success: false,
              error: '所有查询提供商都失败了'
            })
          }
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
      provider: 'mixed'
    }
  }

  /**
   * 重试操作
   */
  private async retryOperation<T>(
    operation: () => Promise<T>,
    maxAttempts: number,
    delay: number
  ): Promise<T> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        
        if (attempt < maxAttempts) {
          console.warn(`操作失败，${delay}ms后重试 (${attempt}/${maxAttempts})`)
          await this.delay(delay)
        }
      }
    }

    throw lastError
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 获取缓存结果
   */
  private getCachedResult(phoneNumber: string): PhoneResult | null {
    const cached = this.globalCache.get(phoneNumber)
    
    if (!cached) return null
    
    // 检查是否过期
    if (Date.now() - cached.timestamp > this.config.cache.ttl) {
      this.globalCache.delete(phoneNumber)
      return null
    }
    
    return cached.data
  }

  /**
   * 设置缓存结果
   */
  private setCachedResult(phoneNumber: string, result: PhoneResult): void {
    this.globalCache.set(phoneNumber, {
      data: result,
      timestamp: Date.now()
    })
  }

  /**
   * 设置Token
   */
  setTokens(tokens: TokenConfig): void {
    if (tokens.chahaoba) {
      const chahaboa = this.providers.get('chahaboa')
      if (chahaboa && chahaboa.setToken) {
        chahaboa.setToken(tokens.chahaoba)
        console.log('Chahaoba token已更新')
      }
    }
  }

  /**
   * 获取服务状态
   */
  async getStatus(): Promise<{
    providers: Array<{
      name: string
      priority: number
      available: boolean
      canBatch: boolean
      requiresToken: boolean
    }>
    cache: {
      size: number
      enabled: boolean
    }
  }> {
    const providerStatus = []
    
    for (const provider of this.providers.values()) {
      providerStatus.push({
        name: provider.name,
        priority: provider.priority,
        available: await provider.isAvailable(),
        canBatch: provider.canBatch,
        requiresToken: provider.requiresToken
      })
    }

    return {
      providers: providerStatus.sort((a, b) => a.priority - b.priority),
      cache: {
        size: this.globalCache.size,
        enabled: this.config.cache.enabled
      }
    }
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.globalCache.clear()
    
    // 同时清空各provider的缓存
    for (const provider of this.providers.values()) {
      if ('clearCache' in provider && typeof provider.clearCache === 'function') {
        provider.clearCache()
      }
    }
    
    console.log('所有缓存已清空')
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<PhoneLookupConfig>): void {
    this.config = { ...this.config, ...config }
    console.log('服务配置已更新')
  }
}

// 创建全局单例
const defaultConfig: Partial<PhoneLookupConfig> = {
  providers: {
    chahaoba: { 
      enabled: true, 
      priority: 1, 
      token: process.env.CHAHAOBA_TOKEN || '03AFcWeA7D_UlFH1QsT4-mM1WGhhPGwsyCEhR0_1I2ztB-e7_-s1J4EbvySYRrtl3jhsFjgMMcOVd_U-NO4QO_nfNGMyeXYbT0-6arC3YFwT2zyUyIoKyBvBPX-CASx0bxDWA1dW5_akG7PYYFStoqL76U2U2EqBHS6EHzGMNMVNhKVJXMRC2qkuV1OE0CcUr7RqQePwhP7XLI18K7B9CuCN2C4s3wvlAMJx_n5_WKkWRKOAKAVStkl1ARkUeld3eKinLa3v57Gy47MRDWUsvWhES3IYY2L7iQMRc-GhmApHjAG62-VQgTlO9BPT34oYBMhjRDWv6W472Grl7HmhqzknmKhGHXRGatrYP1bBrIvygf9BYOxxvUPOBOpxxMl06bV5-I3XAlUd-zmzkS5PR_gfNL0RY1Vmnmz876j08jeeZyII6oM8QSujY8klmj_w_B5PYkNHc5UAFQ6zpat2jgcRONGCES-bvLRGfxgNGH3tuu3mprqywXKEyqyMy3erK0gDLIqG1yPDmgGIy6ekUoxKYEJZlUYNV0Cpy-aHsEGi1ZqS70_N1F7R1t06SW1zVctOYJVsiQdDQGTeIliNyQPdwtFlUybpni3EFHmi9kU8fjbEqAWy7ksjWLpwqYnRY551-z3-VXb39iBEceMk7FF6fmWwRhGVSXLpCyy6Ez2unamLwzLO1m8bvYGTPxIdmUNDntG73Tc7y39fQ2GF6Tmw3O8BLIdHMfFKo2JLre9DDFLO6hQ_-6ntBCkZmgF_k_OYdEGKCXkzAAB_UG4EtnfVpXON_-Lt2on9vTjYsenhwJq8QDynxUMiUKo1g3IBrY-pwSNXFSjm9ZjyLA8Igpzqh-rInGyfvbCNETPQr_11P19WBv_ZN92oOcfZE__ccvqd5sQ9i9LWHMxBaugMhS9JOrCDPgLhrUsl6_deZO6iVM9S995820SH0'
    },
    toolLu: { enabled: true, priority: 2 },
    offline: { enabled: true, priority: 9 }
  }
}

export const phoneLookupService = new PhoneLookupService(defaultConfig)