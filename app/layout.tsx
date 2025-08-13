import type { Metadata } from 'next'
import './globals.css'
import './instrumentation-client' // 导入 Sentry 客户端配置
import { Toaster } from '@/components/ui/toaster'
import { AuthProvider } from '@/contexts/auth-context'
import { AdminAuthProvider } from '@/contexts/admin-auth-context'

export const metadata: Metadata = {
  title: '智慧管理平台 - 企业一体化管理系统',
  description: '智慧管理平台 - 集成短信管理、数据处理、培训考试、项目跟踪等多功能企业管理工具',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-background">
        <AuthProvider>
          <AdminAuthProvider>
            <main className="flex-1">
              {children}
            </main>
            <Toaster />
          </AdminAuthProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
