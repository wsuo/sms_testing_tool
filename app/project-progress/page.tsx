"use client"

import React, { useEffect, useState } from "react"
import { 
  Kanban,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Eye,
  Edit,
  Trash2,
  Clock,
  User,
  Calendar,
  AlertCircle,
  CheckCircle,
  MoreVertical,
  ArrowRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/ui/use-toast"
import { ModuleHeader } from "@/components/module-header"
import { DataImportModal } from "@/components/data-import-modal"
import { FeatureEditModal } from "@/components/feature-edit-modal"
import { WithAdminAuth } from "@/components/with-admin-auth"

// 接口定义 - 重新设计数据结构
interface PhaseStats {
  totalPlatforms: number
  totalModules: number
  totalItems: number
  completedItems: number
  completionRate: number
}

interface Platform {
  id: number
  name: string
  description?: string
  color?: string
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

interface Module {
  id: number
  project_id: number
  phase_id?: number
  name: string
  description?: string
  module_order?: number
  created_at: string
  updated_at: string
}

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
  created_at: string
  updated_at: string
}

// 树状数据结构
interface PlatformTreeNode {
  platform: Platform
  modules: ModuleTreeNode[]
  stats: {
    totalModules: number
    totalItems: number
    completedItems: number
    completionRate: number
  }
}

interface ModuleTreeNode {
  module: Module
  featureItems: FeatureItem[]
  stats: {
    totalItems: number
    completedItems: number
    completionRate: number
  }
}

const priorityColors = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800'
}

const statusColors = {
  pending: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  testing: 'bg-yellow-100 text-yellow-800',
  deployed: 'bg-purple-100 text-purple-800',
  paused: 'bg-red-100 text-red-800'
}

const statusLabels = {
  pending: '待开发',
  in_progress: '开发中',
  completed: '已完成',
  testing: '测试中',
  deployed: '已上线',
  paused: '已暂停'
}

export default function ProjectProgressPage() {
  const [platformTreeData, setPlatformTreeData] = useState<PlatformTreeNode[]>([])
  const [phaseStats, setPhaseStats] = useState<PhaseStats>({
    totalPlatforms: 0,
    totalModules: 0,
    totalItems: 0,
    completedItems: 0,
    completionRate: 0
  })
  const [availablePhases, setAvailablePhases] = useState<string[]>([])
  const [selectedPhase, setSelectedPhase] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [expandedPlatforms, setExpandedPlatforms] = useState<Set<number>>(new Set())
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedFeatureItem, setSelectedFeatureItem] = useState<FeatureItem | null>(null)
  
  const { toast } = useToast()

  useEffect(() => {
    loadAvailablePhases()
  }, [])

  useEffect(() => {
    if (selectedPhase && selectedPhase !== 'all') {
      loadPhaseData(selectedPhase)
    } else {
      loadAllPhaseData()
    }
  }, [selectedPhase])

  const loadAvailablePhases = async () => {
    try {
      const response = await fetch('/api/project-progress/phases/manage')
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setAvailablePhases(['all', ...result.data])
          if (result.data.length > 0) {
            setSelectedPhase(result.data[0]) // 默认选择第一个期数
          }
        }
      }
    } catch (error) {
      console.error('加载期数列表失败:', error)
    }
  }

  const loadPhaseData = async (phaseName: string) => {
    try {
      setIsLoading(true)
      
      // 获取指定期数的树状数据
      const response = await fetch(`/api/project-progress/tree?phase=${encodeURIComponent(phaseName)}`)
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setPlatformTreeData(result.data.platformTree || [])
          setPhaseStats(result.data.stats || {
            totalPlatforms: 0,
            totalModules: 0,
            totalItems: 0,
            completedItems: 0,
            completionRate: 0
          })
        }
      } else {
        // 如果API不存在，先显示空数据
        setPlatformTreeData([])
        setPhaseStats({
          totalPlatforms: 0,
          totalModules: 0,
          totalItems: 0,
          completedItems: 0,
          completionRate: 0
        })
      }
    } catch (error) {
      console.error('加载期数据失败:', error)
      toast({
        title: "加载数据失败",
        description: "请刷新页面重试",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadAllPhaseData = async () => {
    try {
      setIsLoading(true)
      
      // 获取所有期数的汇总数据
      const response = await fetch('/api/project-progress/tree')
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setPlatformTreeData(result.data.platformTree || [])
          setPhaseStats(result.data.stats || {
            totalPlatforms: 0,
            totalModules: 0,
            totalItems: 0,
            completedItems: 0,
            completionRate: 0
          })
        }
      } else {
        setPlatformTreeData([])
        setPhaseStats({
          totalPlatforms: 0,
          totalModules: 0,
          totalItems: 0,
          completedItems: 0,
          completionRate: 0
        })
      }
    } catch (error) {
      console.error('加载数据失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 筛选功能点数据
  const getFilteredFeatureItems = (items: FeatureItem[]) => {
    return items.filter(item => {
      const matchesSearch = !searchTerm || 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.assignee && item.assignee.toLowerCase().includes(searchTerm.toLowerCase()))
      
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter
      const matchesPriority = priorityFilter === 'all' || item.priority === priorityFilter
      
      return matchesSearch && matchesStatus && matchesPriority
    })
  }

  // 平台展开/折叠处理
  const togglePlatform = (platformId: number) => {
    const newExpanded = new Set(expandedPlatforms)
    if (newExpanded.has(platformId)) {
      newExpanded.delete(platformId)
    } else {
      newExpanded.add(platformId)
    }
    setExpandedPlatforms(newExpanded)
  }

  // 模块展开/折叠处理
  const toggleModule = (moduleId: number) => {
    const newExpanded = new Set(expandedModules)
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId)
    } else {
      newExpanded.add(moduleId)
    }
    setExpandedModules(newExpanded)
  }

  const handleImportSuccess = () => {
    // 重新加载数据
    loadAvailablePhases()
    if (selectedPhase && selectedPhase !== 'all') {
      loadPhaseData(selectedPhase)
    } else {
      loadAllPhaseData()
    }
    setImportModalOpen(false)
  }

  const openImportModal = () => {
    setImportModalOpen(true)
  }

  // 编辑功能点
  const handleEditFeatureItem = (item: FeatureItem) => {
    setSelectedFeatureItem(item)
    setEditModalOpen(true)
  }

  // 删除功能点
  const handleDeleteFeatureItem = async (item: FeatureItem) => {
    if (!confirm(`确定要删除功能点 "${item.name}" 吗？此操作不可恢复。`)) {
      return
    }

    try {
      const response = await fetch(`/api/project-progress/feature-items?id=${item.id}`, {
        method: 'DELETE'
      })

      const result = await response.json()
      
      if (result.success) {
        toast({
          title: "删除成功",
          description: result.message || "功能点已删除"
        })
        
        // 重新加载数据
        if (selectedPhase && selectedPhase !== 'all') {
          loadPhaseData(selectedPhase)
        } else {
          loadAllPhaseData()
        }
      } else {
        throw new Error(result.error || '删除失败')
      }
    } catch (error) {
      console.error('删除功能点失败:', error)
      toast({
        title: "删除失败",
        description: (error as Error).message,
        variant: "destructive"
      })
    }
  }

  // 编辑成功后的回调
  const handleEditSuccess = () => {
    // 重新加载数据
    if (selectedPhase && selectedPhase !== 'all') {
      loadPhaseData(selectedPhase)
    } else {
      loadAllPhaseData()
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-100 to-gray-50 relative overflow-hidden">
      {/* 动态背景装饰 */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZGVmcz4KICAgIDxwYXR0ZXJuIGlkPSJhIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiPgogICAgICA8Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMSkiLz4KICAgIDwvcGF0dGVybj4KICA8L2RlZnM+CiAgPHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNhKSIvPgo8L3N2Zz4=')] opacity-30 pointer-events-none" />
      
      <ModuleHeader
        title="项目管理"
        description="项目进度跟踪和管理系统"
        icon={Kanban}
        showAuthStatus={true}
      />
      
      <div className="pt-24 container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* 期数选择器 - 主要筛选维度 */}
          <Select value={selectedPhase} onValueChange={setSelectedPhase}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="选择开发期" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有期数</SelectItem>
              {availablePhases.filter(phase => phase !== 'all').map(phase => (
                <SelectItem key={phase} value={phase}>
                  {phase}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button onClick={openImportModal}>
            <Plus className="h-4 w-4 mr-2" />
            导入数据
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">业务平台数</CardTitle>
            <Kanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{phaseStats.totalPlatforms}</div>
            <p className="text-xs text-muted-foreground">
              {selectedPhase === 'all' ? '全部期数' : `${selectedPhase}期数`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">功能模块数</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{phaseStats.totalModules}</div>
            <p className="text-xs text-muted-foreground">
              跨平台模块总数
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">功能点总数</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{phaseStats.totalItems}</div>
            <p className="text-xs text-muted-foreground">
              已完成: {phaseStats.completedItems} 个
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总体完成率</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{phaseStats.completionRate}%</div>
            <Progress value={phaseStats.completionRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* 主要内容区域 - 树状结构展示 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>平台功能结构</CardTitle>
              <p className="text-sm text-muted-foreground">
                {selectedPhase === 'all' ? '全部期数' : selectedPhase} 的平台、模块和功能点详情
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* 搜索和筛选 */}
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="搜索功能点..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有状态</SelectItem>
                  <SelectItem value="pending">待开发</SelectItem>
                  <SelectItem value="in_progress">开发中</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
                  <SelectItem value="testing">测试中</SelectItem>
                  <SelectItem value="deployed">已上线</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="优先级" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有优先级</SelectItem>
                  <SelectItem value="critical">关键</SelectItem>
                  <SelectItem value="high">高</SelectItem>
                  <SelectItem value="medium">中</SelectItem>
                  <SelectItem value="low">低</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {platformTreeData.length === 0 ? (
            <div className="text-center py-12">
              <Kanban className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">暂无数据</h3>
              <p className="text-muted-foreground mb-4">
                {selectedPhase === 'all' ? '还没有任何期数的数据' : `${selectedPhase} 还没有数据`}
              </p>
              <Button onClick={openImportModal}>导入项目数据</Button>
            </div>
          ) : (
            <div className="space-y-4">
              {platformTreeData.map((platformNode) => (
                <div key={platformNode.platform.id} className="border rounded-lg">
                  {/* 平台级别 */}
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => togglePlatform(platformNode.platform.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: platformNode.platform.color }}
                      />
                      <div className="flex items-center gap-2">
                        {expandedPlatforms.has(platformNode.platform.id) ? 
                          <ArrowRight className="h-4 w-4 transform rotate-90 transition-transform" /> : 
                          <ArrowRight className="h-4 w-4 transition-transform" />
                        }
                        <h3 className="text-lg font-semibold">{platformNode.platform.name}</h3>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{platformNode.stats.totalModules} 个模块</span>
                      <span>{platformNode.stats.totalItems} 个功能</span>
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={platformNode.stats.completionRate} 
                          className="w-20" 
                        />
                        <span>{platformNode.stats.completionRate}%</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* 模块级别 */}
                  {expandedPlatforms.has(platformNode.platform.id) && (
                    <div className="border-t bg-gray-50/50">
                      {platformNode.modules.map((moduleNode) => (
                        <div key={moduleNode.module.id}>
                          <div 
                            className="flex items-center justify-between p-4 pl-12 cursor-pointer hover:bg-gray-100/50 transition-colors"
                            onClick={() => toggleModule(moduleNode.module.id)}
                          >
                            <div className="flex items-center gap-2">
                              {expandedModules.has(moduleNode.module.id) ? 
                                <ArrowRight className="h-3 w-3 transform rotate-90 transition-transform" /> : 
                                <ArrowRight className="h-3 w-3 transition-transform" />
                              }
                              <h4 className="font-medium">{moduleNode.module.name}</h4>
                              {moduleNode.module.description && (
                                <span className="text-sm text-muted-foreground">
                                  - {moduleNode.module.description}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{moduleNode.stats.totalItems} 个功能</span>
                              <div className="flex items-center gap-2">
                                <Progress 
                                  value={moduleNode.stats.completionRate} 
                                  className="w-16" 
                                />
                                <span>{moduleNode.stats.completionRate}%</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* 功能点级别 */}
                          {expandedModules.has(moduleNode.module.id) && (
                            <div className="border-t bg-white">
                              {getFilteredFeatureItems(moduleNode.featureItems).map((item) => (
                                <div 
                                  key={item.id} 
                                  className="p-4 pl-20 border-b last:border-b-0 hover:bg-gray-50 transition-colors"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <h5 className="font-medium">{item.name}</h5>
                                        <Badge className={priorityColors[item.priority]}>
                                          {item.priority === 'critical' ? '关键' :
                                           item.priority === 'high' ? '高' :
                                           item.priority === 'medium' ? '中' : '低'}
                                        </Badge>
                                        <Badge className={statusColors[item.status]}>
                                          {statusLabels[item.status]}
                                        </Badge>
                                      </div>
                                      {item.description && (
                                        <p className="text-sm text-muted-foreground mb-2">
                                          {item.description}
                                        </p>
                                      )}
                                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                        {item.assignee && (
                                          <div className="flex items-center gap-1">
                                            <User className="h-3 w-3" />
                                            {item.assignee}
                                          </div>
                                        )}
                                        {item.estimated_completion_date && (
                                          <div className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {new Date(item.estimated_completion_date).toLocaleDateString()}
                                          </div>
                                        )}
                                        {item.estimated_hours && (
                                          <div className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            预计 {item.estimated_hours}h
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 ml-4">
                                      <Progress value={item.progress_percentage} className="w-20" />
                                      <span className="text-sm min-w-[3rem] text-right">
                                        {item.progress_percentage}%
                                      </span>
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" className="h-8 w-8 p-0">
                                            <MoreVertical className="h-4 w-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem onClick={() => handleEditFeatureItem(item)}>
                                            <Edit className="h-4 w-4 mr-2" />
                                            编辑
                                          </DropdownMenuItem>
                                          <WithAdminAuth actionName="删除功能项">
                                            <DropdownMenuItem 
                                              className="text-red-600"
                                              onClick={() => handleDeleteFeatureItem(item)}
                                            >
                                              <Trash2 className="h-4 w-4 mr-2" />
                                              删除
                                            </DropdownMenuItem>
                                          </WithAdminAuth>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  </div>
                                  {item.notes && (
                                    <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                                      <strong>备注：</strong> {item.notes}
                                    </div>
                                  )}
                                </div>
                              ))}
                              {getFilteredFeatureItems(moduleNode.featureItems).length === 0 && (
                                <div className="p-4 pl-20 text-center text-sm text-muted-foreground">
                                  没有符合条件的功能点
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Import Modal */}
      <DataImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onSuccess={handleImportSuccess}
      />

      {/* Feature Edit Modal */}
      <FeatureEditModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        featureItem={selectedFeatureItem}
        onSuccess={handleEditSuccess}
      />
      </div>
    </div>
  )
}