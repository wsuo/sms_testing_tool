"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Play, Pause, Square, Plus, Trash2, Clock, Settings, Calendar, Timer } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

interface AutoTestPlan {
  id: string
  name: string
  description: string
  templateId: string
  templateName: string
  phoneNumbers: string[]
  schedule: {
    type: 'immediate' | 'scheduled' | 'recurring'
    startTime?: string
    interval?: number // minutes for recurring
    endTime?: string
  }
  status: 'inactive' | 'active' | 'running' | 'paused' | 'completed'
  progress: {
    total: number
    completed: number
    success: number
    failed: number
  }
  createdAt: string
  lastRun?: string
  nextRun?: string
}

interface SmsTemplate {
  id: string
  name: string
  content: string
  params: string[]
  code: string
}

export default function AutoTestPage() {
  const { toast } = useToast()
  const [plans, setPlans] = useState<AutoTestPlan[]>([])
  const [templates, setTemplates] = useState<SmsTemplate[]>([])
  const [phoneNumbers, setPhoneNumbers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  
  // 创建计划表单状态
  const [newPlan, setNewPlan] = useState({
    name: '',
    description: '',
    templateId: '',
    phoneNumbers: [] as string[],
    scheduleType: 'immediate' as 'immediate' | 'scheduled' | 'recurring',
    startTime: '',
    interval: 60,
    endTime: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      // 加载自动测试计划
      const plansResponse = await fetch('/api/auto-test/plans')
      if (plansResponse.ok) {
        const plansData = await plansResponse.json()
        setPlans(plansData.data || [])
      }

      // 加载模板
      const adminToken = localStorage.getItem("sms-admin-token")
      if (adminToken) {
        const templatesResponse = await fetch("/admin-api/system/sms-template/page?pageNo=1&pageSize=50&channelId=8", {
          headers: {
            "Authorization": `Bearer ${adminToken}`,
            "Content-Type": "application/json",
          },
        })
        if (templatesResponse.ok) {
          const templatesData = await templatesResponse.json()
          if (templatesData.code === 0) {
            const templatesList = Array.isArray(templatesData.data) ? templatesData.data : 
                                 (templatesData.data?.list ? templatesData.data.list : [])
            setTemplates(templatesList)
          }
        }
      }

      // 加载电话号码
      const phonesResponse = await fetch('/api/phone-numbers/search?limit=1000')
      if (phonesResponse.ok) {
        const phonesData = await phonesResponse.json()
        setPhoneNumbers(phonesData.data || [])
      }
    } catch (error) {
      console.error('Failed to load data:', error)
      toast({
        title: "加载失败",
        description: "无法加载自动测试数据",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const createPlan = async () => {
    try {
      if (!newPlan.name.trim() || !newPlan.templateId || newPlan.phoneNumbers.length === 0) {
        toast({
          title: "参数错误",
          description: "请填写完整的计划信息",
          variant: "destructive",
        })
        return
      }

      const response = await fetch('/api/auto-test/plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newPlan)
      })

      if (response.ok) {
        toast({
          title: "创建成功",
          description: "自动测试计划已创建",
        })
        setShowCreateForm(false)
        setNewPlan({
          name: '',
          description: '',
          templateId: '',
          phoneNumbers: [],
          scheduleType: 'immediate',
          startTime: '',
          interval: 60,
          endTime: ''
        })
        loadData()
      } else {
        throw new Error('Failed to create plan')
      }
    } catch (error) {
      console.error('Failed to create plan:', error)
      toast({
        title: "创建失败",
        description: "无法创建自动测试计划",
        variant: "destructive",
      })
    }
  }

  const controlPlan = async (planId: string, action: 'start' | 'pause' | 'stop') => {
    try {
      const response = await fetch(`/api/auto-test/plans/${planId}/${action}`, {
        method: 'POST'
      })

      if (response.ok) {
        toast({
          title: "操作成功",
          description: `计划已${action === 'start' ? '启动' : action === 'pause' ? '暂停' : '停止'}`,
        })
        loadData()
      } else {
        throw new Error(`Failed to ${action} plan`)
      }
    } catch (error) {
      console.error(`Failed to ${action} plan:`, error)
      toast({
        title: "操作失败",
        description: `无法${action === 'start' ? '启动' : action === 'pause' ? '暂停' : '停止'}计划`,
        variant: "destructive",
      })
    }
  }

  const deletePlan = async (planId: string) => {
    try {
      const response = await fetch(`/api/auto-test/plans/${planId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast({
          title: "删除成功",
          description: "自动测试计划已删除",
        })
        loadData()
      } else {
        throw new Error('Failed to delete plan')
      }
    } catch (error) {
      console.error('Failed to delete plan:', error)
      toast({
        title: "删除失败",
        description: "无法删除自动测试计划",
        variant: "destructive",
      })
    }
  }

  const getStatusBadge = (status: AutoTestPlan['status']) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">已激活</Badge>
      case 'running':
        return <Badge className="bg-green-500">运行中</Badge>
      case 'paused':
        return <Badge variant="secondary">已暂停</Badge>
      case 'completed':
        return <Badge variant="outline">已完成</Badge>
      default:
        return <Badge variant="secondary">未激活</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">自动化测试</h1>
            <Link href="/">
              <Button variant="outline">返回首页</Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-2 bg-gray-200 rounded w-full"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">自动化测试</h1>
            <p className="text-gray-600 mt-1">创建和管理自动化短信测试计划</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              创建计划
            </Button>
            <Link href="/">
              <Button variant="outline">返回首页</Button>
            </Link>
          </div>
        </div>

        {/* 创建计划表单 */}
        {showCreateForm && (
          <Card>
            <CardHeader>
              <CardTitle>创建自动测试计划</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="plan-name">计划名称</Label>
                  <Input
                    id="plan-name"
                    value={newPlan.name}
                    onChange={(e) => setNewPlan(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="输入计划名称"
                  />
                </div>
                <div>
                  <Label htmlFor="plan-template">短信模板</Label>
                  <Select 
                    value={newPlan.templateId} 
                    onValueChange={(value) => setNewPlan(prev => ({ ...prev, templateId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择短信模板" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="plan-desc">描述</Label>
                <Input
                  id="plan-desc"
                  value={newPlan.description}
                  onChange={(e) => setNewPlan(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="输入计划描述"
                />
              </div>

              <div>
                <Label>调度类型</Label>
                <Select 
                  value={newPlan.scheduleType} 
                  onValueChange={(value: any) => setNewPlan(prev => ({ ...prev, scheduleType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">立即执行</SelectItem>
                    <SelectItem value="scheduled">定时执行</SelectItem>
                    <SelectItem value="recurring">周期执行</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newPlan.scheduleType === 'scheduled' && (
                <div>
                  <Label htmlFor="start-time">开始时间</Label>
                  <Input
                    id="start-time"
                    type="datetime-local"
                    value={newPlan.startTime}
                    onChange={(e) => setNewPlan(prev => ({ ...prev, startTime: e.target.value }))}
                  />
                </div>
              )}

              {newPlan.scheduleType === 'recurring' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="start-time-recurring">开始时间</Label>
                    <Input
                      id="start-time-recurring"
                      type="datetime-local"
                      value={newPlan.startTime}
                      onChange={(e) => setNewPlan(prev => ({ ...prev, startTime: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="interval">间隔(分钟)</Label>
                    <Input
                      id="interval"
                      type="number"
                      value={newPlan.interval}
                      onChange={(e) => setNewPlan(prev => ({ ...prev, interval: parseInt(e.target.value) || 60 }))}
                      min="1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-time">结束时间</Label>
                    <Input
                      id="end-time"
                      type="datetime-local"
                      value={newPlan.endTime}
                      onChange={(e) => setNewPlan(prev => ({ ...prev, endTime: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              <div>
                <Label>目标电话号码 ({newPlan.phoneNumbers.length} 个已选择)</Label>
                <div className="mt-2 p-3 border rounded-lg max-h-32 overflow-y-auto">
                  {phoneNumbers.map((phone) => (
                    <div key={phone.id} className="flex items-center space-x-2 py-1">
                      <input
                        type="checkbox"
                        checked={newPlan.phoneNumbers.includes(phone.number)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewPlan(prev => ({
                              ...prev,
                              phoneNumbers: [...prev.phoneNumbers, phone.number]
                            }))
                          } else {
                            setNewPlan(prev => ({
                              ...prev,
                              phoneNumbers: prev.phoneNumbers.filter(num => num !== phone.number)
                            }))
                          }
                        }}
                      />
                      <span className="text-sm">{phone.number}</span>
                      <Badge variant="outline" className="text-xs">{phone.carrier}</Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                  取消
                </Button>
                <Button onClick={createPlan}>
                  创建计划
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 计划列表 */}
        {plans.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Timer className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">暂无自动测试计划</h3>
              <p className="text-gray-500 mb-4">创建您的第一个自动化短信测试计划</p>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                创建计划
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card key={plan.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
                    </div>
                    {getStatusBadge(plan.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-600">模板:</span>
                      <span className="font-medium">{plan.templateName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">目标数量:</span>
                      <span className="font-medium">{plan.phoneNumbers.length} 个</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">调度类型:</span>
                      <span className="font-medium">
                        {plan.schedule.type === 'immediate' ? '立即执行' : 
                         plan.schedule.type === 'scheduled' ? '定时执行' : '周期执行'}
                      </span>
                    </div>
                    {plan.nextRun && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">下次执行:</span>
                        <span className="font-medium text-blue-600">{new Date(plan.nextRun).toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  {plan.progress.total > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>进度: {plan.progress.completed}/{plan.progress.total}</span>
                        <span>成功率: {plan.progress.total > 0 ? ((plan.progress.success / plan.progress.total) * 100).toFixed(1) : 0}%</span>
                      </div>
                      <Progress value={(plan.progress.completed / plan.progress.total) * 100} />
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2">
                    <div className="flex gap-1">
                      {plan.status === 'inactive' && (
                        <Button size="sm" onClick={() => controlPlan(plan.id, 'start')}>
                          <Play className="w-3 h-3 mr-1" />
                          启动
                        </Button>
                      )}
                      {plan.status === 'running' && (
                        <Button size="sm" variant="outline" onClick={() => controlPlan(plan.id, 'pause')}>
                          <Pause className="w-3 h-3 mr-1" />
                          暂停
                        </Button>
                      )}
                      {plan.status === 'paused' && (
                        <Button size="sm" onClick={() => controlPlan(plan.id, 'start')}>
                          <Play className="w-3 h-3 mr-1" />
                          继续
                        </Button>
                      )}
                      {(plan.status === 'running' || plan.status === 'paused') && (
                        <Button size="sm" variant="outline" onClick={() => controlPlan(plan.id, 'stop')}>
                          <Square className="w-3 h-3 mr-1" />
                          停止
                        </Button>
                      )}
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => deletePlan(plan.id)}
                      disabled={plan.status === 'running'}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 使用说明 */}
        <Alert>
          <Settings className="h-4 w-4" />
          <AlertDescription>
            <strong>自动化测试说明:</strong>
            <ul className="mt-2 space-y-1 text-sm">
              <li>• <strong>立即执行:</strong> 创建后立即开始发送短信</li>
              <li>• <strong>定时执行:</strong> 在指定时间开始执行一次性测试</li>
              <li>• <strong>周期执行:</strong> 按指定间隔重复执行，直到结束时间</li>
              <li>• 运行中的计划可以暂停和恢复，已完成的计划可以重新启动</li>
              <li>• 所有自动发送的短信都会记录在监控页面中</li>
            </ul>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )
}