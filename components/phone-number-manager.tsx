"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Phone, Plus, Edit2, Trash2, Save, X } from "lucide-react"

export type Carrier = '移动' | '电信' | '联通'

export interface PhoneNumber {
  id: string
  carrier: Carrier
  number: string
  createdAt: string
  updatedAt: string
}

interface PhoneNumberManagerProps {
  onPhoneNumbersChange?: () => void
}

export default function PhoneNumberManager({ onPhoneNumbersChange }: PhoneNumberManagerProps) {
  const { toast } = useToast()
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // 新增表单状态
  const [showAddForm, setShowAddForm] = useState(false)
  const [newCarrier, setNewCarrier] = useState<Carrier>('移动')
  const [newNumber, setNewNumber] = useState('')
  
  // 编辑状态
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editCarrier, setEditCarrier] = useState<Carrier>('移动')
  const [editNumber, setEditNumber] = useState('')

  // 加载手机号码数据
  const loadPhoneNumbers = async () => {
    try {
      const response = await fetch('/api/phone-numbers')
      if (response.ok) {
        const data = await response.json()
        setPhoneNumbers(data.data)
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
          carrier: newCarrier,
          number: newNumber
        })
      })

      const data = await response.json()

      if (response.ok) {
        setPhoneNumbers([...phoneNumbers, data.data])
        setShowAddForm(false)
        setNewNumber('')
        toast({
          title: "成功",
          description: "手机号码添加成功",
        })
        onPhoneNumbersChange?.()
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
          carrier: editCarrier,
          number: editNumber
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

  // 按运营商分组
  const groupedNumbers = phoneNumbers.reduce((acc, phone) => {
    if (!acc[phone.carrier]) {
      acc[phone.carrier] = []
    }
    acc[phone.carrier].push(phone)
    return acc
  }, {} as Record<Carrier, PhoneNumber[]>)

  const carrierColors = {
    '移动': 'bg-blue-500',
    '电信': 'bg-green-500',
    '联通': 'bg-orange-500'
  }

  if (isLoading) {
    return <div className="text-center py-4">加载中...</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Phone className="w-5 h-5 mr-2" />
            手机号码管理
          </div>
          <Button
            size="sm"
            onClick={() => setShowAddForm(true)}
            disabled={showAddForm}
          >
            <Plus className="w-4 h-4 mr-1" />
            添加号码
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 添加表单 */}
        {showAddForm && (
          <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
            <div className="font-medium">添加新号码</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>运营商</Label>
                <Select value={newCarrier} onValueChange={(v) => setNewCarrier(v as Carrier)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="移动">移动</SelectItem>
                    <SelectItem value="电信">电信</SelectItem>
                    <SelectItem value="联通">联通</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>手机号码</Label>
                <Input
                  placeholder="请输入手机号码"
                  value={newNumber}
                  onChange={(e) => setNewNumber(e.target.value)}
                  maxLength={11}
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
                  setNewNumber('')
                }}
              >
                <X className="w-4 h-4 mr-1" />
                取消
              </Button>
            </div>
          </div>
        )}

        {/* 按运营商分组显示 */}
        {(['移动', '电信', '联通'] as Carrier[]).map(carrier => (
          <div key={carrier} className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className={`${carrierColors[carrier]} text-white`}>
                {carrier}
              </Badge>
              <span className="text-sm text-gray-500">
                ({groupedNumbers[carrier]?.length || 0} 个号码)
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {groupedNumbers[carrier]?.map(phone => (
                <div
                  key={phone.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  {editingId === phone.id ? (
                    <>
                      <div className="flex gap-2 flex-1">
                        <Select value={editCarrier} onValueChange={(v) => setEditCarrier(v as Carrier)}>
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="移动">移动</SelectItem>
                            <SelectItem value="电信">电信</SelectItem>
                            <SelectItem value="联通">联通</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          value={editNumber}
                          onChange={(e) => setEditNumber(e.target.value)}
                          maxLength={11}
                          className="flex-1"
                        />
                      </div>
                      <div className="flex gap-1">
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
                      <span className="font-mono">{phone.number}</span>
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
              {(!groupedNumbers[carrier] || groupedNumbers[carrier].length === 0) && (
                <div className="text-sm text-gray-500 text-center py-2">
                  暂无{carrier}号码
                </div>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}