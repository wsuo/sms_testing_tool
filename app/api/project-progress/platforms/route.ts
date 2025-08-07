import { NextRequest, NextResponse } from 'next/server'
import { platformDB } from '@/lib/database'

// 获取所有平台
export async function GET() {
  try {
    const platforms = platformDB.findAll()

    return NextResponse.json({
      success: true,
      data: platforms
    })
  } catch (error) {
    console.error('获取平台列表失败:', error)
    return NextResponse.json({
      success: false,
      error: '获取平台列表失败'
    }, { status: 500 })
  }
}

// 创建新平台
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, color = '#3b82f6' } = body

    if (!name || !name.trim()) {
      return NextResponse.json({
        success: false,
        error: '平台名称不能为空'
      }, { status: 400 })
    }

    // 检查平台名称是否已存在
    if (platformDB.exists(name.trim())) {
      return NextResponse.json({
        success: false,
        error: '平台名称已存在'
      }, { status: 400 })
    }

    const platformId = platformDB.insertPlatform({
      name: name.trim(),
      description: description?.trim() || null,
      color: color || '#3b82f6',
      status: 'active'
    })

    const newPlatform = platformDB.findById(platformId)

    return NextResponse.json({
      success: true,
      message: `平台 "${name.trim()}" 创建成功`,
      data: newPlatform
    })
  } catch (error) {
    console.error('创建平台失败:', error)
    return NextResponse.json({
      success: false,
      error: '创建平台失败'
    }, { status: 500 })
  }
}

// 更新平台
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, description, color, status } = body

    if (!id) {
      return NextResponse.json({
        success: false,
        error: '平台ID不能为空'
      }, { status: 400 })
    }

    // 检查平台是否存在
    const existingPlatform = platformDB.findById(id)
    if (!existingPlatform) {
      return NextResponse.json({
        success: false,
        error: '平台不存在'
      }, { status: 404 })
    }

    // 如果要更新名称，检查是否与其他平台重名
    if (name && name.trim() !== existingPlatform.name) {
      if (platformDB.exists(name.trim(), id)) {
        return NextResponse.json({
          success: false,
          error: '平台名称已存在'
        }, { status: 400 })
      }
    }

    const updates: any = {}
    if (name !== undefined) updates.name = name.trim()
    if (description !== undefined) updates.description = description?.trim() || null
    if (color !== undefined) updates.color = color
    if (status !== undefined) updates.status = status

    const success = platformDB.updatePlatform(id, updates)
    
    if (!success) {
      return NextResponse.json({
        success: false,
        error: '更新平台失败'
      }, { status: 500 })
    }

    const updatedPlatform = platformDB.findById(id)

    return NextResponse.json({
      success: true,
      message: '平台更新成功',
      data: updatedPlatform
    })
  } catch (error) {
    console.error('更新平台失败:', error)
    return NextResponse.json({
      success: false,
      error: '更新平台失败'
    }, { status: 500 })
  }
}

// 删除平台（软删除）
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({
        success: false,
        error: '需要提供平台ID'
      }, { status: 400 })
    }

    const platformId = parseInt(id)
    const platform = platformDB.findById(platformId)
    
    if (!platform) {
      return NextResponse.json({
        success: false,
        error: '平台不存在'
      }, { status: 404 })
    }

    // 检查是否有项目使用此平台
    const projects = require('@/lib/database').projectDB.findByPlatformId(platformId)
    if (projects.length > 0) {
      return NextResponse.json({
        success: false,
        error: `无法删除平台，还有 ${projects.length} 个项目正在使用此平台`,
        warning: '请先将相关项目转移到其他平台或删除这些项目'
      }, { status: 400 })
    }

    const success = platformDB.deletePlatform(platformId)
    
    if (!success) {
      return NextResponse.json({
        success: false,
        error: '删除平台失败'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `平台 "${platform.name}" 删除成功`
    })
  } catch (error) {
    console.error('删除平台失败:', error)
    return NextResponse.json({
      success: false,
      error: '删除平台失败'
    }, { status: 500 })
  }
}