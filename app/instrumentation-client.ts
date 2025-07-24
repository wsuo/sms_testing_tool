'use client'

import * as Sentry from "@sentry/nextjs"

console.log('🔧 Sentry 客户端配置开始初始化...')

try {
  Sentry.init({
    dsn: "https://bbfef629619156e66eb300d8908d9886@o4509721309216768.ingest.us.sentry.io/4509721382944768",

    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate: 1.0,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: true, // 开启 debug 模式来检查连接

    replaysOnErrorSampleRate: 1.0,

    // This sets the sample rate to be 10%. You may want this to be 100% while
    // in development and sample at a lower rate in production.
    replaysSessionSampleRate: 0.1,

    // Environment configuration
    environment: process.env.NODE_ENV || 'development',

    // Custom error handling
    beforeSend(event) {
      console.log('🚀 Sentry beforeSend 被调用，事件ID:', event.event_id);
      console.log('📦 事件详情:', event);
      return event;
    },

    // Custom tags for client-side
    initialScope: {
      tags: {
        component: "sms-testing-tool",
        platform: "client"
      },
    },

    // You can remove this option if you're not planning to use the Sentry Session Replay feature:
    integrations: [
      Sentry.replayIntegration({
        // Additional Replay configuration goes in here, for example:
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Add more debugging options
    _experiments: {
      
    },
  })
  
  console.log('✅ Sentry 客户端初始化成功')
  console.log('🔗 DSN:', "https://bbfef629619156e66eb300d8908d9886@o4509721309216768.ingest.us.sentry.io/4509721382944768")
  console.log('🎯 Sentry已初始化')
  
} catch (error) {
  console.error('❌ Sentry 客户端初始化失败:', error)
}