"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Phone, Plus, Edit2, Trash2, Save, X, Upload, Search } from "lucide-react"
import PhoneNumberImporter from "./phone-number-importer"

export type Carrier = '中国移动' | '中国电信' | '中国联通' | '其他'

export interface PhoneNumber {
  id: string
  carrier: Carrier
  number: string
  province?: string
  city?: string
  note?: string
  createdAt: string
  updatedAt: string
}

interface PhoneNumberManagerProps {
  onPhoneNumbersChange?: () => void
  showCard?: boolean // 控制是否显示外层卡片和标题
}

export default function PhoneNumberManager({ onPhoneNumbersChange, showCard = true }: PhoneNumberManagerProps) {
  const { toast } = useToast()
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // 分页相关状态
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)
  const [pageSize] = useState(20) // 每页显示20条记录
  
  // 搜索和筛选状态
  const [searchTerm, setSearchTerm] = useState('')
  const [carrierFilter, setCarrierFilter] = useState<string>('all')
  
  // 新增表单状态
  const [showAddForm, setShowAddForm] = useState(false)
  const [newCarrier, setNewCarrier] = useState<Carrier>('中国移动')
  const [newNumber, setNewNumber] = useState('')
  const [newProvince, setNewProvince] = useState('')
  const [newCity, setNewCity] = useState('')
  const [newNote, setNewNote] = useState('')
  
  // 自动识别状态
  const [isLookingUp, setIsLookingUp] = useState(false)

  // 重置添加表单
  const resetAddForm = () => {
    setNewCarrier('中国移动')
    setNewNumber('')
    setNewProvince('')
    setNewCity('')
    setNewNote('')
  }
  
  // 编辑状态
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editCarrier, setEditCarrier] = useState<Carrier>('中国移动')
  const [editNumber, setEditNumber] = useState('')
  const [editProvince, setEditProvince] = useState('')
  const [editCity, setEditCity] = useState('')
  const [editNote, setEditNote] = useState('')

  // 加载手机号码数据
  const loadPhoneNumbers = async (page = 1, resetSearch = false) => {
    try {
      setIsLoading(true)
      
      // 如果是重置搜索，回到第一页
      if (resetSearch) {
        page = 1
        setCurrentPage(1)
      }
      
      const offset = (page - 1) * pageSize
      
      // 构建查询参数
      const queryParams = new URLSearchParams({
        limit: pageSize.toString(),
        offset: offset.toString()
      })
      
      // 添加搜索条件
      if (searchTerm && searchTerm.trim()) {
        queryParams.append('searchTerm', searchTerm.trim())
      }
      
      // 添加运营商筛选
      if (carrierFilter && carrierFilter !== 'all') {
        queryParams.append('carrier', carrierFilter)
      }
      
      const response = await fetch(`/api/phone-numbers?${queryParams.toString()}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setPhoneNumbers(data.data)
          setTotalRecords(data.total)
          setTotalPages(data.totalPages)
          setCurrentPage(data.currentPage)
        }
      }
    } catch (error) {
      console.error('Failed to load phone numbers:', error)
      toast({
        title: "错误",
        description: "加载手机号码失败",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadPhoneNumbers()
  }, [])

  // 当搜索或筛选条件改变时重新加载数据
  useEffect(() => {
    loadPhoneNumbers(1, true) // 重置到第一页
  }, [searchTerm, carrierFilter])

  // 当页码改变时加载对应页面数据
  useEffect(() => {
    if (currentPage > 1) {
      loadPhoneNumbers(currentPage)
    }
  }, [currentPage])

  // 自动识别手机号码信息 - 使用新的查询服务
  const handleLookupPhoneNumber = async () => {
    if (!newNumber.trim()) {
      toast({
        title: "提示",
        description: "请先输入手机号码",
        variant: "destructive",
      })
      return
    }

    // 验证手机号码格式
    const phoneRegex = /^1[3-9]\d{9}$/
    if (!phoneRegex.test(newNumber.trim())) {
      toast({
        title: "错误",
        description: "请输入有效的手机号码格式",
        variant: "destructive",
      })
      return
    }

    setIsLookingUp(true)
    try {
      // 先尝试客户端直接查询（保持原有逻辑）
      console.log('尝试客户端直接查询...')
      const directResult = await fetch('https://tool.lu/mobile/ajax.html', {
        method: 'POST',
        headers: {
          'accept': 'application/json, text/javascript, */*; q=0.01',
          'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'x-requested-with': 'XMLHttpRequest',
        },
        body: `mobile=${newNumber.trim()}&operate=query`
      })

      if (directResult.ok) {
        const directData = await directResult.json()
        console.log('客户端查询结果:', directData)
        
        if (directData.status && directData.text) {
          // 处理在线查询结果
          const carrierMap: Record<string, any> = {
            '移动': '中国移动',
            '联通': '中国联通', 
            '电信': '中国电信',
            '中国移动': '中国移动',
            '中国联通': '中国联通',
            '中国电信': '中国电信',
          }
          
          const carrier = carrierMap[directData.text.corp] || '其他'
          const province = directData.text.province || ''
          const city = directData.text.city || ''
          let note = ''
          
          if (carrier && province && city) {
            note = `${carrier} - ${province}${city === province ? '' : city}`
          } else if (carrier && province) {
            note = `${carrier} - ${province}`
          } else if (carrier) {
            note = carrier
          }

          // 自动填充表单
          setNewCarrier(carrier as Carrier)
          setNewProvince(province)
          setNewCity(city)
          setNewNote(note)
          
          toast({
            title: "识别成功（在线）",
            description: `已自动识别：${carrier} - ${province}${city}`,
          })
          return
        }
      }
      
      // 客户端查询失败，使用新的服务端查询服务
      console.log('客户端查询失败，使用服务端统一查询服务')
      const response = await fetch('/api/phone-numbers/lookup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: newNumber.trim()
        })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        // 自动填充表单
        const { data } = result
        setNewCarrier(data.carrier as Carrier)
        setNewProvince(data.province || '')
        setNewCity(data.city || '')
        setNewNote(data.note || '')
        
        // 根据provider和数据质量判断查询类型
        const isOfflineResult = data.provider?.includes('offline') || 
                               data.province === '未知' || 
                               data.city === '未知'
        
        const isCachedResult = data.provider?.includes('cached')
        
        let titleSuffix = ''
        if (isCachedResult) {
          titleSuffix = '（缓存）'
        } else if (isOfflineResult) {
          titleSuffix = '（离线）'
        } else {
          titleSuffix = '（在线）'
        }
        
        toast({
          title: `识别成功${titleSuffix}`,
          description: isOfflineResult 
            ? `已识别运营商：${data.carrier}（使用本地数据库）`
            : `已自动识别：${data.carrier} - ${data.province}${data.city}`,
        })
      } else {
        toast({
          title: "识别失败",
          description: result.error || "无法获取手机号码信息",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Phone number lookup failed:', error)
      toast({
        title: "识别失败",
        description: "网络错误，请检查网络连接",
        variant: "destructive",
      })
    } finally {
      setIsLookingUp(false)
    }
  }

  // 添加手机号码
  const handleAdd = async () => {
    if (!newNumber.trim()) {
      toast({
        title: "错误",
        description: "请输入手机号码",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch('/api/phone-numbers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: newNumber,
          carrier: newCarrier,
          province: newProvince || undefined,
          city: newCity || undefined,
          note: newNote || undefined,
          autoLookup: true // 启用自动查询
        })
      })

      const data = await response.json()

      if (response.ok) {
        setPhoneNumbers([...phoneNumbers, data.data])
        setShowAddForm(false)
        resetAddForm()
        toast({
          title: "成功",
          description: data.message || "手机号码添加成功",
        })
        onPhoneNumbersChange?.()
        // 重新加载当前页数据
        loadPhoneNumbers(currentPage)
      } else {
        toast({
          title: "错误",
          description: data.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "错误",
        description: "添加失败",
        variant: "destructive",
      })
    }
  }

  // 开始编辑
  const startEdit = (phone: PhoneNumber) => {
    setEditingId(phone.id)
    setEditCarrier(phone.carrier)
    setEditNumber(phone.number)
    setEditProvince(phone.province || '')
    setEditCity(phone.city || '')
    setEditNote(phone.note || '')
  }

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editNumber.trim()) {
      toast({
        title: "错误",
        description: "请输入手机号码",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch('/api/phone-numbers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId,
          number: editNumber,
          carrier: editCarrier,
          province: editProvince || undefined,
          city: editCity || undefined,
          note: editNote || undefined
        })
      })

      const data = await response.json()

      if (response.ok) {
        setPhoneNumbers(phoneNumbers.map(p => 
          p.id === editingId ? data.data : p
        ))
        setEditingId(null)
        toast({
          title: "成功",
          description: "手机号码更新成功",
        })
        onPhoneNumbersChange?.()
        // 重新加载当前页数据
        loadPhoneNumbers(currentPage)
      } else {
        toast({
          title: "错误",
          description: data.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "错误",
        description: "更新失败",
        variant: "destructive",
      })
    }
  }

  // 删除手机号码
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个手机号码吗？')) {
      return
    }

    try {
      const response = await fetch(`/api/phone-numbers?id=${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setPhoneNumbers(phoneNumbers.filter(p => p.id !== id))
        toast({
          title: "成功",
          description: "手机号码删除成功",
        })
        onPhoneNumbersChange?.()
        // 重新加载当前页数据
        loadPhoneNumbers(currentPage)
      } else {
        const data = await response.json()
        toast({
          title: "错误",
          description: data.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "错误",
        description: "删除失败",
        variant: "destructive",
      })
    }
  }

  // 运营商颜色映射
  const carrierColors = {
    '中国移动': 'bg-blue-500',
    '中国电信': 'bg-green-500',
    '中国联通': 'bg-orange-500',
    '其他': 'bg-gray-500'
  }

  if (isLoading && phoneNumbers.length === 0) {
    return (
      <div className="bg-gray-50 border rounded-lg p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载手机号码管理...</p>
          <p className="text-sm text-gray-500 mt-2">首次加载可能需要几秒钟</p>
        </div>
      </div>
    )
  }

  const content = (
    <Tabs defaultValue="list" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="list">号码列表</TabsTrigger>
        <TabsTrigger value="import">批量导入</TabsTrigger>
      </TabsList>
      
      <TabsContent value="list" className="space-y-4">
        {/* 搜索和筛选区域 */}
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜索手机号、省份、城市或备注..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={carrierFilter} onValueChange={setCarrierFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="按运营商筛选" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部运营商</SelectItem>
              <SelectItem value="中国移动">中国移动</SelectItem>
              <SelectItem value="中国电信">中国电信</SelectItem>
              <SelectItem value="中国联通">中国联通</SelectItem>
              <SelectItem value="其他">其他</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={() => setShowAddForm(true)}
            disabled={showAddForm}
          >
            <Plus className="w-4 h-4 mr-1" />
            添加号码
          </Button>
        </div>

        {/* 统计信息 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center justify-between text-sm">
            <div className="text-blue-800 font-medium">
              📊 数据统计
            </div>
            <div className="text-blue-600">
              共找到 <span className="font-bold text-blue-800">{totalRecords}</span> 个手机号码
              {totalPages > 1 && (
                <span className="ml-2">
                  (第 <span className="font-bold">{currentPage}</span> 页，共 <span className="font-bold">{totalPages}</span> 页)
                </span>
              )}
            </div>
          </div>
          {(searchTerm || carrierFilter !== 'all') && (
            <div className="mt-2 text-xs text-blue-600">
              {searchTerm && <span className="mr-3">🔍 搜索: "{searchTerm}"</span>}
              {carrierFilter !== 'all' && <span>📱 运营商: {carrierFilter}</span>}
            </div>
          )}
        </div>

        {/* 添加表单 */}
        {showAddForm && (
          <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
            <div className="font-medium">添加新号码</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>手机号码</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="请输入手机号码"
                    value={newNumber}
                    onChange={(e) => setNewNumber(e.target.value)}
                    maxLength={11}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleLookupPhoneNumber}
                    disabled={isLookingUp || !newNumber.trim() || !/^1[3-9]\d{9}$/.test(newNumber.trim())}
                    className="px-3"
                  >
                    {isLookingUp ? '识别中...' : '自动识别'}
                  </Button>
                </div>
              </div>
              <div>
                <Label>运营商（可自动识别）</Label>
                <Select value={newCarrier} onValueChange={(v) => setNewCarrier(v as Carrier)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="中国移动">中国移动</SelectItem>
                    <SelectItem value="中国电信">中国电信</SelectItem>
                    <SelectItem value="中国联通">中国联通</SelectItem>
                    <SelectItem value="其他">其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>省份（可自动识别）</Label>
                <Input
                  placeholder="省份"
                  value={newProvince}
                  onChange={(e) => setNewProvince(e.target.value)}
                />
              </div>
              <div>
                <Label>城市（可自动识别）</Label>
                <Input
                  placeholder="城市"
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <Label>备注（可自动生成）</Label>
                <Input
                  placeholder="备注信息"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd}>
                <Save className="w-4 h-4 mr-1" />
                保存
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowAddForm(false)
                  resetAddForm()
                }}
              >
                <X className="w-4 h-4 mr-1" />
                取消
              </Button>
            </div>
          </div>
        )}

        {/* 手机号码列表 */}
        {isLoading ? (
          <div className="bg-gray-50 border rounded-lg p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">正在加载手机号码...</p>
              <p className="text-sm text-gray-500 mt-2">请稍候</p>
            </div>
          </div>
        ) : phoneNumbers.length === 0 ? (
          <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8">
            <div className="text-center">
              <div className="text-4xl mb-4">📱</div>
              {searchTerm || carrierFilter !== 'all' ? (
                <>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">没有找到匹配的手机号码</h3>
                  <p className="text-gray-500 mb-4">
                    {searchTerm && <>当前搜索 "<strong>{searchTerm}</strong>"</>}
                    {searchTerm && carrierFilter !== 'all' && <> 且 </>}
                    {carrierFilter !== 'all' && <>运营商为 "<strong>{carrierFilter}</strong>"</>}
                    {' '}没有找到相关记录
                  </p>
                  <p className="text-sm text-gray-400">
                    💡 尝试调整搜索条件或添加新的手机号码
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">还没有手机号码</h3>
                  <p className="text-gray-500 mb-4">
                    开始添加您的第一个手机号码，支持自动识别运营商信息
                  </p>
                  <Button
                    onClick={() => setShowAddForm(true)}
                    disabled={showAddForm}
                    className="mt-2"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    添加第一个号码
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {phoneNumbers.map(phone => (
              <div
                key={phone.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                {editingId === phone.id ? (
                  <>
                    <div className="flex gap-2 flex-1 grid grid-cols-5">
                      <Input
                        value={editNumber}
                        onChange={(e) => setEditNumber(e.target.value)}
                        maxLength={11}
                        placeholder="手机号码"
                      />
                      <Select value={editCarrier} onValueChange={(v) => setEditCarrier(v as Carrier)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="中国移动">移动</SelectItem>
                          <SelectItem value="中国电信">电信</SelectItem>
                          <SelectItem value="中国联通">联通</SelectItem>
                          <SelectItem value="其他">其他</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        value={editProvince}
                        onChange={(e) => setEditProvince(e.target.value)}
                        placeholder="省份"
                      />
                      <Input
                        value={editCity}
                        onChange={(e) => setEditCity(e.target.value)}
                        placeholder="城市"
                      />
                      <Input
                        value={editNote}
                        onChange={(e) => setEditNote(e.target.value)}
                        placeholder="备注"
                      />
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Button size="sm" variant="ghost" onClick={handleSaveEdit}>
                        <Save className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="font-mono text-lg">{phone.number}</div>
                        <Badge className={`${carrierColors[phone.carrier]} text-white text-xs`}>
                          {phone.carrier}
                        </Badge>
                      </div>
                      <div className="flex gap-2 text-sm text-gray-600">
                        {phone.province && (
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                            {phone.province}
                          </span>
                        )}
                        {phone.city && (
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                            {phone.city}
                          </span>
                        )}
                        {phone.note && (
                          <span className="text-gray-500">
                            {phone.note}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEdit(phone)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(phone.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 分页controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4">
            <p className="text-sm text-gray-600">
              第 {currentPage} 页，共 {totalPages} 页，总计 {totalRecords} 条记录
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                上一页
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                下一页
              </Button>
            </div>
          </div>
        )}
      </TabsContent>
      
      <TabsContent value="import">
        <PhoneNumberImporter onImportComplete={() => loadPhoneNumbers(currentPage)} />
      </TabsContent>
    </Tabs>
  )

  if (showCard) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Phone className="w-5 h-5 mr-2" />
              手机号码管理
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {content}
        </CardContent>
      </Card>
    )
  }

  return content
}