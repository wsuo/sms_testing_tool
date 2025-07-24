/**
 * 电话号码信息接口
 */
export interface PhoneInfo {
  phoneNumber: string
  carrier: string
  province: string  
  city: string
  note?: string
}

/**
 * 电话号码查询结果接口
 */
export interface PhoneResult {
  success: boolean
  data?: PhoneInfo
  error?: string
  provider?: string // 标识使用了哪个提供商
}

/**
 * 批量查询结果接口
 */
export interface BatchPhoneResult {
  success: boolean
  results: Map<string, PhoneResult>
  totalCount: number
  successCount: number
  failureCount: number
  provider?: string
}

/**
 * 电话号码查询提供商接口
 */
export interface IPhoneProvider {
  /** 提供商名称 */
  name: string
  
  /** 优先级（数字越小优先级越高） */
  priority: number
  
  /** 是否支持批量查询 */
  canBatch: boolean
  
  /** 是否需要token */
  requiresToken: boolean
  
  /** 
   * 单个电话号码查询
   * @param phoneNumber 电话号码
   * @returns 查询结果
   */
  lookup(phoneNumber: string): Promise<PhoneResult>
  
  /** 
   * 批量电话号码查询（可选实现）
   * @param phoneNumbers 电话号码数组
   * @returns 批量查询结果
   */
  batchLookup?(phoneNumbers: string[]): Promise<BatchPhoneResult>
  
  /**
   * 设置Token（如果需要）
   * @param token 认证token
   */
  setToken?(token: string): void
  
  /**
   * 检查提供商是否可用
   * @returns 是否可用
   */
  isAvailable(): Promise<boolean>
}

/**
 * Token配置接口
 */
export interface TokenConfig {
  chahaoba?: string
  // 未来可能的其他token
}

/**
 * 提供商配置接口
 */
export interface ProviderConfig {
  enabled: boolean
  priority: number
  token?: string
  options?: Record<string, any>
}

/**
 * 服务配置接口
 */
export interface PhoneLookupConfig {
  providers: {
    chahaoba: ProviderConfig
    toolLu: ProviderConfig  
    offline: ProviderConfig
  }
  cache: {
    enabled: boolean
    ttl: number // 缓存时间（毫秒）
  }
  retry: {
    enabled: boolean
    maxAttempts: number
    delay: number // 重试延迟（毫秒）
  }
}