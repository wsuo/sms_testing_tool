import { NextRequest, NextResponse } from 'next/server'
import { 
  projectDB, 
  projectPhaseDB, 
  featureModuleDB, 
  featureItemDB 
} from '@/lib/database'

// JSON数据导入
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectData } = body

    if (!projectData || !projectData.project) {
      return NextResponse.json({
        success: false,
        error: '无效的项目数据格式'
      }, { status: 400 })
    }

    const { project, phases = [], modules = [], featureItems = [] } = projectData

    let importStats = {
      projectsImported: 0,
      phasesImported: 0,
      modulesImported: 0,
      featureItemsImported: 0,
      errors: [] as string[]
    }

    // 导入项目
    try {
      const projectId = projectDB.insertProject({
        name: project.name,
        description: project.description || null,
        platform_id: project.platform_id || null,
        status: project.status || 'active',
        start_date: project.start_date || null,
        end_date: project.end_date || null
      })
      importStats.projectsImported = 1

      // 导入阶段
      const phaseIdMap = new Map<string, number>() // originalId -> newId
      for (const phase of phases) {
        try {
          const phaseId = projectPhaseDB.insertPhase({
            project_id: projectId,
            name: phase.name,
            description: phase.description || null,
            phase_order: phase.phase_order || 1,
            status: phase.status || 'pending',
            start_date: phase.start_date || null,
            end_date: phase.end_date || null
          })
          phaseIdMap.set(phase.originalId || phase.name, phaseId)
          importStats.phasesImported++
        } catch (error) {
          importStats.errors.push(`导入阶段 "${phase.name}" 失败: ${error}`)
        }
      }

      // 导入模块
      const moduleIdMap = new Map<string, number>() // originalId -> newId
      for (const module of modules) {
        try {
          const phaseId = module.phaseId ? phaseIdMap.get(module.phaseId) : null
          const moduleId = featureModuleDB.insertModule({
            project_id: projectId,
            phase_id: phaseId || null,
            name: module.name,
            description: module.description || null,
            module_order: module.module_order || null
          })
          moduleIdMap.set(module.originalId || module.name, moduleId)
          importStats.modulesImported++
        } catch (error) {
          importStats.errors.push(`导入模块 "${module.name}" 失败: ${error}`)
        }
      }

      // 导入功能点
      for (const item of featureItems) {
        try {
          const moduleId = moduleIdMap.get(item.moduleId)
          if (!moduleId) {
            importStats.errors.push(`功能点 "${item.name}" 的模块不存在`)
            continue
          }

          featureItemDB.insertItem({
            module_id: moduleId,
            name: item.name,
            description: item.description || null,
            priority: item.priority || 'medium',
            status: item.status || 'pending',
            progress_percentage: item.progress_percentage || 0,
            estimated_hours: item.estimated_hours || null,
            actual_hours: item.actual_hours || null,
            assignee: item.assignee || null,
            start_date: item.start_date || null,
            estimated_completion_date: item.estimated_completion_date || null,
            actual_completion_date: item.actual_completion_date || null,
            notes: item.notes || null
          })
          importStats.featureItemsImported++
        } catch (error) {
          importStats.errors.push(`导入功能点 "${item.name}" 失败: ${error}`)
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          projectId,
          stats: importStats
        },
        message: `成功导入项目数据: 项目 ${importStats.projectsImported} 个, 阶段 ${importStats.phasesImported} 个, 模块 ${importStats.modulesImported} 个, 功能点 ${importStats.featureItemsImported} 个`
      })

    } catch (error) {
      console.error('导入项目数据失败:', error)
      return NextResponse.json({
        success: false,
        error: '导入项目数据失败: ' + error,
        stats: importStats
      }, { status: 500 })
    }

  } catch (error) {
    console.error('解析导入数据失败:', error)
    return NextResponse.json({
      success: false,
      error: '解析导入数据失败'
    }, { status: 400 })
  }
}

// 获取导入数据模板
export async function GET() {
  const template = {
    project: {
      name: "示例项目",
      description: "这是一个示例项目的描述",
      status: "active", // active, completed, paused
      start_date: "2025-01-01",
      end_date: "2025-12-31"
    },
    phases: [
      {
        originalId: "phase1",
        name: "第一期",
        description: "第一期开发阶段",
        phase_order: 1,
        status: "in_progress", // pending, in_progress, completed
        start_date: "2025-01-01",
        end_date: "2025-06-30"
      },
      {
        originalId: "phase2",
        name: "第二期",
        description: "第二期开发阶段",
        phase_order: 2,
        status: "pending",
        start_date: "2025-07-01",
        end_date: "2025-12-31"
      }
    ],
    modules: [
      {
        originalId: "module1",
        name: "用户管理",
        description: "用户注册、登录、权限管理",
        phaseId: "phase1",
        module_order: 1
      },
      {
        originalId: "module2",
        name: "数据分析",
        description: "数据统计和分析功能",
        phaseId: "phase2",
        module_order: 2
      }
    ],
    featureItems: [
      {
        name: "用户注册功能",
        description: "实现用户注册表单和验证",
        moduleId: "module1",
        priority: "high", // low, medium, high, critical
        status: "completed", // pending, in_progress, completed, testing, deployed, paused
        progress_percentage: 100,
        estimated_hours: 8,
        actual_hours: 6,
        assignee: "张三",
        start_date: "2025-01-01",
        estimated_completion_date: "2025-01-15",
        actual_completion_date: "2025-01-12",
        notes: "已完成并测试通过"
      },
      {
        name: "用户登录功能",
        description: "实现用户登录验证和JWT",
        moduleId: "module1",
        priority: "high",
        status: "in_progress",
        progress_percentage: 70,
        estimated_hours: 6,
        actual_hours: 4,
        assignee: "李四",
        start_date: "2025-01-10",
        estimated_completion_date: "2025-01-20",
        notes: "进行中，预计按时完成"
      },
      {
        name: "数据可视化",
        description: "图表展示功能实现",
        moduleId: "module2",
        priority: "medium",
        status: "pending",
        progress_percentage: 0,
        estimated_hours: 12,
        assignee: "王五",
        start_date: "2025-07-01",
        estimated_completion_date: "2025-07-15",
        notes: "等待第一期完成后开始"
      }
    ]
  }

  return NextResponse.json({
    success: true,
    data: {
      template,
      description: "这是项目数据导入的JSON格式模板。请按照此格式准备您的项目数据。",
      usage: "发送POST请求到此端点，body格式为: { \"projectData\": { ...此模板内容 } }"
    }
  })
}