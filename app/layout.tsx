import type { Metadata } from 'next'
import './globals.css'
import './instrumentation-client' // 导入 Sentry 客户端配置
import { Toaster } from '@/components/ui/toaster'
import { PlatformNavigation } from '@/components/platform-navigation'

export const metadata: Metadata = {
  title: 'Testing Platform - Comprehensive Testing Tools',
  description: '综合测试平台 - 包含短信测试、供应商导入、数据分析等多种测试工具',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-background">
        <PlatformNavigation />
        <main className="flex-1">
          {children}
        </main>
        <Toaster />
      </body>
    </html>
  )
}
