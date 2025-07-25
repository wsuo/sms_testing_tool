import React from "react"
import { Phone } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import PhoneNumberManagerModal from "@/components/phone-number-manager-modal"

interface PhoneNumberInputProps {
  // Basic phone number state
  phoneNumber: string
  onPhoneNumberChange: (value: string) => void
  
  // Input suggestions
  inputSuggestions: any[]
  showInputSuggestions: boolean
  activeInputSuggestionIndex: number
  isLoadingInputSuggestions: boolean
  onInputKeyDown: (e: React.KeyboardEvent) => void
  onSelectInputSuggestion: (suggestion: any) => void
  onInputFocus: () => void
  onInputBlur: () => void
  
  // Carrier selection
  availableCarriers: string[]
  selectedCarrier: string
  onCarrierSelect: (carrier: string) => void
  
  // Phone number selection
  phoneNumbers: any[]
  phoneNumbersLoading: boolean
  phonePagination: {
    total: number
    totalPages: number
    currentPage: number
    pageSize: number
    hasNext: boolean
    hasPrev: boolean
  }
  
  // Search
  phoneSearchTerm: string
  onPhoneSearch: (searchTerm: string) => void
  onPageChange: (page: number) => void
  
  // Phone number manager
  onPhoneNumbersChange: () => void
}

export const PhoneNumberInput: React.FC<PhoneNumberInputProps> = ({
  phoneNumber,
  onPhoneNumberChange,
  inputSuggestions,
  showInputSuggestions,
  activeInputSuggestionIndex,
  isLoadingInputSuggestions,
  onInputKeyDown,
  onSelectInputSuggestion,
  onInputFocus,
  onInputBlur,
  availableCarriers,
  selectedCarrier,
  onCarrierSelect,
  phoneNumbers,
  phoneNumbersLoading,
  phonePagination,
  phoneSearchTerm,
  onPhoneSearch,
  onPageChange,
  onPhoneNumbersChange,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Phone className="w-5 h-5 mr-2" />
          手机号码
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              placeholder="请输入手机号码"
              value={phoneNumber}
              onChange={(e) => onPhoneNumberChange(e.target.value)}
              onKeyDown={onInputKeyDown}
              onBlur={onInputBlur}
              onFocus={onInputFocus}
              className="flex-1"
            />
            {/* 自动推荐下拉列表 */}
            {showInputSuggestions && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {isLoadingInputSuggestions ? (
                  <div className="px-3 py-2 text-sm text-gray-500">
                    搜索中...
                  </div>
                ) : inputSuggestions.length > 0 ? (
                  inputSuggestions.map((suggestion, index) => (
                    <div
                      key={suggestion.id}
                      className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${
                        index === activeInputSuggestionIndex ? 'bg-blue-100' : ''
                      }`}
                      onClick={() => onSelectInputSuggestion(suggestion)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{suggestion.number}</span>
                        <Badge variant="outline" className="text-xs">
                          {suggestion.carrier || '未知运营商'}
                        </Badge>
                      </div>
                      {suggestion.note && (
                        <div className="text-xs text-gray-500 mt-1 truncate">
                          备注: {suggestion.note}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-gray-500">
                    未找到匹配的号码
                  </div>
                )}
              </div>
            )}
          </div>
          <PhoneNumberManagerModal 
            onPhoneNumbersChange={onPhoneNumbersChange}
            onSelectNumber={onPhoneNumberChange}
          />
        </div>
        
        {/* 运营商和号码级联选择 */}
        {availableCarriers.length > 0 && (
          <div className="space-y-3">
            <div className="text-sm text-gray-600">或从已保存的号码中选择：</div>
            <div className="flex gap-2 items-end">
              {/* 运营商选择 */}
              <div className="min-w-0 flex-shrink-0">
                <Label className="text-xs text-gray-500 mb-1 block">选择运营商</Label>
                <div className="flex gap-1">
                  <Select value={selectedCarrier} onValueChange={onCarrierSelect}>
                    <SelectTrigger className="h-9 w-auto min-w-[120px]">
                      <SelectValue placeholder="选择运营商" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCarriers.map((carrier) => (
                        <SelectItem key={carrier} value={carrier}>
                          <Badge variant="outline" className="text-xs">
                            {carrier}
                          </Badge>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedCarrier && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onCarrierSelect("")}
                      className="h-9 px-2"
                      title="清空选择"
                    >
                      ×
                    </Button>
                  )}
                </div>
              </div>
              
              {/* 手机号码选择 */}
              <div className="flex-1 min-w-0">
                <Label className="text-xs text-gray-500 mb-1 block">选择号码</Label>
                <Select 
                  value={phoneNumber} 
                  onValueChange={onPhoneNumberChange}
                  disabled={!selectedCarrier}
                >
                  <SelectTrigger className="h-9 select-no-truncate w-full overflow-visible">
                    <div className="w-full overflow-visible">
                      {phoneNumber ? (
                        <div className="text-left w-full overflow-visible">
                          <div className="font-medium overflow-visible text-ellipsis-none whitespace-nowrap">
                            {phoneNumber}
                          </div>
                          {phoneNumbers.find(p => p.number === phoneNumber)?.note && (
                            <div className="text-xs text-gray-500 overflow-visible text-ellipsis-none whitespace-nowrap">
                              备注: {phoneNumbers.find(p => p.number === phoneNumber)?.note}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">
                          {selectedCarrier ? "选择号码" : "请先选择运营商"}
                        </span>
                      )}
                    </div>
                  </SelectTrigger>
                  <SelectContent className="w-full">
                    {phoneNumbersLoading ? (
                      <div className="px-2 py-1.5 text-xs text-gray-500">
                        加载中...
                      </div>
                    ) : phoneNumbers.map((phone) => (
                      <SelectItem key={phone.id} value={phone.number}>
                        <div className="w-full text-left">
                          <div className="font-medium text-left">{phone.number}</div>
                          {phone.note && (
                            <div className="text-xs text-gray-500 text-left">
                              备注: {phone.note}
                            </div>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                    {!phoneNumbersLoading && phoneNumbers.length === 0 && selectedCarrier && (
                      <div className="px-2 py-1.5 text-xs text-gray-500">
                        该运营商暂无保存的号码
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* 分页控制 */}
            {selectedCarrier && phonePagination.totalPages > 1 && (
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>共 {phonePagination.total} 个号码</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(phonePagination.currentPage - 1)}
                    disabled={!phonePagination.hasPrev || phoneNumbersLoading}
                  >
                    上一页
                  </Button>
                  <span className="px-2">
                    {phonePagination.currentPage} / {phonePagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(phonePagination.currentPage + 1)}
                    disabled={!phonePagination.hasNext || phoneNumbersLoading}
                  >
                    下一页
                  </Button>
                </div>
              </div>
            )}
            
            {/* 快速搜索所有号码的选项 */}
            {!selectedCarrier && (
              <div className="space-y-2">
                <Label className="text-xs text-gray-500 mb-1 block">快速搜索</Label>
                
                {/* 搜索输入框 */}
                <div className="relative">
                  <Input
                    placeholder="搜索手机号码、运营商或备注..."
                    value={phoneSearchTerm}
                    onChange={(e) => onPhoneSearch(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
                
                {/* 搜索结果下拉框 */}
                {phoneSearchTerm.trim() && (
                  <Select value={phoneNumber} onValueChange={onPhoneNumberChange}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={`搜索结果 (${phonePagination.total}条)`} />
                    </SelectTrigger>
                    <SelectContent>
                      {phoneNumbersLoading ? (
                        <div className="px-2 py-1.5 text-xs text-gray-500">
                          搜索中...
                        </div>
                      ) : phoneNumbers.map((phone) => (
                        <SelectItem key={phone.id} value={phone.number}>
                          <div className="flex flex-col items-start py-1 max-w-full text-left">
                            <div className="flex items-center gap-2 max-w-full">
                              <span className="font-medium text-left">{phone.number}</span>
                              <Badge variant="outline" className="text-xs flex-shrink-0">
                                {phone.carrier}
                              </Badge>
                            </div>
                            {phone.note && (
                              <div className="text-xs text-gray-500 mt-1 max-w-full text-left">
                                备注: {phone.note}
                              </div>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                      {!phoneNumbersLoading && phoneNumbers.length === 0 && (
                        <div className="px-2 py-1.5 text-xs text-gray-500">
                          未找到匹配的号码
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                )}
                
                {/* 分页控制 */}
                {phoneSearchTerm.trim() && phonePagination.totalPages > 1 && (
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>第 {phonePagination.currentPage} 页，共 {phonePagination.totalPages} 页</span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPageChange(phonePagination.currentPage - 1)}
                        disabled={!phonePagination.hasPrev || phoneNumbersLoading}
                        className="h-7 px-2 text-xs"
                      >
                        上一页
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPageChange(phonePagination.currentPage + 1)}
                        disabled={!phonePagination.hasNext || phoneNumbersLoading}
                        className="h-7 px-2 text-xs"
                      >
                        下一页
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}