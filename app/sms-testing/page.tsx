"use client"

import React, { useEffect } from "react"
import Link from "next/link"
import { Settings, BarChart, Timer, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ModuleHeader } from "@/components/module-header"
import BulkSendModal from "@/components/bulk-send-modal"

// Import custom hooks
import { useTokenManagement } from "@/hooks/useTokenManagement"
import { useSmsTemplates } from "@/hooks/useSmsTemplates"
import { usePhoneNumbers } from "@/hooks/usePhoneNumbers"
import { useSmsStatus } from "@/hooks/useSmsStatus"
import { useUserState } from "@/hooks/useUserState"

// Import components
import { LoadingPageSkeleton } from "@/components/sms/skeleton-loaders"
import { ConfigurationModal } from "@/components/sms/configuration-modal"
import { TemplateSelection } from "@/components/sms/template-selection"
import { PhoneNumberInput } from "@/components/sms/phone-number-input"
import { TemplateParameters } from "@/components/sms/template-parameters"
import { SendButtons } from "@/components/sms/send-buttons"
import { StatusMonitoring } from "@/components/sms/status-monitoring"

// Import helpers
import { getMonitoringStatus } from "@/lib/helpers/sms-helpers"

export default function SmsTestingPage() {
  // Configuration modal state
  const [showConfigModal, setShowConfigModal] = React.useState(false)
  const [showBulkSendModal, setShowBulkSendModal] = React.useState(false)
  const [isInitialLoad, setIsInitialLoad] = React.useState(true)

  // Custom hooks
  const tokenManager = useTokenManagement()
  const smsTemplates = useSmsTemplates()
  const phoneNumbers = usePhoneNumbers()
  const smsStatus = useSmsStatus()
  const userState = useUserState()

  // Calculate overall loading state
  const isPageLoading = isInitialLoad && (
    smsTemplates.isLoadingTemplates || 
    phoneNumbers.isLoadingCarriers || 
    smsStatus.isLoadingSmsHistory
  )

  // Load tokens from localStorage on mount with validation
  useEffect(() => {
    tokenManager.loadTokensFromStorage()
    
    const savedAdminToken = localStorage.getItem("sms-admin-token")
    
    if (savedAdminToken) {
      smsTemplates.fetchTemplates(tokenManager.callAdminApi, savedAdminToken, true).finally(() => {
        setIsInitialLoad(false)
      })
    } else {
      smsTemplates.setIsLoadingTemplates(false)
      setIsInitialLoad(false)
    }
    
    // Load carriers
    phoneNumbers.loadCarriers()
    
    // Load SMS history from database
    smsStatus.loadSmsHistory()
    
    // Restore user state
    const restored = userState.restoreUserState()
    if (restored) {
      if (restored.phoneNumber) phoneNumbers.setPhoneNumber(restored.phoneNumber)
      if (restored.selectedCarrier) phoneNumbers.setSelectedCarrier(restored.selectedCarrier)
      if (restored.templateParams) smsTemplates.setTemplateParams(restored.templateParams)
      if (restored.selectedTemplate) {
        smsTemplates.setSelectedTemplate(restored.selectedTemplate)
      }
    }
    
    // 不再需要手动设置监听器，后台服务会自动处理
  }, [])

  // 保存用户状态当状态变化时
  useEffect(() => {
    const currentState = {
      phoneNumber: phoneNumbers.phoneNumber,
      selectedCarrier: phoneNumbers.selectedCarrier,
      selectedTemplate: smsTemplates.selectedTemplate,
      templateParams: smsTemplates.templateParams
    }
    userState.saveUserState(currentState)
  }, [
    phoneNumbers.phoneNumber, 
    phoneNumbers.selectedCarrier, 
    smsTemplates.selectedTemplate, 
    smsTemplates.templateParams
  ])

  // Save tokens with modal close and error reset
  const handleSaveTokens = () => {
    tokenManager.saveTokens()
    setShowConfigModal(false)
    
    // Fetch templates after saving tokens
    smsTemplates.fetchTemplates(tokenManager.callAdminApi)
  }

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    smsTemplates.handleTemplateSelect(tokenManager.callAdminApi, templateId)
  }

  // Handle SMS sending
  const handleSendSms = () => {
    smsStatus.sendSms(
      smsTemplates.selectedTemplate,
      phoneNumbers.phoneNumber,
      smsTemplates.templateParams,
      tokenManager.callAdminApi
    )
  }

  // Handle SMS resending
  const handleResendSms = (outId: string) => {
    smsStatus.resendSms(outId, tokenManager.adminToken)
  }

  // Handle phone number input focus
  const handlePhoneInputFocus = () => {
    // 如果有建议且输入长度>=3且不等于11，重新显示建议
    if (phoneNumbers.phoneNumber.length >= 3 && 
        phoneNumbers.phoneNumber.length !== 11 && 
        phoneNumbers.inputSuggestions.length > 0) {
      phoneNumbers.setShowInputSuggestions(true)
    }
  }

  // Handle phone number input blur
  const handlePhoneInputBlur = () => {
    // 延迟关闭建议列表，以便点击建议项
    setTimeout(() => phoneNumbers.setShowInputSuggestions(false), 200)
  }

  // Calculate monitoring status
  const monitoringStatus = getMonitoringStatus(smsStatus.smsStatuses)

  // Show loading skeleton if page is still loading
  if (isPageLoading) {
    return <LoadingPageSkeleton />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-100 to-gray-50 relative overflow-hidden">
      {/* 动态背景装饰 */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZGVmcz4KICAgIDxwYXR0ZXJuIGlkPSJhIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiPgogICAgICA8Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMSkiLz4KICAgIDwvcGF0dGVybj4KICA8L2RlZnM+CiAgPHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNhKSIvPgo8L3N2Zz4=')] opacity-30 pointer-events-none" />
      
      <ModuleHeader
        title="短信管理"
        description="企业短信发送和监控系统"
        icon={MessageSquare}
        showAuthStatus={true}
      />
      
      <div className="pt-24 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
        {/* 401 Error Alert */}
        {tokenManager.show401Error && (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between">
              <div>
                <strong>认证失败：</strong> 管理后台令牌已过期或无效，请重新配置令牌以继续使用系统功能。
              </div>
              <div className="flex gap-2 ml-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowConfigModal(true)}
                >
                  配置Token
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => tokenManager.setShow401Error(false)}
                >
                  ×
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/analytics">
              <Button variant="outline" size="sm">
                <BarChart className="w-4 h-4 mr-2" />
                数据分析
              </Button>
            </Link>
            <Link href="/auto-test">
              <Button variant="outline" size="sm">
                <Timer className="w-4 h-4 mr-2" />
                自动测试
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => setShowConfigModal(true)}
            >
              <Settings className="w-4 h-4 mr-2" />
              配置Token
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - SMS Configuration */}
          <div className="space-y-6">
            {/* Template Selection */}
            <TemplateSelection
              templates={smsTemplates.templates}
              selectedTemplate={smsTemplates.selectedTemplate}
              onTemplateSelect={handleTemplateSelect}
              onRefreshTemplates={() => smsTemplates.fetchTemplates(tokenManager.callAdminApi)}
            />

            {/* Phone Number Input */}
            <PhoneNumberInput
              phoneNumber={phoneNumbers.phoneNumber}
              onPhoneNumberChange={phoneNumbers.handlePhoneNumberChange}
              inputSuggestions={phoneNumbers.inputSuggestions}
              showInputSuggestions={phoneNumbers.showInputSuggestions}
              activeInputSuggestionIndex={phoneNumbers.activeInputSuggestionIndex}
              isLoadingInputSuggestions={phoneNumbers.isLoadingInputSuggestions}
              onInputKeyDown={phoneNumbers.handleInputKeyDown}
              onSelectInputSuggestion={phoneNumbers.selectInputSuggestion}
              onInputFocus={handlePhoneInputFocus}
              onInputBlur={handlePhoneInputBlur}
              availableCarriers={phoneNumbers.availableCarriers}
              selectedCarrier={phoneNumbers.selectedCarrier}
              onCarrierSelect={phoneNumbers.handleCarrierSelect}
              phoneNumbers={phoneNumbers.phoneNumbers}
              phoneNumbersLoading={phoneNumbers.phoneNumbersLoading}
              phonePagination={phoneNumbers.phonePagination}
              phoneSearchTerm={phoneNumbers.phoneSearchTerm}
              onPhoneSearch={phoneNumbers.handlePhoneSearch}
              onPageChange={phoneNumbers.handlePageChange}
              onPhoneNumbersChange={() => {
                // 重新加载运营商列表
                phoneNumbers.loadCarriers()
                // 如果有选择的运营商，重新搜索
                if (phoneNumbers.selectedCarrier) {
                  phoneNumbers.searchPhoneNumbers(phoneNumbers.phoneSearchTerm, phoneNumbers.selectedCarrier, 1)
                }
              }}
            />

            {/* Template Parameters */}
            <TemplateParameters
              selectedTemplate={smsTemplates.selectedTemplate}
              templateParams={smsTemplates.templateParams}
              onTemplateParamsChange={smsTemplates.setTemplateParams}
            />

            {/* Send Buttons */}
            <SendButtons
              selectedTemplate={smsTemplates.selectedTemplate}
              phoneNumber={phoneNumbers.phoneNumber}
              isSending={smsStatus.isSending}
              onSendSms={handleSendSms}
              onShowBulkSendModal={() => setShowBulkSendModal(true)}
            />
          </div>

          {/* Right Panel - Status Monitoring */}
          <div className="space-y-6">
            <StatusMonitoring
              smsStatuses={smsStatus.smsStatuses}
              isRefreshing={smsStatus.isRefreshing}
              resendingOutIds={smsStatus.resendingOutIds}
              isLoadingSmsHistory={smsStatus.isLoadingSmsHistory}
              onRefreshStatuses={smsStatus.refreshPendingStatuses}
              onResendSms={handleResendSms}
              canResend={smsStatus.canResend}
              monitoringStatus={monitoringStatus}
            />

            {/* Instructions */}
            <Alert>
              <AlertDescription>
                <strong>使用说明:</strong>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>• 系统后台自动监控SMS状态，无需手动刷新</li>
                  <li>• <strong>强制刷新</strong>：主动查询阿里云最新状态，解决延迟反馈问题</li>
                  <li>• <strong>一键发送</strong>：选择模板后可批量发送给所有号码，支持搜索和分组选择</li>
                  <li>• <strong>重发功能</strong>：失败的短信可点击"重发"按钮重新发送，会生成新的OutId</li>
                  <li>• 可点击"查看详情"查看完整的发送记录和统计</li>
                  <li>• 点击"管理号码"可添加和管理常用手机号</li>
                  <li>• 令牌信息已本地保存，刷新页面不会丢失</li>
                  <li>• 支持多个短信同时监控状态，切换页面不会中断监控</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>
          </div>
        </div>
      </div>
      
      {/* Configuration Modal */}
      <ConfigurationModal
        open={showConfigModal}
        onOpenChange={setShowConfigModal}
        adminToken={tokenManager.adminToken}
        refreshToken={tokenManager.refreshToken}
        showAdminToken={tokenManager.showAdminToken}
        showRefreshToken={tokenManager.showRefreshToken}
        onAdminTokenChange={tokenManager.setAdminToken}
        onRefreshTokenChange={tokenManager.setRefreshToken}
        onToggleAdminTokenVisibility={() => tokenManager.setShowAdminToken(!tokenManager.showAdminToken)}
        onToggleRefreshTokenVisibility={() => tokenManager.setShowRefreshToken(!tokenManager.showRefreshToken)}
        onSaveTokens={handleSaveTokens}
      />
      
      {/* Bulk Send Modal */}
      <BulkSendModal
        open={showBulkSendModal}
        onOpenChange={setShowBulkSendModal}
        selectedTemplate={smsTemplates.selectedTemplate}
        templateParams={smsTemplates.templateParams}
        onSendComplete={async (results) => {
          // 批量发送完成后，刷新SMS状态列表
          smsStatus.loadSmsHistory()
          // 添加发送成功的记录到后台监控服务
          for (const result of results) {
            if (result.status === 'success') {
              try {
                await fetch('/api/background-monitor', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    action: 'add_sms',
                    outId: result.outId,
                    phoneNumber: result.phone
                  })
                })
              } catch (error) {
                console.error('Failed to add bulk SMS to background monitoring:', error)
              }
            }
          }
        }}
      />
    </div>
  )
}
