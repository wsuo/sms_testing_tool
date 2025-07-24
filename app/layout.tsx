import type { Metadata } from 'next'
import './globals.css'
import './instrumentation-client' // 导入 Sentry 客户端配置
import { Toaster } from '@/components/ui/toaster'

export const metadata: Metadata = {
  title: 'SMS测试工具',
  description: '短信发送和状态监控测试平台',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
