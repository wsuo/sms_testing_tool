import { NextRequest, NextResponse } from 'next/server'
import { projectDB } from '@/lib/database'

// 获取所有项目
export async function GET() {
  try {
    const projects = projectDB.findAll()
    
    return NextResponse.json({
      success: true,
      data: projects
    })
  } catch (error) {
    console.error('获取项目列表失败:', error)
    return NextResponse.json({
      success: false,
      error: '获取项目列表失败'
    }, { status: 500 })
  }
}

// 创建新项目
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, status = 'active', start_date, end_date } = body

    if (!name) {
      return NextResponse.json({
        success: false,
        error: '项目名称不能为空'
      }, { status: 400 })
    }

    const projectId = projectDB.insertProject({
      name,
      description,
      status,
      start_date,
      end_date
    })

    const newProject = projectDB.findById(projectId)

    return NextResponse.json({
      success: true,
      data: newProject
    })
  } catch (error) {
    console.error('创建项目失败:', error)
    return NextResponse.json({
      success: false,
      error: '创建项目失败'
    }, { status: 500 })
  }
}

// 更新项目
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({
        success: false,
        error: '项目ID不能为空'
      }, { status: 400 })
    }

    const success = projectDB.updateProject(id, updates)
    
    if (!success) {
      return NextResponse.json({
        success: false,
        error: '项目不存在或无更新内容'
      }, { status: 404 })
    }

    const updatedProject = projectDB.findById(id)

    return NextResponse.json({
      success: true,
      data: updatedProject
    })
  } catch (error) {
    console.error('更新项目失败:', error)
    return NextResponse.json({
      success: false,
      error: '更新项目失败'
    }, { status: 500 })
  }
}

// 删除项目
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({
        success: false,
        error: '项目ID不能为空'
      }, { status: 400 })
    }

    const success = projectDB.deleteProject(parseInt(id))
    
    if (!success) {
      return NextResponse.json({
        success: false,
        error: '项目不存在'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: '项目删除成功'
    })
  } catch (error) {
    console.error('删除项目失败:', error)
    return NextResponse.json({
      success: false,
      error: '删除项目失败'
    }, { status: 500 })
  }
}