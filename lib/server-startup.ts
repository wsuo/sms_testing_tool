/**
 * 服务器自动启动配置
 * 在Next.js服务器启动时自动初始化后台服务
 */

import backgroundSmsMonitor from './background-sms-monitor'

let isInitialized = false

/**
 * 初始化后台服务
 */
export async function initializeBackgroundServices() {
  if (isInitialized) {
    return
  }

  try {
    console.log('正在初始化后台服务...')
    
    // 启动后台SMS监控服务
    await backgroundSmsMonitor.start()
    
    isInitialized = true
    console.log('后台服务初始化完成')
  } catch (error) {
    console.error('后台服务初始化失败:', error)
  }
}

/**
 * 停止后台服务
 */
export function stopBackgroundServices() {
  if (!isInitialized) {
    return
  }

  try {
    console.log('正在停止后台服务...')
    
    // 停止后台SMS监控服务
    backgroundSmsMonitor.stop()
    
    isInitialized = false
    console.log('后台服务已停止')
  } catch (error) {
    console.error('停止后台服务失败:', error)
  }
}

/**
 * 获取初始化状态
 */
export function getInitializationStatus() {
  return {
    isInitialized,
    backgroundSmsMonitor: backgroundSmsMonitor.getStatus()
  }
}

export default {
  initializeBackgroundServices,
  stopBackgroundServices,
  getInitializationStatus
}