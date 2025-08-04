"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  MessageSquare, 
  BarChart, 
  Timer, 
  Upload, 
  Home, 
  Settings,
  Menu,
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}

const navigationItems: NavigationItem[] = [
  {
    name: "仪表板",
    href: "/",
    icon: Home,
    description: "平台概览和快速访问"
  },
  {
    name: "短信测试",
    href: "/sms-testing",
    icon: MessageSquare,
    description: "发送和监控短信消息"
  },
  {
    name: "公司数据导入",
    href: "/supplier-import",
    icon: Upload,
    description: "导入和管理公司数据"
  },
  {
    name: "数据分析",
    href: "/analytics",
    icon: BarChart,
    description: "查看测试分析和报告"
  },
  {
    name: "自动测试",
    href: "/auto-test",
    icon: Timer,
    description: "自动化测试调度"
  }
]

interface PlatformNavigationProps {
  className?: string
}

export function PlatformNavigation({ className }: PlatformNavigationProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

  const NavigationContent = () => (
    <>
      {navigationItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href || 
          (item.href !== "/" && pathname.startsWith(item.href))
        
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              isActive 
                ? "bg-accent text-accent-foreground" 
                : "text-muted-foreground"
            )}
            onClick={() => setMobileMenuOpen(false)}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden md:inline">{item.name}</span>
          </Link>
        )
      })}
    </>
  )

  return (
    <header className={cn("border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60", className)}>
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and Brand */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <Settings className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-semibold">测试平台</h1>
                <p className="text-xs text-muted-foreground">全面的测试工具</p>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <NavigationContent />
          </nav>

          {/* Mobile Navigation */}
          <div className="md:hidden">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">切换导航菜单</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
                      <Settings className="h-3 w-3 text-primary-foreground" />
                    </div>
                    <span className="font-semibold">测试平台</span>
                  </div>
                </div>
                <nav className="flex flex-col gap-2">
                  {navigationItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href || 
                      (item.href !== "/" && pathname.startsWith(item.href))
                    
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                          "hover:bg-accent hover:text-accent-foreground",
                          isActive 
                            ? "bg-accent text-accent-foreground" 
                            : "text-muted-foreground"
                        )}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Icon className="h-4 w-4" />
                        <div>
                          <div>{item.name}</div>
                          <div className="text-xs text-muted-foreground">{item.description}</div>
                        </div>
                      </Link>
                    )
                  })}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  )
}
