import { IPhoneProvider, PhoneResult, BatchPhoneResult, PhoneInfo } from '../interfaces'

/**
 * 离线电话号码查询提供商（基于号段识别）
 */
export class OfflineProvider implements IPhoneProvider {
  name = 'offline'
  priority = 9 // 最低优先级，作为保底方案
  canBatch = true
  requiresToken = false

  /**
   * 中国移动号段
   */
  private readonly cmccPrefixes = [
    '134', '135', '136', '137', '138', '139', '147', '148', '150', '151',
    '152', '157', '158', '159', '172', '178', '182', '183', '184', '187',
    '188', '195', '197', '198'
  ]

  /**
   * 中国联通号段
   */
  private readonly cuccPrefixes = [
    '130', '131', '132', '145', '146', '155', '156', '166', '167', '171',
    '175', '176', '185', '186', '196'
  ]

  /**
   * 中国电信号段
   */
  private readonly ctccPrefixes = [
    '133', '153', '162', '173', '174', '177', '180', '181', '189', '190',
    '191', '193', '199'
  ]

  /**
   * 号段到运营商的映射表（预计算优化）
   */
  private readonly prefixMap = new Map<string, string>()

  constructor() {
    // 预计算号段映射表
    this.initializePrefixMap()
  }

  /**
   * 初始化号段映射表
   */
  private initializePrefixMap(): void {
    // 中国移动
    for (const prefix of this.cmccPrefixes) {
      this.prefixMap.set(prefix, '中国移动')
    }
    
    // 中国联通
    for (const prefix of this.cuccPrefixes) {
      this.prefixMap.set(prefix, '中国联通')
    }
    
    // 中国电信
    for (const prefix of this.ctccPrefixes) {
      this.prefixMap.set(prefix, '中国电信')
    }

    console.log(`离线Provider初始化完成，支持${this.prefixMap.size}个号段`)
  }

  /**
   * 检查提供商是否可用（离线Provider始终可用）
   */
  async isAvailable(): Promise<boolean> {
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

    const phoneInfo = this.identifyCarrier(phoneNumber)
    
    return {
      success: true,
      data: phoneInfo,
      provider: this.name
    }
  }

  /**
   * 批量电话号码查询
   */
  async batchLookup(phoneNumbers: string[]): Promise<BatchPhoneResult> {
    const results = new Map<string, PhoneResult>()
    let successCount = 0
    let failureCount = 0

    for (const phoneNumber of phoneNumbers) {
      if (!this.isValidPhoneNumber(phoneNumber)) {
        results.set(phoneNumber, {
          success: false,
          error: '无效的手机号码格式',
          provider: this.name
        })
        failureCount++
        continue
      }

      const phoneInfo = this.identifyCarrier(phoneNumber)
      results.set(phoneNumber, {
        success: true,
        data: phoneInfo,
        provider: this.name
      })
      successCount++
    }

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
   * 根据号段识别运营商
   */
  private identifyCarrier(phoneNumber: string): PhoneInfo {
    const prefix = phoneNumber.substring(0, 3)
    const carrier = this.prefixMap.get(prefix) || '其他'
    
    const phoneInfo: PhoneInfo = {
      phoneNumber,
      carrier,
      province: '未知',
      city: '未知',
      note: `${carrier}（离线识别）`
    }

    return phoneInfo
  }

  /**
   * 验证手机号码格式
   */
  private isValidPhoneNumber(phoneNumber: string): boolean {
    return /^1[3-9]\d{9}$/.test(phoneNumber)
  }

  /**
   * 获取支持的号段信息
   */
  getSupportedPrefixes(): {
    cmcc: string[]
    cucc: string[]
    ctcc: string[]
    total: number
  } {
    return {
      cmcc: [...this.cmccPrefixes],
      cucc: [...this.cuccPrefixes],
      ctcc: [...this.ctccPrefixes],
      total: this.prefixMap.size
    }
  }

  /**
   * 检查号段是否被支持
   */
  isSupportedPrefix(prefix: string): boolean {
    return this.prefixMap.has(prefix)
  }

  /**
   * 获取号段对应的运营商
   */
  getCarrierByPrefix(prefix: string): string | undefined {
    return this.prefixMap.get(prefix)
  }

  /**
   * 获取所有运营商的号段数量统计
   */
  getCarrierStats(): Record<string, number> {
    const stats: Record<string, number> = {
      '中国移动': 0,
      '中国联通': 0,
      '中国电信': 0
    }

    for (const carrier of this.prefixMap.values()) {
      stats[carrier] = (stats[carrier] || 0) + 1
    }

    return stats
  }

  /**
   * 更新号段信息（用于未来扩展）
   */
  updatePrefixes(updates: {
    cmcc?: string[]
    cucc?: string[]
    ctcc?: string[]
  }): void {
    let updated = false

    if (updates.cmcc) {
      // 清除旧的中国移动号段
      for (const prefix of this.cmccPrefixes) {
        this.prefixMap.delete(prefix)
      }
      // 添加新的号段
      this.cmccPrefixes.length = 0
      this.cmccPrefixes.push(...updates.cmcc)
      for (const prefix of updates.cmcc) {
        this.prefixMap.set(prefix, '中国移动')
      }
      updated = true
    }

    if (updates.cucc) {
      // 清除旧的中国联通号段
      for (const prefix of this.cuccPrefixes) {
        this.prefixMap.delete(prefix)
      }
      // 添加新的号段
      this.cuccPrefixes.length = 0
      this.cuccPrefixes.push(...updates.cucc)
      for (const prefix of updates.cucc) {
        this.prefixMap.set(prefix, '中国联通')
      }
      updated = true
    }

    if (updates.ctcc) {
      // 清除旧的中国电信号段
      for (const prefix of this.ctccPrefixes) {
        this.prefixMap.delete(prefix)
      }
      // 添加新的号段
      this.ctccPrefixes.length = 0
      this.ctccPrefixes.push(...updates.ctcc)
      for (const prefix of updates.ctcc) {
        this.prefixMap.set(prefix, '中国电信')
      }
      updated = true
    }

    if (updated) {
      console.log(`离线Provider号段更新完成，当前支持${this.prefixMap.size}个号段`)
    }
  }

  /**
   * 导出号段配置（用于备份或迁移）
   */
  exportConfig(): {
    cmcc: string[]
    cucc: string[]
    ctcc: string[]
  } {
    return {
      cmcc: [...this.cmccPrefixes],
      cucc: [...this.cuccPrefixes],
      ctcc: [...this.ctccPrefixes]
    }
  }
}