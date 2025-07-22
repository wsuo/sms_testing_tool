"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Phone, Plus, Trash2, Edit3 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface PhoneNumber {
  id: string
  number: string
  carrier: string
  note?: string
}

interface PhoneNumberManagerModalProps {
  onPhoneNumbersChange?: () => void
  onSelectNumber?: (number: string) => void
}

export default function PhoneNumberManagerModal({ 
  onPhoneNumbersChange, 
  onSelectNumber 
}: PhoneNumberManagerModalProps) {
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([])
  const [newNumber, setNewNumber] = useState("")
  const [newCarrier, setNewCarrier] = useState("")
  const [newNote, setNewNote] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Load phone numbers when modal opens
  useEffect(() => {
    if (isOpen) {
      loadPhoneNumbers()
    }
  }, [isOpen])

  const loadPhoneNumbers = async () => {
    try {
      const response = await fetch('/api/phone-numbers')
      if (response.ok) {
        const data = await response.json()
        setPhoneNumbers(data.data || [])
      }
    } catch (error) {
      console.error('Failed to load phone numbers:', error)
      toast({
        title: "加载失败",
        description: "无法加载手机号码列表",
        variant: "destructive",
      })
    }
  }

  const addPhoneNumber = async () => {
    if (!newNumber.trim() || !newCarrier.trim()) {
      toast({
        title: "错误",
        description: "请填写手机号码和运营商",
        variant: "destructive",
      })
      return
    }

    // Simple phone number validation
    const phoneRegex = /^1[3-9]\d{9}$/
    if (!phoneRegex.test(newNumber.trim())) {
      toast({
        title: "错误", 
        description: "请输入有效的手机号码",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/phone-numbers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          number: newNumber.trim(),
          carrier: newCarrier.trim(),
          note: newNote.trim() || undefined,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setPhoneNumbers(prev => [...prev, data.data])
        setNewNumber("")
        setNewCarrier("")
        setNewNote("")
        
        toast({
          title: "成功",
          description: "手机号码已添加",
        })
        
        onPhoneNumbersChange?.()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || '添加失败')
      }
    } catch (error) {
      toast({
        title: "错误",
        description: error instanceof Error ? error.message : "添加手机号码失败",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const deletePhoneNumber = async (id: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/phone-numbers?id=${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setPhoneNumbers(prev => prev.filter(phone => phone.id !== id))
        toast({
          title: "成功",
          description: "手机号码已删除",
        })
        onPhoneNumbersChange?.()
      } else {
        throw new Error('删除失败')
      }
    } catch (error) {
      toast({
        title: "错误",
        description: "删除手机号码失败",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const selectAndClose = (number: string) => {
    onSelectNumber?.(number)
    setIsOpen(false)
    toast({
      title: "已选择",
      description: `已选择手机号: ${number}`,
    })
  }

  const carriers = [
    { value: "中国移动", label: "中国移动" },
    { value: "中国联通", label: "中国联通" },
    { value: "中国电信", label: "中国电信" },
    { value: "其他", label: "其他" },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Phone className="w-4 h-4 mr-2" />
          管理号码
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Phone className="w-5 h-5 mr-2" />
            手机号码管理
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Add New Phone Number */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">添加新号码</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone-number">手机号码</Label>
                  <Input
                    id="phone-number"
                    placeholder="请输入手机号码"
                    value={newNumber}
                    onChange={(e) => setNewNumber(e.target.value)}
                    maxLength={11}
                  />
                </div>
                <div>
                  <Label htmlFor="carrier">运营商</Label>
                  <Select value={newCarrier} onValueChange={setNewCarrier}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择运营商" />
                    </SelectTrigger>
                    <SelectContent>
                      {carriers.map((carrier) => (
                        <SelectItem key={carrier.value} value={carrier.value}>
                          {carrier.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="note">备注 (可选)</Label>
                <Input
                  id="note"
                  placeholder="添加备注信息"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                />
              </div>
              <Button 
                onClick={addPhoneNumber} 
                disabled={isLoading}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                添加号码
              </Button>
            </CardContent>
          </Card>

          {/* Phone Numbers List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">已保存的号码</CardTitle>
            </CardHeader>
            <CardContent>
              {phoneNumbers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  暂无保存的手机号码
                </div>
              ) : (
                <div className="space-y-3">
                  {phoneNumbers.map((phone) => (
                    <div
                      key={phone.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div>
                          <div className="font-medium">{phone.number}</div>
                          {phone.note && (
                            <div className="text-sm text-gray-500">{phone.note}</div>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {phone.carrier}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => selectAndClose(phone.number)}
                        >
                          选择
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deletePhoneNumber(phone.id)}
                          disabled={isLoading}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}