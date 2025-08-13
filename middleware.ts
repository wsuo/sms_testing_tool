import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 静态资源和Next.js内部路由放行
  if (
    pathname.startsWith('/_next/') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  // 员工培训答题入口无需认证，允许直接访问
  if (pathname === '/training' || pathname.startsWith('/training/exam') || pathname.startsWith('/training/result')) {
    return NextResponse.next()
  }

  // API路由的培训模块部分无需认证
  if (pathname.startsWith('/api/training/') && !pathname.includes('/admin')) {
    return NextResponse.next()
  }

  // 检查是否已认证
  const authToken = request.cookies.get('platform-auth')?.value
  const platformPassword = process.env.PLATFORM_PASSWORD || 'admin123'

  // 需要认证的页面：管理员培训统计页面和其他管理功能
  const requiresAuth = pathname.startsWith('/training/admin') || 
                      pathname.startsWith('/sms-testing') || 
                      pathname.startsWith('/supplier-import') ||
                      pathname.startsWith('/project-progress') ||
                      pathname.startsWith('/monitor') ||
                      (pathname.startsWith('/api/') && pathname.includes('admin'))

  if (requiresAuth) {
    if (!authToken || authToken !== platformPassword) {
      // 重定向到认证页面，并携带回调URL
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

// 配置中间件匹配路径
export const config = {
  matcher: [
    /*
     * 匹配所有请求路径，除了：
     * - api/training (员工培训API，无需认证)
     * - _next/static (静态文件)
     * - _next/image (图片优化)
     * - favicon.ico (网站图标)
     * - 其他静态资源文件
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.).*)'
  ]
}