// 验证码存储管理
class VerificationStorage {
  private verificationCodes = new Map<string, { code: string; timestamp: number; attempts: number }>()
  private adminAuthTokens = new Map<string, { timestamp: number; sessionId: string; pageUrl: string }>()
  private sendLimits = new Map<string, number>()

  constructor() {
    // 定期清理过期数据
    setInterval(() => {
      this.cleanupExpiredData()
    }, 5 * 60 * 1000) // 每5分钟清理一次
  }

  private cleanupExpiredData() {
    const now = Date.now()
    
    // 清理过期验证码（5分钟）
    for (const [key, value] of this.verificationCodes.entries()) {
      if (now - value.timestamp > 5 * 60 * 1000) {
        this.verificationCodes.delete(key)
      }
    }
    
    // 清理过期认证token（12小时）
    for (const [key, value] of this.adminAuthTokens.entries()) {
      if (now - value.timestamp > 12 * 60 * 60 * 1000) {
        this.adminAuthTokens.delete(key)
      }
    }
    
    // 清理发送限制（1分钟）
    for (const [key, timestamp] of this.sendLimits.entries()) {
      if (now - timestamp > 60 * 1000) {
        this.sendLimits.delete(key)
      }
    }
  }

  // 验证码相关操作
  setVerificationCode(key: string, code: string) {
    this.verificationCodes.set(key, {
      code,
      timestamp: Date.now(),
      attempts: 0
    })
  }

  getVerificationCode(key: string) {
    return this.verificationCodes.get(key)
  }

  deleteVerificationCode(key: string) {
    this.verificationCodes.delete(key)
  }

  incrementAttempts(key: string) {
    const data = this.verificationCodes.get(key)
    if (data) {
      data.attempts++
    }
  }

  // 认证Token相关操作
  setAuthToken(token: string, sessionId: string, pageUrl: string) {
    this.adminAuthTokens.set(token, {
      timestamp: Date.now(),
      sessionId,
      pageUrl
    })
  }

  getAuthToken(token: string) {
    return this.adminAuthTokens.get(token)
  }

  deleteAuthToken(token: string) {
    this.adminAuthTokens.delete(token)
  }

  // 发送限制相关操作
  setSendLimit(key: string) {
    this.sendLimits.set(key, Date.now())
  }

  getSendLimit(key: string) {
    return this.sendLimits.get(key)
  }
}

// 全局单例实例
declare global {
  var verificationStorage: VerificationStorage | undefined
}

const storage = global.verificationStorage ?? new VerificationStorage()

if (process.env.NODE_ENV !== 'production') {
  global.verificationStorage = storage
}

export default storage