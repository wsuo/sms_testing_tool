"use client"

import React, { useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Lock, Shield, Eye, EyeOff } from 'lucide-react'

interface AuthDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  title?: string
  description?: string
}

export function AuthDialog({ 
  isOpen, 
  onClose, 
  onSuccess,
  title = "管理员认证",
  description = "请输入管理员密码以访问此功能"
}: AuthDialogProps) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) {
      setError('请输入密码')
      return
    }

    setError('')
    setIsLoading(true)

    try {
      const result = await login(password)
      
      if (result.success) {
        setPassword('')
        onClose()
        onSuccess?.()
      } else {
        setError(result.message || '认证失败')
      }
    } catch (error) {
      setError('网络连接失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setPassword('')
    setError('')
    setShowPassword(false)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="password">管理员密码</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="请输入管理员密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
                autoComplete="current-password"
                autoFocus
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleClose}
              disabled={isLoading}
            >
              取消
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isLoading || !password.trim()}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  验证中...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  验证并进入
                </div>
              )}
            </Button>
          </div>
        </form>

        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground text-center">
            🔒 认证成功后，您将可以访问所有管理功能，无需重复输入密码
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}