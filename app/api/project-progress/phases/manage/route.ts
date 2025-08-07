import { NextRequest, NextResponse } from 'next/server'
import { projectPhaseDB, projectDB } from '@/lib/database'

// 获取所有唯一的期数名称
export async function GET() {
  try {
    // 查询所有项目的所有阶段，获取唯一期数名称
    const allProjects = projectDB.findAll()
    const uniquePhases = new Set<string>()
    
    for (const project of allProjects) {
      const phases = projectPhaseDB.findByProjectId(project.id!)
      phases.forEach(phase => {
        if (phase.name) {
          uniquePhases.add(phase.name)
        }
      })
    }
    
    // 转换为数组并排序
    const sortedPhases = Array.from(uniquePhases).sort((a, b) => {
      // 提取数字进行排序（如"第一期" -> 1）
      const numA = parseInt(a.replace(/\D/g, '')) || 999
      const numB = parseInt(b.replace(/\D/g, '')) || 999
      return numA - numB
    })

    return NextResponse.json({
      success: true,
      data: sortedPhases
    })
  } catch (error) {
    console.error('获取期数列表失败:', error)
    return NextResponse.json({
      success: false,
      error: '获取期数列表失败'
    }, { status: 500 })
  }
}

// 创建新的期数模板项目
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phaseName, description } = body

    if (!phaseName || !phaseName.trim()) {
      return NextResponse.json({
        success: false,
        error: '期数名称不能为空'
      }, { status: 400 })
    }

    // 创建一个模板项目用于这个期数
    const projectId = projectDB.insertProject({
      name: `${phaseName} - 模板项目`,
      description: description || `${phaseName}开发阶段`,
      status: 'active'
    })

    // 创建对应的项目阶段
    const phaseId = projectPhaseDB.insertPhase({
      project_id: projectId,
      name: phaseName,
      description: description || `${phaseName}开发阶段`,
      phase_order: 1,
      status: 'pending'
    })

    return NextResponse.json({
      success: true,
      message: `期数 "${phaseName}" 创建成功`,
      data: {
        projectId,
        phaseId,
        phaseName
      }
    })
  } catch (error) {
    console.error('创建期数失败:', error)
    return NextResponse.json({
      success: false,
      error: '创建期数失败'
    }, { status: 500 })
  }
}

// 删除期数（删除所有相关数据）
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const phaseName = searchParams.get('phaseName')

    if (!phaseName) {
      return NextResponse.json({
        success: false,
        error: '需要提供期数名称'
      }, { status: 400 })
    }

    // 查找所有包含此期数的项目
    const allProjects = projectDB.findAll()
    let deletedCount = 0
    
    for (const project of allProjects) {
      const phases = projectPhaseDB.findByProjectId(project.id!)
      const targetPhase = phases.find(p => p.name === phaseName)
      
      if (targetPhase) {
        // 注意：这里只是标记为删除概念，实际上我们需要一个更复杂的删除逻辑
        // 由于外键约束，我们需要按顺序删除：功能点 -> 功能模块 -> 项目阶段 -> 项目
        // 为了安全起见，这里只返回警告，让用户确认
        deletedCount++
      }
    }

    if (deletedCount === 0) {
      return NextResponse.json({
        success: false,
        error: `未找到期数 "${phaseName}"`
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: `找到 ${deletedCount} 个项目包含期数 "${phaseName}"`,
      data: {
        phaseName,
        affectedProjects: deletedCount
      },
      warning: '删除期数将删除所有相关的项目、模块和功能点数据，请确认此操作'
    })
  } catch (error) {
    console.error('删除期数失败:', error)
    return NextResponse.json({
      success: false,
      error: '删除期数失败'
    }, { status: 500 })
  }
}