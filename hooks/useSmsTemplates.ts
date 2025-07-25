import { useState, useCallback } from "react"
import * as Sentry from "@sentry/nextjs"
import { useToast } from "@/hooks/use-toast"

export interface SmsTemplate {
  id: string
  name: string
  content: string
  params: string[]
  code: string
}

export interface SmsTemplateState {
  templates: SmsTemplate[]
  selectedTemplate: SmsTemplate | null
  templateParams: Record<string, string>
  isLoadingTemplates: boolean
}

export interface SmsTemplateActions {
  setTemplates: (templates: SmsTemplate[]) => void
  setSelectedTemplate: (template: SmsTemplate | null) => void
  setTemplateParams: (params: Record<string, string>) => void
  setIsLoadingTemplates: (loading: boolean) => void
  fetchTemplates: (callAdminApi: Function, tokenOverride?: string, isInitial?: boolean) => Promise<void>
  getTemplateDetails: (callAdminApi: Function, templateId: string) => Promise<any>
  handleTemplateSelect: (callAdminApi: Function, templateId: string) => Promise<void>
}

export const useSmsTemplates = (): SmsTemplateState & SmsTemplateActions => {
  const { toast } = useToast()
  
  // SMS template management
  const [templates, setTemplates] = useState<SmsTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<SmsTemplate | null>(null)
  const [templateParams, setTemplateParams] = useState<Record<string, string>>({})
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true)

  // Fetch SMS templates with improved error handling
  const fetchTemplates = useCallback(async (callAdminApi: Function, tokenOverride?: string, isInitial = false) => {
    try {
      setIsLoadingTemplates(true)
      
      if (!tokenOverride && !localStorage.getItem("sms-admin-token")) {
        setIsLoadingTemplates(false)
        return
      }
      
      const response = await callAdminApi("/admin-api/system/sms-template/page?pageNo=1&pageSize=10&channelId=8", {}, tokenOverride)

      if (response.ok) {
        const data = await response.json()
        
        // Check if the response indicates authentication failure
        if (data.code === 401) {
          if (!isInitial) {
            if (!localStorage.getItem("sms-admin-token")) {
              toast({
                title: "需要配置",
                description: "请配置管理后台令牌以使用系统",
                variant: "destructive",
              })
            }
          }
          return
        }
        
        // Check if response is successful
        if (data.code !== 0) {
          throw new Error(data.msg || "获取模板失败")
        }
        
        // Ensure templates is always an array
        const templatesData = Array.isArray(data.data) ? data.data : 
                              (data.data?.list ? data.data.list : [])
        
        setTemplates(templatesData)
        
        // 只在非初始加载或模板数量大于0时显示成功提示
        if (!isInitial || templatesData.length > 0) {
          toast({
            title: "成功",
            description: `已加载 ${templatesData.length} 个短信模板`,
          })
        }
      } else if (response.status === 401) {
        // 初始加载时不显示401错误，只有用户主动操作时才显示
        if (!isInitial) {
          if (!localStorage.getItem("sms-admin-token")) {
            toast({
              title: "需要配置",
              description: "请配置管理后台令牌以使用系统",
              variant: "destructive",
            })
          }
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.msg || "获取模板失败")
      }
    } catch (error) {
      console.error("获取短信模板失败:", error)
      Sentry.captureException(error, {
        tags: { operation: 'fetch_templates' },
        extra: { isInitial, hasToken: !!(tokenOverride || localStorage.getItem("sms-admin-token")) }
      })
      setTemplates([])
      if (!isInitial) {
        toast({
          title: "错误",
          description: error instanceof Error ? error.message : "获取短信模板失败，请检查网络连接",
          variant: "destructive",
        })
      }
    } finally {
      setIsLoadingTemplates(false)
    }
  }, [toast])

  // Get template details
  const getTemplateDetails = useCallback(async (callAdminApi: Function, templateId: string) => {
    try {
      const response = await callAdminApi(`/admin-api/system/sms-template/get?id=${templateId}`)

      if (response.ok) {
        const data = await response.json()
        
        // Check for authentication error in response body
        if (data.code === 401) {
          return null
        }
        
        if (data.code === 0 && data.data) {
          return data.data
        }
      }
    } catch (error) {
      console.error("获取模板详情失败:", error)
      Sentry.captureException(error, {
        tags: { operation: 'get_template_details' },
        extra: { templateId }
      })
    }
    return null
  }, [])

  // Handle template selection
  const handleTemplateSelect = useCallback(async (callAdminApi: Function, templateId: string) => {
    const template = templates.find((t) => t.id === templateId)
    if (!template) return

    const details = await getTemplateDetails(callAdminApi, templateId)
    if (details) {
      setSelectedTemplate({
        ...template,
        params: details.params || [],
      })

      // Initialize template parameters with specific default values
      const defaultParams: Record<string, string> = {}
      const defaultValues = ['供应商', '采购商', '草甘膦']
      
      details.params?.forEach((param: string, index: number) => {
        // Use specific default values for the first 3 parameters, then generic for the rest
        defaultParams[param] = index < defaultValues.length 
          ? defaultValues[index] 
          : `测试值${index + 1}`
      })
      setTemplateParams(defaultParams)
    }
  }, [templates, getTemplateDetails])

  return {
    // State
    templates,
    selectedTemplate,
    templateParams,
    isLoadingTemplates,
    
    // Actions
    setTemplates,
    setSelectedTemplate,
    setTemplateParams,
    setIsLoadingTemplates,
    fetchTemplates,
    getTemplateDetails,
    handleTemplateSelect,
  }
}