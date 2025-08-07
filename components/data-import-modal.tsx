"use client"

import React, { useState, useEffect } from "react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { 
  Copy, 
  Upload, 
  CheckCircle, 
  AlertTriangle,
  Download,
  FileText,
  Plus,
  Trash2
} from "lucide-react"

interface DataImportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

// JSON数据模板 - 支持多平台一次性导入
const getExampleData = (phaseName: string) => ({
  phase: {
    name: phaseName,
    description: `${phaseName}开发阶段`,
    status: "in_progress"
  },
  platforms: [
    {
      name: "采购端网页",
      description: "采购端网页系统",
      modules: [
        {
          name: "供应商管理",
          description: "供应商注册、认证、资质审核等功能"
        },
        {
          name: "采购订单管理", 
          description: "采购需求发布、订单创建、订单跟踪等功能"
        }
      ],
      featureItems: [
        {
          moduleName: "供应商管理",
          name: "供应商注册功能",
          description: "实现供应商在线注册和基本信息填写",
          priority: "high",
          status: "completed", 
          progress: 100,
          assignee: "张三",
          estimatedHours: 16,
          actualHours: 14,
          estimatedDate: "2025-01-15",
          actualDate: "2025-01-12",
          notes: "已完成开发和测试，正常上线"
        },
        {
          moduleName: "采购订单管理",
          name: "采购需求发布",
          description: "采购方发布采购需求和招标信息",
          priority: "medium",
          status: "in_progress",
          progress: 60,
          assignee: "李四",
          estimatedHours: 20,
          actualHours: 12,
          estimatedDate: "2025-01-25",
          notes: "开发中，进展正常"
        }
      ]
    },
    {
      name: "供应商网页",
      description: "供应商网页系统",
      modules: [
        {
          name: "供应商入驻",
          description: "供应商注册、资质提交、入驻审核等功能"
        },
        {
          name: "商品管理",
          description: "商品发布、库存管理、价格设置等功能"
        }
      ],
      featureItems: [
        {
          moduleName: "供应商入驻",
          name: "供应商注册",
          description: "实现供应商注册和基本信息填写",
          priority: "high",
          status: "pending",
          progress: 0,
          assignee: "王五",
          estimatedHours: 18,
          estimatedDate: "2025-02-01",
          notes: "等待采购端相关接口完成"
        },
        {
          moduleName: "商品管理",
          name: "商品发布功能",
          description: "实现供应商商品信息发布和管理",
          priority: "medium",
          status: "pending",
          progress: 0,
          assignee: "赵六",
          estimatedHours: 24,
          estimatedDate: "2025-02-10",
          notes: "待供应商入驻功能完成后开始"
        }
      ]
    },
    {
      name: "管理后台",
      description: "管理后台系统",
      modules: [
        {
          name: "用户权限管理",
          description: "系统用户、角色、权限管理功能"
        }
      ],
      featureItems: [
        {
          moduleName: "用户权限管理",
          name: "角色权限配置",
          description: "实现系统角色和权限的配置管理",
          priority: "high",
          status: "in_progress",
          progress: 40,
          assignee: "孙七",
          estimatedHours: 32,
          actualHours: 15,
          estimatedDate: "2025-02-15",
          notes: "权限模型设计完成，正在开发配置界面"
        }
      ]
    }
  ]
})

export function DataImportModal({ open, onOpenChange, onSuccess }: DataImportModalProps) {
  const [selectedPhase, setSelectedPhase] = useState("")
  const [availablePhases, setAvailablePhases] = useState<string[]>([])
  const [availablePlatforms, setAvailablePlatforms] = useState<any[]>([])
  const [newPhaseName, setNewPhaseName] = useState("")
  const [showNewPhaseInput, setShowNewPhaseInput] = useState(false)
  const [jsonInput, setJsonInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [jsonError, setJsonError] = useState("")
  const [importResult, setImportResult] = useState<any>(null)
  
  const { toast } = useToast()
  
  // 加载可用期数和平台
  useEffect(() => {
    if (open) {
      loadAvailablePhases()
      loadAvailablePlatforms()
    }
  }, [open])
  
  const loadAvailablePhases = async () => {
    try {
      const response = await fetch('/api/project-progress/phases/manage')
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setAvailablePhases(result.data)
          if (result.data.length > 0 && !selectedPhase) {
            setSelectedPhase(result.data[0])
          }
        }
      }
    } catch (error) {
      console.error('加载期数列表失败:', error)
    }
  }

  const loadAvailablePlatforms = async () => {
    try {
      const response = await fetch('/api/project-progress/platforms')
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setAvailablePlatforms(result.data)
        }
      }
    } catch (error) {
      console.error('加载平台列表失败:', error)
    }
  }

  const handleCreateNewPhase = async () => {
    if (!newPhaseName.trim()) {
      toast({
        title: "期数名称不能为空",
        variant: "destructive"
      })
      return
    }

    try {
      const response = await fetch('/api/project-progress/phases/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phaseName: newPhaseName.trim(),
          description: `${newPhaseName.trim()}开发阶段`
        })
      })

      const result = await response.json()
      if (result.success) {
        toast({
          title: "期数创建成功",
          description: result.message
        })
        setNewPhaseName("")
        setShowNewPhaseInput(false)
        await loadAvailablePhases()
        setSelectedPhase(newPhaseName.trim())
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('创建期数失败:', error)
      toast({
        title: "创建期数失败",
        description: (error as Error).message,
        variant: "destructive"
      })
    }
  }

  const handleDeletePhase = async (phaseName: string) => {
    if (!confirm(`确定要删除期数 "${phaseName}" 吗？这将删除所有相关数据。`)) {
      return
    }

    try {
      const response = await fetch(`/api/project-progress/phases/manage?phaseName=${encodeURIComponent(phaseName)}`, {
        method: 'DELETE'
      })

      const result = await response.json()
      if (result.success) {
        if (result.warning) {
          if (!confirm(result.warning + "\n\n确定继续删除吗？")) {
            return
          }
        }
        
        toast({
          title: "期数删除成功",
          description: result.message
        })
        await loadAvailablePhases()
        if (selectedPhase === phaseName) {
          setSelectedPhase(availablePhases[0] || "")
        }
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('删除期数失败:', error)
      toast({
        title: "删除期数失败",
        description: (error as Error).message,
        variant: "destructive"
      })
    }
  }
  const exampleData = selectedPhase ? 
    getExampleData(selectedPhase) : 
    getExampleData("示例期")
  const copyExampleData = async () => {
    try {
      const jsonString = JSON.stringify(exampleData, null, 2)
      await navigator.clipboard.writeText(jsonString)
      toast({
        title: "已复制示例数据",
        description: "请修改后粘贴到下方输入框",
      })
    } catch (error) {
      toast({
        title: "复制失败",
        description: "请手动复制示例数据",
        variant: "destructive"
      })
    }
  }

  const validateJson = (input: string) => {
    if (!input.trim()) {
      setJsonError("")
      return null
    }
    
    try {
      const parsed = JSON.parse(input)
      
      // 基本结构验证
      if (!parsed.phase || !parsed.phase.name) {
        setJsonError("缺少必需的phase.name字段")
        return null
      }
      
      if (!parsed.platforms || !Array.isArray(parsed.platforms) || parsed.platforms.length === 0) {
        setJsonError("缺少platforms数组或platforms为空")
        return null
      }
      
      // 验证每个平台的数据
      for (let i = 0; i < parsed.platforms.length; i++) {
        const platform = parsed.platforms[i]
        
        if (!platform.name) {
          setJsonError(`平台${i + 1}缺少name字段`)
          return null
        }
        
        // 验证模块数据
        if (!platform.modules || !Array.isArray(platform.modules)) {
          setJsonError(`平台"${platform.name}"缺少modules数组`)
          return null
        }
        
        for (let j = 0; j < platform.modules.length; j++) {
          const module = platform.modules[j]
          if (!module.name) {
            setJsonError(`平台"${platform.name}"的模块${j + 1}缺少name字段`)
            return null
          }
        }
        
        // 验证功能点数据
        if (!platform.featureItems || !Array.isArray(platform.featureItems)) {
          setJsonError(`平台"${platform.name}"缺少featureItems数组`)
          return null
        }
        
        for (let k = 0; k < platform.featureItems.length; k++) {
          const item = platform.featureItems[k]
          if (!item.name || !item.moduleName) {
            setJsonError(`平台"${platform.name}"的功能点${k + 1}缺少name或moduleName字段`)
            return null
          }
          
          // 验证moduleName是否存在于该平台的modules中
          const moduleExists = platform.modules.some((m: any) => m.name === item.moduleName)
          if (!moduleExists) {
            setJsonError(`平台"${platform.name}"的功能点"${item.name}"引用的模块"${item.moduleName}"不存在`)
            return null
          }
        }
      }
      
      setJsonError("")
      return parsed
    } catch (error) {
      setJsonError("JSON格式错误：" + (error as Error).message)
      return null
    }
  }

  const handleJsonChange = (value: string) => {
    setJsonInput(value)
    validateJson(value)
  }

  const handleImport = async () => {
    const parsedData = validateJson(jsonInput)
    if (!parsedData) {
      toast({
        title: "数据验证失败",
        description: jsonError,
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    try {
      const results = []
      
      // 为每个平台创建项目并导入数据
      for (const platformData of parsedData.platforms) {
        // 首先确保平台存在，如果不存在则创建
        const platformResponse = await fetch('/api/project-progress/platforms', {
          method: 'GET'
        })
        const platformResult = await platformResponse.json()
        let platformId = null
        
        if (platformResult.success) {
          const existingPlatform = platformResult.data.find((p: any) => p.name === platformData.name)
          if (existingPlatform) {
            platformId = existingPlatform.id
          } else {
            // 创建新平台
            const createPlatformResponse = await fetch('/api/project-progress/platforms', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                name: platformData.name,
                description: platformData.description || `${platformData.name}系统`,
                color: `#${Math.floor(Math.random()*16777215).toString(16)}`
              })
            })
            const createResult = await createPlatformResponse.json()
            if (createResult.success) {
              platformId = createResult.data.id
            }
          }
        }

        // 构造项目数据
        const projectData = {
          project: {
            name: `${platformData.name} - ${parsedData.phase.name}`,
            description: parsedData.phase.description,
            platform_id: platformId,
            status: "active"
          },
          phases: [{
            originalId: "phase1",
            name: parsedData.phase.name,
            description: parsedData.phase.description,
            phase_order: 1,
            status: parsedData.phase.status || "in_progress"
          }],
          modules: platformData.modules.map((module: any, index: number) => ({
            originalId: `module${index + 1}`,
            name: module.name,
            description: module.description,
            phaseId: "phase1",
            module_order: index + 1
          })),
          featureItems: platformData.featureItems.map((item: any) => ({
            name: item.name,
            description: item.description,
            moduleId: `module${platformData.modules.findIndex((m: any) => m.name === item.moduleName) + 1}`,
            priority: item.priority || "medium",
            status: item.status || "pending",
            progress_percentage: item.progress || 0,
            estimated_hours: item.estimatedHours,
            actual_hours: item.actualHours,
            assignee: item.assignee,
            start_date: item.startDate,
            estimated_completion_date: item.estimatedDate,
            actual_completion_date: item.actualDate,
            notes: item.notes
          }))
        }

        // 导入当前平台的项目数据
        const response = await fetch('/api/project-progress/import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ projectData })
        })

        const result = await response.json()
        if (result.success) {
          results.push({
            platformName: platformData.name,
            result: result
          })
        } else {
          throw new Error(`导入平台 "${platformData.name}" 失败：${result.error}`)
        }
      }

      // 计算总的导入统计
      const totalStats = results.reduce((acc, r) => ({
        projectsImported: acc.projectsImported + (r.result.data.stats.projectsImported || 0),
        phasesImported: acc.phasesImported + (r.result.data.stats.phasesImported || 0),
        modulesImported: acc.modulesImported + (r.result.data.stats.modulesImported || 0),
        featureItemsImported: acc.featureItemsImported + (r.result.data.stats.featureItemsImported || 0)
      }), {
        projectsImported: 0,
        phasesImported: 0,
        modulesImported: 0,
        featureItemsImported: 0
      })

      setImportResult({
        success: true,
        message: `成功导入 ${results.length} 个平台的数据`,
        data: {
          stats: totalStats,
          platforms: results.map(r => r.platformName)
        }
      })

      toast({
        title: "导入成功",
        description: `成功导入 ${results.length} 个平台的项目数据`,
      })
      
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error('导入失败:', error)
      toast({
        title: "导入失败",
        description: (error as Error).message,
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setJsonInput("")
    setJsonError("")
    setImportResult(null)
    setNewPhaseName("")
    setShowNewPhaseInput(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            项目数据导入
          </DialogTitle>
          <DialogDescription>
            选择开发期，复制示例数据并修改为您的实际项目数据后导入。支持一次性导入多个平台的完整数据。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">

          {/* 期选择和管理 */}
          <div className="space-y-2">
            <Label htmlFor="phase-select">选择开发期</Label>
            <div className="flex items-center gap-2">
              <Select value={selectedPhase} onValueChange={setSelectedPhase}>
                <SelectTrigger id="phase-select" className="flex-1">
                  <SelectValue placeholder="选择期数" />
                </SelectTrigger>
                <SelectContent>
                  {availablePhases.map(phase => (
                    <SelectItem key={phase} value={phase}>
                      <div className="flex items-center justify-between w-full">
                        <span>{phase}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowNewPhaseInput(!showNewPhaseInput)}
              >
                <Plus className="h-4 w-4" />
              </Button>
              
              {selectedPhase && availablePhases.length > 1 && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleDeletePhase(selectedPhase)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            {/* 新增期数输入框 */}
            {showNewPhaseInput && (
              <div className="flex items-center gap-2 mt-2">
                <Input
                  placeholder="例如：第二.五期"
                  value={newPhaseName}
                  onChange={(e) => setNewPhaseName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateNewPhase()
                    }
                  }}
                />
                <Button size="sm" onClick={handleCreateNewPhase}>
                  创建
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setShowNewPhaseInput(false)
                    setNewPhaseName("")
                  }}
                >
                  取消
                </Button>
              </div>
            )}
          </div>

          {/* 示例数据 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>JSON数据示例</Label>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={copyExampleData}
                className="flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                复制示例
              </Button>
            </div>
            <div className="bg-gray-50 p-4 rounded-md max-h-64 overflow-y-auto">
              <pre className="text-sm">
                {JSON.stringify(exampleData, null, 2)}
              </pre>
            </div>
          </div>

          {/* 用户输入区域 */}
          <div className="space-y-2">
            <Label htmlFor="json-input">请粘贴您的项目数据（JSON格式）</Label>
            <Textarea
              id="json-input"
              placeholder="请粘贴修改后的JSON数据..."
              value={jsonInput}
              onChange={(e) => handleJsonChange(e.target.value)}
              rows={12}
              className="font-mono text-sm"
            />
            
            {/* JSON验证错误提示 */}
            {jsonError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{jsonError}</AlertDescription>
              </Alert>
            )}
            
            {/* JSON验证成功提示 */}
            {jsonInput && !jsonError && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>JSON格式验证通过</AlertDescription>
              </Alert>
            )}
          </div>

          {/* 导入结果 */}
          {importResult && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div>导入成功！</div>
                  {importResult.data.platforms && (
                    <div className="text-sm text-muted-foreground">
                      导入平台: {importResult.data.platforms.join('、')}
                    </div>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="secondary">
                      项目: {importResult.data.stats.projectsImported}
                    </Badge>
                    <Badge variant="secondary">
                      阶段: {importResult.data.stats.phasesImported}
                    </Badge>
                    <Badge variant="secondary">
                      模块: {importResult.data.stats.modulesImported}
                    </Badge>
                    <Badge variant="secondary">
                      功能点: {importResult.data.stats.featureItemsImported}
                    </Badge>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            取消
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={!jsonInput || !!jsonError || isLoading}
          >
            {isLoading ? "导入中..." : "导入数据"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}