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

  // 公开页面路径 - 无需认证即可访问
  const publicPages = [
    '/',
    '/training',
    '/training/exam',
    '/training/result'
  ]

  // 检查是否为公开页面
  if (publicPages.some(page => pathname === page || pathname.startsWith(page + '/'))) {
    return NextResponse.next()
  }

  // API路由认证检查
  if (pathname.startsWith('/api/')) {
    // 公开API路由 - 无需认证
    const publicApiRoutes = [
      '/api/auth/login',
      '/api/training/start',
      '/api/training/submit'
    ]

    // 检查是否为公开API路由
    if (publicApiRoutes.some(route => pathname.startsWith(route))) {
      return NextResponse.next()
    }

    // 需要认证的API路由
    const authToken = request.cookies.get('platform-auth')?.value
    const platformPassword = process.env.PLATFORM_PASSWORD || 'admin123'

    if (!authToken || authToken !== platformPassword) {
      return NextResponse.json(
        { success: false, message: '需要管理员认证' },
        { status: 401 }
      )
    }
  }

  // 前端页面路径 - 在前端处理认证检查，不在middleware中阻止访问
  // 这样用户可以看到页面并通过对话框进行认证
  return NextResponse.next()
}

// 配置中间件匹配路径
export const config = {
  matcher: [
    /*
     * 匹配所有请求路径，除了：
     * - _next/static (静态文件)
     * - _next/image (图片优化)
     * - favicon.ico (网站图标)
     * - 其他静态资源文件
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.).*)'
  ]
}