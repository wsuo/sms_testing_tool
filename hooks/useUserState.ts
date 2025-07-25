import { useCallback } from "react"
import * as Sentry from "@sentry/nextjs"

export interface UserStateData {
  phoneNumber: string
  selectedCarrier: string
  selectedTemplate: any | null
  templateParams: Record<string, string>
}

export interface UserStateActions {
  saveUserState: (userState: UserStateData) => void
  restoreUserState: () => UserStateData | null
}

export const useUserState = (): UserStateActions => {
  
  // 保存用户状态到localStorage
  const saveUserState = useCallback((userState: UserStateData) => {
    const stateToSave = {
      phoneNumber: userState.phoneNumber,
      selectedCarrier: userState.selectedCarrier,
      selectedTemplate: userState.selectedTemplate ? {
        id: userState.selectedTemplate.id,
        name: userState.selectedTemplate.name,
        content: userState.selectedTemplate.content,
        code: userState.selectedTemplate.code,
        params: userState.selectedTemplate.params
      } : null,
      templateParams: userState.templateParams
    }
    localStorage.setItem("sms-user-state", JSON.stringify(stateToSave))
  }, [])

  // 从localStorage恢复用户状态
  const restoreUserState = useCallback((): UserStateData | null => {
    try {
      const savedState = localStorage.getItem("sms-user-state")
      if (savedState) {
        const userState = JSON.parse(savedState)
        return {
          phoneNumber: userState.phoneNumber || "",
          selectedCarrier: userState.selectedCarrier || "",
          selectedTemplate: userState.selectedTemplate || null,
          templateParams: userState.templateParams || {}
        }
      }
    } catch (error) {
      console.error('Failed to restore user state:', error)
      Sentry.captureException(error, {
        tags: { operation: 'restore_user_state' }
      })
    }
    return null
  }, [])

  return {
    saveUserState,
    restoreUserState,
  }
}