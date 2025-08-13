"use client"

import React, { useState, ReactElement, cloneElement } from 'react'
import { useAdminAuth } from '@/contexts/admin-auth-context'
import { AdminVerificationDialog } from '@/components/admin-verification-dialog'

interface WithAdminAuthProps {
  children: ReactElement
  actionName: string
  requireAuth?: boolean
  onAuthRequired?: () => void
}

/**
 * 高阶组件：为需要管理员认证的操作添加验证拦截
 * 
 * @param children - 需要保护的子组件（通常是Button）
 * @param actionName - 操作名称，用于在对话框中显示
 * @param requireAuth - 是否需要认证（默认true）
 * @param onAuthRequired - 认证需求触发时的回调
 */
export function WithAdminAuth({ 
  children, 
  actionName, 
  requireAuth = true,
  onAuthRequired 
}: WithAdminAuthProps) {
  const { isAdminAuthenticated } = useAdminAuth()
  const [showVerificationDialog, setShowVerificationDialog] = useState(false)
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)

  // 如果不需要认证，直接返回原组件
  if (!requireAuth) {
    return children
  }

  const handleClick = (originalOnClick?: () => void) => {
    return (e: React.MouseEvent) => {
      // 阻止默认事件传播
      e.preventDefault()
      e.stopPropagation()

      // 如果已经通过认证，直接执行原操作
      if (isAdminAuthenticated) {
        originalOnClick?.()
        return
      }

      // 保存待执行的操作
      setPendingAction(() => originalOnClick)
      
      // 触发认证回调
      onAuthRequired?.()
      
      // 显示验证对话框
      setShowVerificationDialog(true)
    }
  }

  const handleVerified = () => {
    // 认证通过后执行原操作
    if (pendingAction) {
      pendingAction()
      setPendingAction(null)
    }
    setShowVerificationDialog(false)
  }

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setPendingAction(null)
    }
    setShowVerificationDialog(open)
  }

  // 克隆子组件并修改其onClick事件
  const enhancedChildren = cloneElement(children, {
    onClick: handleClick(children.props.onClick),
    className: `${children.props.className || ''} relative`,
    'data-admin-protected': 'true'
  })

  return (
    <>
      {enhancedChildren}
      <AdminVerificationDialog
        open={showVerificationDialog}
        onOpenChange={handleDialogClose}
        onVerified={handleVerified}
        actionName={actionName}
      />
    </>
  )
}

/**
 * Hook: 用于函数式组件中的管理员认证保护
 * 
 * @param actionName - 操作名称
 * @param requireAuth - 是否需要认证（默认true）
 * @returns 返回执行受保护操作的函数和对话框组件
 */
export function useAdminAuthProtection(actionName: string, requireAuth = true) {
  const { isAdminAuthenticated } = useAdminAuth()
  const [showVerificationDialog, setShowVerificationDialog] = useState(false)
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)

  const executeProtectedAction = (action: () => void) => {
    if (!requireAuth || isAdminAuthenticated) {
      action()
      return
    }

    setPendingAction(() => action)
    setShowVerificationDialog(true)
  }

  const handleVerified = () => {
    if (pendingAction) {
      pendingAction()
      setPendingAction(null)
    }
    setShowVerificationDialog(false)
  }

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setPendingAction(null)
    }
    setShowVerificationDialog(open)
  }

  const VerificationDialog = () => (
    <AdminVerificationDialog
      open={showVerificationDialog}
      onOpenChange={handleDialogClose}
      onVerified={handleVerified}
      actionName={actionName}
    />
  )

  return {
    executeProtectedAction,
    VerificationDialog,
    isProtected: requireAuth && !isAdminAuthenticated
  }
}

/**
 * 受保护的按钮组件
 * 
 * 这是一个预制的受保护按钮组件，结合了WithAdminAuth和Button
 */
interface ProtectedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  actionName: string
  requireAuth?: boolean
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  children: React.ReactNode
}

export function ProtectedButton({ 
  actionName, 
  requireAuth = true, 
  onClick,
  ...buttonProps 
}: ProtectedButtonProps) {
  const { executeProtectedAction, VerificationDialog } = useAdminAuthProtection(actionName, requireAuth)

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    executeProtectedAction(() => onClick?.(e))
  }

  return (
    <>
      <button {...buttonProps} onClick={handleClick} data-admin-protected="true">
        {buttonProps.children}
      </button>
      <VerificationDialog />
    </>
  )
}