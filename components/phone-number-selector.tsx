"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, Users, ChevronDown, ChevronRight } from "lucide-react"

interface PhoneNumber {
  id: number
  number: string
  carrier: string
  note?: string
}

interface PhoneNumberSelectorProps {
  selectedNumbers: string[]
  onSelectionChange: (numbers: string[]) => void
  maxHeight?: string
  disabled?: boolean
  showSearch?: boolean
  showGrouping?: boolean
  itemsPerPage?: number
}

export default function PhoneNumberSelector({
  selectedNumbers = [],
  onSelectionChange,
  maxHeight = "400px",
  disabled = false,
  showSearch = true,
  showGrouping = true,
  itemsPerPage = 20
}: PhoneNumberSelectorProps) {
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  
  // 折叠状态管理
  const [collapsedCarriers, setCollapsedCarriers] = useState<Set<string>>(new Set())
  
  // 分页状态管理 - 每个运营商的当前页码
  const [carrierPages, setCarrierPages] = useState<Record<string, number>>({})

  // 加载手机号码数据
  useEffect(() => {
    loadPhoneNumbers()
  }, [])

  // 更新选中状态
  useEffect(() => {
    const newSelectedIds = new Set<number>()
    phoneNumbers.forEach(phone => {
      if (selectedNumbers.includes(phone.number)) {
        newSelectedIds.add(phone.id)
      }
    })
    setSelectedIds(newSelectedIds)
  }, [selectedNumbers, phoneNumbers])

  const loadPhoneNumbers = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/phone-numbers/search?limit=1000')
      if (response.ok) {
        const data = await response.json()
        setPhoneNumbers(data.data || [])
      }
    } catch (error) {
      console.error('Failed to load phone numbers:', error)
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

    if (!showGrouping) {
      return { '所有号码': filtered }
    }

    const grouped: Record<string, PhoneNumber[]> = {}
    filtered.forEach(phone => {
      if (!grouped[phone.carrier]) {
        grouped[phone.carrier] = []
      }
      grouped[phone.carrier].push(phone)
    })

    return grouped
  }, [phoneNumbers, searchTerm, showGrouping])

  // 获取选中的手机号码
  const selectedPhoneNumbers = useMemo(() => {
    return phoneNumbers.filter(phone => selectedIds.has(phone.id))
  }, [phoneNumbers, selectedIds])

  // 更新父组件 - 避免不必要的回调调用
  useEffect(() => {
    const numbers = selectedPhoneNumbers.map(phone => phone.number)
    
    // 比较数组内容，避免不必要的更新
    const currentNumbers = [...selectedNumbers].sort()
    const newNumbers = [...numbers].sort()
    
    if (currentNumbers.length !== newNumbers.length || 
        !currentNumbers.every((num, idx) => num === newNumbers[idx])) {
      onSelectionChange(numbers)
    }
  }, [selectedPhoneNumbers, selectedNumbers]) // 添加selectedNumbers依赖进行比较

  // 全选/取消全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const filteredIds = Object.values(groupedPhoneNumbers)
        .flat()
        .map(phone => phone.id)
      setSelectedIds(new Set(filteredIds))
    } else {
      setSelectedIds(new Set())
    }
  }

  // 切换单个手机号选择状态
  const togglePhoneSelection = (phoneId: number) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(phoneId)) {
      newSelected.delete(phoneId)
    } else {
      newSelected.add(phoneId)
    }
    setSelectedIds(newSelected)
  }

  // 切换运营商分组选择
  const toggleCarrierSelection = (carrier: string, checked: boolean) => {
    const newSelected = new Set(selectedIds)
    const carrierPhones = groupedPhoneNumbers[carrier] || []
    
    carrierPhones.forEach(phone => {
      if (checked) {
        newSelected.add(phone.id)
      } else {
        newSelected.delete(phone.id)
      }
    })
    
    setSelectedIds(newSelected)
  }

  // 检查运营商是否全选
  const isCarrierSelected = (carrier: string) => {
    const carrierPhones = groupedPhoneNumbers[carrier] || []
    return carrierPhones.length > 0 && carrierPhones.every(phone => selectedIds.has(phone.id))
  }

  // 检查运营商是否部分选中
  const isCarrierPartiallySelected = (carrier: string) => {
    const carrierPhones = groupedPhoneNumbers[carrier] || []
    return carrierPhones.some(phone => selectedIds.has(phone.id)) && 
           !carrierPhones.every(phone => selectedIds.has(phone.id))
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
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    
    return {
      phones: allPhones.slice(startIndex, endIndex),
      totalCount: allPhones.length,
      totalPages: Math.ceil(allPhones.length / itemsPerPage),
      currentPage,
      hasNext: currentPage < Math.ceil(allPhones.length / itemsPerPage),
      hasPrev: currentPage > 1
    }
  }

  const filteredPhoneCount = Object.values(groupedPhoneNumbers).flat().length
  const isAllSelected = filteredPhoneCount > 0 && Object.values(groupedPhoneNumbers)
    .flat()
    .every(phone => selectedIds.has(phone.id))

  return (
    <div className="space-y-4">
      {/* 搜索和统计 */}
      {showSearch && (
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜索手机号、运营商或备注..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              disabled={disabled}
            />
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>筛选结果: {filteredPhoneCount} 个</span>
            <span>已选择: {selectedIds.size} 个</span>
          </div>
        </div>
      )}

      {/* 全选控制 */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={isAllSelected}
            onCheckedChange={handleSelectAll}
            disabled={isLoading || disabled}
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

      {/* 手机号码列表 */}
      <div 
        className="overflow-y-auto border rounded-lg"
        style={{ maxHeight }}
      >
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
                  {showGrouping && carrier !== '所有号码' && (
                    <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={isCarrierSelected(carrier)}
                          ref={(checkbox) => {
                            if (checkbox && isCarrierPartiallySelected(carrier)) {
                              const inputElement = checkbox.querySelector('input[type="checkbox"]') as HTMLInputElement
                              if (inputElement) {
                                inputElement.indeterminate = true
                              }
                            }
                          }}
                          onCheckedChange={(checked) => toggleCarrierSelection(carrier, !!checked)}
                          disabled={disabled}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleCarrierCollapse(carrier)}
                          className="h-auto p-1 hover:bg-gray-200"
                          disabled={disabled}
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
                        disabled={disabled}
                        className="text-xs"
                      >
                        {isCarrierSelected(carrier) ? '取消全选' : '全选'}
                      </Button>
                    </div>
                  )}
                  
                  {/* 号码列表（可折叠） */}
                  {(!showGrouping || carrier === '所有号码' || !isCollapsed) && (
                    <div className="p-4">
                      {pageData.phones.length === 0 ? (
                        <div className="text-center text-gray-500 py-4">
                          {showGrouping ? '该运营商暂无匹配的号码' : '暂无匹配的号码'}
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {pageData.phones.map((phone) => (
                              <div
                                key={phone.id}
                                className={`flex items-center gap-3 p-3 rounded border cursor-pointer hover:bg-gray-50 ${
                                  selectedIds.has(phone.id) ? 'bg-blue-50 border-blue-200' : ''
                                }`}
                                onClick={() => !disabled && togglePhoneSelection(phone.id)}
                              >
                                <Checkbox
                                  checked={selectedIds.has(phone.id)}
                                  onCheckedChange={() => togglePhoneSelection(phone.id)}
                                  disabled={disabled}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm">{phone.number}</div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="text-xs">
                                      {phone.carrier}
                                    </Badge>
                                    {phone.note && (
                                      <div className="text-xs text-gray-500 truncate">
                                        备注: {phone.note}
                                      </div>
                                    )}
                                  </div>
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
                                  disabled={!pageData.hasPrev || disabled}
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
                                  disabled={!pageData.hasNext || disabled}
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
  )
}