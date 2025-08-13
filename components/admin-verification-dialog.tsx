"use client"

import React, { useState, useEffect, useRef } from 'react'
import { useAdminAuth } from '@/contexts/admin-auth-context'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Shield, Mail, Clock, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react'

interface AdminVerificationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onVerified: () => void
  actionName: string
}

export function AdminVerificationDialog({ 
  open, 
  onOpenChange, 
  onVerified,
  actionName
}: AdminVerificationDialogProps) {
  const {
    isAdminAuthenticated,
    sendVerificationCode,
    verifyCode,
    isVerificationSent,
    lastSendTime,
    canResend,
    resendCountdown,
    clearAuth
  } = useAdminAuth()

  const [verificationInput, setVerificationInput] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // 如果已经通过认证，直接执行操作并关闭对话框
  useEffect(() => {
    if (isAdminAuthenticated && open) {
      onVerified()
      onOpenChange(false)
    }
  }, [isAdminAuthenticated, open, onVerified, onOpenChange])

  // 对话框打开时自动聚焦输入框
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [open])

  // 清理状态
  useEffect(() => {
    if (!open) {
      setVerificationInput('')
      setError('')
      setIsVerifying(false)
      setIsSending(false)
    }
  }, [open])

  const handleSendCode = async () => {
    if (!canResend || isSending) return

    setIsSending(true)
    setError('')

    try {
      const result = await sendVerificationCode()
      if (result.success) {
        toast({
          title: "验证码已发送",
          description: `验证码已发送到管理员邮箱，发送时间：${result.sendTime}`,
        })
      } else {
        setError(result.message || '发送失败')
        toast({
          variant: "destructive",
          title: "发送失败",
          description: result.message || '发送验证码失败，请重试'
        })
      }
    } catch (error) {
      setError('网络错误，请重试')
      toast({
        variant: "destructive",
        title: "网络错误",
        description: '无法连接到服务器，请检查网络后重试'
      })
    } finally {
      setIsSending(false)
    }
  }

  const handleVerifyCode = async () => {
    if (!verificationInput.trim() || isVerifying) return

    if (verificationInput.length !== 6) {
      setError('请输入6位验证码')
      return
    }

    setIsVerifying(true)
    setError('')

    try {
      const result = await verifyCode(verificationInput)
      if (result.success) {
        toast({
          title: "验证成功",
          description: "管理员身份验证通过，现在可以执行敏感操作"
        })
        onVerified()
        onOpenChange(false)
      } else {
        setError(result.message || '验证失败')
        setVerificationInput('') // 清空输入框
      }
    } catch (error) {
      setError('验证失败，请重试')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isVerifying) {
      handleVerifyCode()
    }
  }

  const formatTime = (time: string | null) => {
    if (!time) return ''
    return time.replace(/(\d{4}-\d{2}-\d{2})\s(\d{2}:\d{2}:\d{2})/, '$1 $2')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <DialogTitle className="flex items-center justify-center gap-2 text-amber-600">
            <Shield className="w-5 h-5" />
            管理员安全验证
          </DialogTitle>
          <DialogDescription className="space-y-2">
            <div>执行「{actionName}」需要管理员验证</div>
            <div className="text-sm text-muted-foreground">
              验证码将发送到管理员邮箱，有效期5分钟
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 发送验证码区域 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-blue-500" />
                <span>发送到：wangsuoo@qq.com</span>
              </div>
              {lastSendTime && (
                <Badge variant="outline" className="text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatTime(lastSendTime)}
                </Badge>
              )}
            </div>

            <Button
              onClick={handleSendCode}
              disabled={!canResend || isSending}
              className="w-full bg-blue-600 hover:bg-blue-700"
              variant={isVerificationSent ? "outline" : "default"}
            >
              {isSending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  发送中...
                </>
              ) : isVerificationSent ? (
                canResend ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    重新发送验证码
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4 mr-2" />
                    {resendCountdown}秒后可重发
                  </>
                )
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  发送验证码
                </>
              )}
            </Button>
          </div>

          {/* 验证码输入区域 */}
          {isVerificationSent && (
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">请输入6位验证码</label>
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder="输入6位数字验证码"
                  value={verificationInput}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                    setVerificationInput(value)
                    if (error) setError('')
                  }}
                  onKeyPress={handleKeyPress}
                  disabled={isVerifying}
                  className="text-center text-lg tracking-widest font-mono"
                  maxLength={6}
                />
              </div>

              <Button
                onClick={handleVerifyCode}
                disabled={verificationInput.length !== 6 || isVerifying}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    验证中...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    验证并继续
                  </>
                )}
              </Button>
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* 提示信息 */}
          <Alert>
            <Shield className="w-4 h-4" />
            <AlertDescription className="text-xs space-y-1">
              <div>• 验证码有效期为5分钟</div>
              <div>• 验证通过后在当前页面12小时内有效</div>
              <div>• 切换页面后需要重新验证</div>
            </AlertDescription>
          </Alert>
        </div>
      </DialogContent>
    </Dialog>
  )
}