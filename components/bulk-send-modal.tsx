"use client"

import { useState, useEffect, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, Send, Users, CheckCircle, XCircle, Clock, ChevronDown, ChevronRight } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface PhoneNumber {
  id: number
  number: string
  carrier: string
  note?: string
}

interface SmsTemplate {
  id: string
  name: string
  content: string
  params: string[]
  code: string
}

interface BulkSendProgress {
  total: number
  sent: number
  success: number
  failed: number
  current?: string
  isComplete: boolean
}

interface BulkSendModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedTemplate: SmsTemplate | null
  templateParams: Record<string, string>
  onSendComplete?: (results: any[]) => void
}

export default function BulkSendModal({
  open,
  onOpenChange,
  selectedTemplate,
  templateParams,
  onSendComplete
}: BulkSendModalProps) {
  const { toast } = useToast()
  
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([])
  const [selectedNumbers, setSelectedNumbers] = useState<Set<number>>(new Set())
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  
  // 折叠状态管理
  const [collapsedCarriers, setCollapsedCarriers] = useState<Set<string>>(new Set())
  
  // 分页状态管理 - 每个运营商的当前页码
  const [carrierPages, setCarrierPages] = useState<Record<string, number>>({})
  const ITEMS_PER_PAGE = 20
  
  const [sendProgress, setSendProgress] = useState<BulkSendProgress>({
    total: 0,
    sent: 0,
    success: 0,
    failed: 0,
    isComplete: false
  })

  // 加载手机号码数据
  useEffect(() => {
    if (open) {
      loadPhoneNumbers()
    }
  }, [open])

  const loadPhoneNumbers = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/phone-numbers?limit=10000')
      if (response.ok) {
        const data = await response.json()
        setPhoneNumbers(data.data || [])
        // 默认全选
        setSelectedNumbers(new Set(data.data?.map((phone: PhoneNumber) => phone.id) || []))
      }
    } catch (error) {
      console.error('Failed to load phone numbers:', error)
      toast({
        title: "加载失败",
        description: "无法加载手机号码列表",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 按运营商分组手机号码
  const groupedPhoneNumbers = useMemo(() => {
    const filtered = phoneNumbers.filter(phone =>
      phone.number.includes(searchTerm) ||
      phone.carrier.includes(searchTerm) ||
      (phone.note && phone.note.includes(searchTerm))
    )

    const grouped: Record<string, PhoneNumber[]> = {}
    filtered.forEach(phone => {
      if (!grouped[phone.carrier]) {
        grouped[phone.carrier] = []
      }
      grouped[phone.carrier].push(phone)
    })

    return grouped
  }, [phoneNumbers, searchTerm])

  // 获取选中的手机号码
  const selectedPhoneNumbers = useMemo(() => {
    return phoneNumbers.filter(phone => selectedNumbers.has(phone.id))
  }, [phoneNumbers, selectedNumbers])

  // 全选/取消全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const filteredIds = Object.values(groupedPhoneNumbers)
        .flat()
        .map(phone => phone.id)
      setSelectedNumbers(new Set(filteredIds))
    } else {
      setSelectedNumbers(new Set())
    }
  }

  // 切换单个手机号选择状态
  const togglePhoneSelection = (phoneId: number) => {
    const newSelected = new Set(selectedNumbers)
    if (newSelected.has(phoneId)) {
      newSelected.delete(phoneId)
    } else {
      newSelected.add(phoneId)
    }
    setSelectedNumbers(newSelected)
  }

  // 切换运营商分组选择
  const toggleCarrierSelection = (carrier: string, checked: boolean) => {
    const newSelected = new Set(selectedNumbers)
    const carrierPhones = groupedPhoneNumbers[carrier] || []
    
    carrierPhones.forEach(phone => {
      if (checked) {
        newSelected.add(phone.id)
      } else {
        newSelected.delete(phone.id)
      }
    })
    
    setSelectedNumbers(newSelected)
  }

  // 检查运营商是否全选
  const isCarrierSelected = (carrier: string) => {
    const carrierPhones = groupedPhoneNumbers[carrier] || []
    return carrierPhones.length > 0 && carrierPhones.every(phone => selectedNumbers.has(phone.id))
  }

  // 检查运营商是否部分选中
  const isCarrierPartiallySelected = (carrier: string) => {
    const carrierPhones = groupedPhoneNumbers[carrier] || []
    return carrierPhones.some(phone => selectedNumbers.has(phone.id)) && 
           !carrierPhones.every(phone => selectedNumbers.has(phone.id))
  }

  // 切换运营商折叠状态
  const toggleCarrierCollapse = (carrier: string) => {
    const newCollapsed = new Set(collapsedCarriers)
    if (newCollapsed.has(carrier)) {
      newCollapsed.delete(carrier)
    } else {
      newCollapsed.add(carrier)
    }
    setCollapsedCarriers(newCollapsed)
  }

  // 获取运营商当前页码
  const getCarrierPage = (carrier: string) => {
    return carrierPages[carrier] || 1
  }

  // 设置运营商页码
  const setCarrierPage = (carrier: string, page: number) => {
    setCarrierPages(prev => ({
      ...prev,
      [carrier]: page
    }))
  }

  // 获取运营商分页数据
  const getCarrierPageData = (carrier: string) => {
    const allPhones = groupedPhoneNumbers[carrier] || []
    const currentPage = getCarrierPage(carrier)
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    
    return {
      phones: allPhones.slice(startIndex, endIndex),
      totalCount: allPhones.length,
      totalPages: Math.ceil(allPhones.length / ITEMS_PER_PAGE),
      currentPage,
      hasNext: currentPage < Math.ceil(allPhones.length / ITEMS_PER_PAGE),
      hasPrev: currentPage > 1
    }
  }

  // 批量发送SMS
  const handleBulkSend = async () => {
    if (selectedPhoneNumbers.length === 0) {
      toast({
        title: "提示",
        description: "请至少选择一个手机号码",
        variant: "destructive",
      })
      return
    }

    if (!selectedTemplate) {
      toast({
        title: "错误",
        description: "未选择短信模板",
        variant: "destructive",
      })
      return
    }

    setIsSending(true)
    setSendProgress({
      total: selectedPhoneNumbers.length,
      sent: 0,
      success: 0,
      failed: 0,
      isComplete: false
    })

    const results = []
    
    try {
      // 批量发送SMS
      for (let i = 0; i < selectedPhoneNumbers.length; i++) {
        const phone = selectedPhoneNumbers[i]
        
        setSendProgress(prev => ({
          ...prev,
          current: phone.number,
          sent: i
        }))

        try {
          // 调用发送SMS API
          const response = await fetch("/admin-api/system/sms-template/send-sms", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${localStorage.getItem("sms-admin-token")}`
            },
            body: JSON.stringify({
              content: selectedTemplate.content,
              params: selectedTemplate.params,
              mobile: phone.number,
              templateCode: selectedTemplate.code,
              templateParams: templateParams,
            }),
          })

          const data = await response.json()
          
          if (response.ok && data.code === 0) {
            const outId = data.data ? String(data.data) : `${Date.now()}-${i}`
            
            // 保存到数据库
            try {
              // 渲染真实内容
              const renderContent = (template: string, params: Record<string, string>) => {
                let rendered = template
                Object.keys(params).forEach(key => {
                  const placeholder = `\${${key}}`
                  rendered = rendered.replaceAll(placeholder, params[key] || key)
                })
                return rendered
              }

              const actualContent = selectedTemplate.content ? 
                renderContent(selectedTemplate.content, templateParams) : 
                selectedTemplate.content

              await fetch('/api/sms-records', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  out_id: outId,
                  phone_number: phone.number,
                  carrier: phone.carrier,
                  phone_note: phone.note,
                  template_code: selectedTemplate.code,
                  template_name: selectedTemplate.name,
                  template_params: templateParams,
                  content: actualContent,
                  send_date: new Date().toLocaleString("zh-CN"),
                  status: "发送中"
                })
              })
            } catch (dbError) {
              console.error('Failed to save SMS record:', dbError)
            }

            results.push({
              phone: phone.number,
              outId,
              status: 'success',
              carrier: phone.carrier,
              note: phone.note
            })

            setSendProgress(prev => ({
              ...prev,
              success: prev.success + 1
            }))
          } else {
            throw new Error(data.msg || "发送失败")
          }
        } catch (error) {
          console.error(`发送失败 (${phone.number}):`, error)
          results.push({
            phone: phone.number,
            status: 'failed',
            error: error instanceof Error ? error.message : '发送失败',
            carrier: phone.carrier,
            note: phone.note
          })

          setSendProgress(prev => ({
            ...prev,
            failed: prev.failed + 1
          }))
        }

        // 添加延迟避免请求过快
        if (i < selectedPhoneNumbers.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200))
        }
      }

      setSendProgress(prev => ({
        ...prev,
        sent: selectedPhoneNumbers.length,
        isComplete: true,
        current: undefined
      }))

      const successCount = results.filter(r => r.status === 'success').length
      const failedCount = results.filter(r => r.status === 'failed').length

      toast({
        title: "批量发送完成",
        description: `成功发送 ${successCount} 条，失败 ${failedCount} 条`,
      })

      // 回调通知父组件
      onSendComplete?.(results)

    } catch (error) {
      console.error('批量发送失败:', error)
      toast({
        title: "批量发送失败",
        description: "发送过程中出现错误",
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
    }
  }

  // 重置状态
  const handleClose = () => {
    if (!isSending) {
      setSearchTerm("")
      setSendProgress({
        total: 0,
        sent: 0,
        success: 0,
        failed: 0,
        isComplete: false
      })
      onOpenChange(false)
    }
  }

  const filteredPhoneCount = Object.values(groupedPhoneNumbers).flat().length
  const isAllSelected = filteredPhoneCount > 0 && Object.values(groupedPhoneNumbers)
    .flat()
    .every(phone => selectedNumbers.has(phone.id))

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            一键批量发送短信
            {selectedTemplate && (
              <Badge variant="outline" className="ml-2">
                {selectedTemplate.name}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* 搜索和统计 */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索手机号、运营商或备注..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:border-blue-500"
              />
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>筛选结果: {filteredPhoneCount} 个</span>
              <span>已选择: {selectedNumbers.size} 个</span>
            </div>
          </div>

          {/* 全选控制 */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={handleSelectAll}
                disabled={isLoading || isSending}
              />
              <span className="font-medium">全选/取消全选</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="text-sm text-gray-600">
                共 {phoneNumbers.length} 个号码
              </span>
            </div>
          </div>

          {/* 发送进度 */}
          {isSending && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>发送进度: {sendProgress.sent}/{sendProgress.total}</span>
                    <span>成功: {sendProgress.success} | 失败: {sendProgress.failed}</span>
                  </div>
                  <Progress 
                    value={sendProgress.total > 0 ? (sendProgress.sent / sendProgress.total) * 100 : 0} 
                    className="w-full"
                  />
                  {sendProgress.current && (
                    <div className="text-xs text-gray-600">
                      正在发送: {sendProgress.current}
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* 手机号码列表 */}
          <div className="flex-1 overflow-y-auto border rounded-lg">
            {isLoading ? (
              <div className="p-6 text-center text-gray-500">
                加载中...
              </div>
            ) : Object.keys(groupedPhoneNumbers).length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                {searchTerm ? '没有找到匹配的手机号码' : '暂无手机号码'}
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {Object.entries(groupedPhoneNumbers).map(([carrier, phones]) => {
                  const isCollapsed = collapsedCarriers.has(carrier)
                  const pageData = getCarrierPageData(carrier)
                  
                  return (
                    <div key={carrier} className="border rounded-lg">
                      {/* 运营商标题行 */}
                      <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={isCarrierSelected(carrier)}
                            ref={checkbox => {
                              if (checkbox && isCarrierPartiallySelected(carrier)) {
                                checkbox.indeterminate = true
                              }
                            }}
                            onCheckedChange={(checked) => toggleCarrierSelection(carrier, !!checked)}
                            disabled={isSending}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleCarrierCollapse(carrier)}
                            className="h-auto p-1 hover:bg-gray-200"
                          >
                            {isCollapsed ? (
                              <ChevronRight className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </Button>
                          <Badge variant="secondary" className="font-medium">
                            {carrier}
                          </Badge>
                          <span className="text-sm text-gray-600">
                            (共{phones.length}个号码)
                          </span>
                          {pageData.totalPages > 1 && !isCollapsed && (
                            <span className="text-xs text-blue-600">
                              显示第{pageData.currentPage}页，共{pageData.totalPages}页
                            </span>
                          )}
                        </div>
                        
                        {/* 运营商全选按钮 */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleCarrierSelection(carrier, !isCarrierSelected(carrier))}
                          disabled={isSending}
                          className="text-xs"
                        >
                          {isCarrierSelected(carrier) ? '取消全选' : '全选'}
                        </Button>
                      </div>
                      
                      {/* 号码列表（可折叠） */}
                      {!isCollapsed && (
                        <div className="p-4">
                          {pageData.phones.length === 0 ? (
                            <div className="text-center text-gray-500 py-4">
                              该运营商暂无匹配的号码
                            </div>
                          ) : (
                            <>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {pageData.phones.map((phone) => (
                                  <div
                                    key={phone.id}
                                    className={`flex items-center gap-3 p-3 rounded border cursor-pointer hover:bg-gray-50 ${
                                      selectedNumbers.has(phone.id) ? 'bg-blue-50 border-blue-200' : ''
                                    }`}
                                    onClick={() => !isSending && togglePhoneSelection(phone.id)}
                                  >
                                    <Checkbox
                                      checked={selectedNumbers.has(phone.id)}
                                      onCheckedChange={() => togglePhoneSelection(phone.id)}
                                      disabled={isSending}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium text-sm">{phone.number}</div>
                                      {phone.note && (
                                        <div className="text-xs text-gray-500 truncate">
                                          备注: {phone.note}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              
                              {/* 分页控制 */}
                              {pageData.totalPages > 1 && (
                                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                                  <div className="text-sm text-gray-600">
                                    显示 {pageData.phones.length} 个号码，共 {pageData.totalCount} 个
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setCarrierPage(carrier, pageData.currentPage - 1)}
                                      disabled={!pageData.hasPrev || isSending}
                                    >
                                      上一页
                                    </Button>
                                    <span className="text-sm px-2">
                                      {pageData.currentPage} / {pageData.totalPages}
                                    </span>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setCarrierPage(carrier, pageData.currentPage + 1)}
                                      disabled={!pageData.hasNext || isSending}
                                    >
                                      下一页
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-gray-600">
            {selectedTemplate && (
              <>
                模板: {selectedTemplate.name} | 
                已选择 {selectedNumbers.size} 个手机号
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSending}
            >
              {isSending ? '发送中...' : '取消'}
            </Button>
            <Button
              onClick={handleBulkSend}
              disabled={selectedNumbers.size === 0 || isSending || !selectedTemplate}
            >
              {isSending ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  发送中... ({sendProgress.sent}/{sendProgress.total})
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  发送给 {selectedNumbers.size} 个号码
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}