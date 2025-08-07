import { NextRequest, NextResponse } from 'next/server'
import { projectPhaseDB } from '@/lib/database'

// 获取项目阶段列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({
        success: false,
        error: '需要提供 projectId'
      }, { status: 400 })
    }

    const phases = projectPhaseDB.findByProjectId(parseInt(projectId))

    return NextResponse.json({
      success: true,
      data: phases
    })
  } catch (error) {
    console.error('获取项目阶段失败:', error)
    return NextResponse.json({
      success: false,
      error: '获取项目阶段失败'
    }, { status: 500 })
  }
}

// 创建项目阶段
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      project_id,
      name,
      description,
      phase_order,
      status = 'pending',
      start_date,
      end_date
    } = body

    if (!project_id || !name || !phase_order) {
      return NextResponse.json({
        success: false,
        error: '项目ID、阶段名称和排序不能为空'
      }, { status: 400 })
    }

    const phaseId = projectPhaseDB.insertPhase({
      project_id,
      name,
      description,
      phase_order,
      status,
      start_date,
      end_date
    })

    const newPhase = projectPhaseDB.findById(phaseId)

    return NextResponse.json({
      success: true,
      data: newPhase
    })
  } catch (error) {
    console.error('创建项目阶段失败:', error)
    return NextResponse.json({
      success: false,
      error: '创建项目阶段失败'
    }, { status: 500 })
  }
}