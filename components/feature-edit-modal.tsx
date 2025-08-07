"use client"

import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"

interface FeatureItem {
  id: number
  module_id: number
  name: string
  description?: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'pending' | 'in_progress' | 'completed' | 'testing' | 'deployed' | 'paused'
  progress_percentage: number
  estimated_hours?: number
  actual_hours?: number
  assignee?: string
  start_date?: string
  estimated_completion_date?: string
  actual_completion_date?: string
  notes?: string
  created_at?: string
  updated_at?: string
}

interface FeatureEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  featureItem: FeatureItem | null
  onSuccess?: () => void
}

const priorityOptions = [
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
  { value: 'critical', label: '关键' }
]

const statusOptions = [
  { value: 'pending', label: '待开发' },
  { value: 'in_progress', label: '开发中' },
  { value: 'completed', label: '已完成' },
  { value: 'testing', label: '测试中' },
  { value: 'deployed', label: '已上线' },
  { value: 'paused', label: '已暂停' }
]

export function FeatureEditModal({ 
  open, 
  onOpenChange, 
  featureItem, 
  onSuccess 
}: FeatureEditModalProps) {
  const [formData, setFormData] = useState<Partial<FeatureItem>>({})
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (featureItem && open) {
      setFormData({
        id: featureItem.id,
        name: featureItem.name || '',
        description: featureItem.description || '',
        priority: featureItem.priority || 'medium',
        status: featureItem.status || 'pending',
        progress_percentage: featureItem.progress_percentage || 0,
        estimated_hours: featureItem.estimated_hours || undefined,
        actual_hours: featureItem.actual_hours || undefined,
        assignee: featureItem.assignee || '',
        start_date: featureItem.start_date || '',
        estimated_completion_date: featureItem.estimated_completion_date || '',
        actual_completion_date: featureItem.actual_completion_date || '',
        notes: featureItem.notes || ''
      })
    }
  }, [featureItem, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!featureItem) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/project-progress/feature-items', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })

      const result = await response.json()
      
      if (result.success) {
        toast({
          title: "更新成功",
          description: result.message || "功能点已更新"
        })
        
        if (onSuccess) {
          onSuccess()
        }
        onOpenChange(false)
      } else {
        throw new Error(result.error || '更新失败')
      }
    } catch (error) {
      console.error('更新功能点失败:', error)
      toast({
        title: "更新失败",
        description: (error as Error).message,
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof FeatureItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const formatDateForInput = (dateString?: string) => {
    if (!dateString) return ''
    try {
      const date = new Date(dateString)
      return date.toISOString().split('T')[0]
    } catch {
      return ''
    }
  }

  if (!featureItem) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>编辑功能点</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 功能点名称 */}
          <div className="space-y-2">
            <Label htmlFor="name">功能点名称 *</Label>
            <Input
              id="name"
              value={formData.name || ''}
              onChange={(e) => handleInputChange('name', e.target.value)}
              required
            />
          </div>

          {/* 描述 */}
          <div className="space-y-2">
            <Label htmlFor="description">描述</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
            />
          </div>

          {/* 优先级和状态 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>优先级</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => handleInputChange('priority', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>状态</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleInputChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 进度和负责人 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="progress">完成进度 (%)</Label>
              <Input
                id="progress"
                type="number"
                min="0"
                max="100"
                value={formData.progress_percentage || 0}
                onChange={(e) => handleInputChange('progress_percentage', parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignee">负责人</Label>
              <Input
                id="assignee"
                value={formData.assignee || ''}
                onChange={(e) => handleInputChange('assignee', e.target.value)}
              />
            </div>
          </div>

          {/* 工时 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="estimated_hours">预计工时</Label>
              <Input
                id="estimated_hours"
                type="number"
                min="0"
                step="0.5"
                value={formData.estimated_hours || ''}
                onChange={(e) => handleInputChange('estimated_hours', e.target.value ? parseFloat(e.target.value) : undefined)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="actual_hours">实际工时</Label>
              <Input
                id="actual_hours"
                type="number"
                min="0"
                step="0.5"
                value={formData.actual_hours || ''}
                onChange={(e) => handleInputChange('actual_hours', e.target.value ? parseFloat(e.target.value) : undefined)}
              />
            </div>
          </div>

          {/* 日期 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">开始日期</Label>
              <Input
                id="start_date"
                type="date"
                value={formatDateForInput(formData.start_date)}
                onChange={(e) => handleInputChange('start_date', e.target.value || null)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimated_completion_date">预计完成日期</Label>
              <Input
                id="estimated_completion_date"
                type="date"
                value={formatDateForInput(formData.estimated_completion_date)}
                onChange={(e) => handleInputChange('estimated_completion_date', e.target.value || null)}
              />
            </div>
          </div>

          {/* 实际完成日期 */}
          <div className="space-y-2">
            <Label htmlFor="actual_completion_date">实际完成日期</Label>
            <Input
              id="actual_completion_date"
              type="date"
              value={formatDateForInput(formData.actual_completion_date)}
              onChange={(e) => handleInputChange('actual_completion_date', e.target.value || null)}
            />
          </div>

          {/* 备注 */}
          <div className="space-y-2">
            <Label htmlFor="notes">备注</Label>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}