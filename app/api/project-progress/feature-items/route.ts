import { NextRequest, NextResponse } from 'next/server'
import { featureItemDB, featureModuleDB, progressRecordDB } from '@/lib/database'

// 获取功能点列表或单个功能点
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const moduleId = searchParams.get('moduleId')
    const id = searchParams.get('id')
    const phase = searchParams.get('phase')

    // 如果提供了id，返回单个功能点
    if (id) {
      const featureItem = featureItemDB.findById(parseInt(id))
      if (!featureItem) {
        return NextResponse.json({
          success: false,
          error: '功能点不存在'
        }, { status: 404 })
      }

      // 获取功能点的模块信息
      const module = featureModuleDB.findById(featureItem.module_id)
      
      return NextResponse.json({
        success: true,
        data: {
          ...featureItem,
          module
        }
      })
    }

    let featureItems
    if (projectId) {
      if (phase && phase !== 'all') {
        // 按项目和期筛选功能点
        featureItems = featureItemDB.findByProjectAndPhase(parseInt(projectId), phase)
      } else {
        featureItems = featureItemDB.findByProjectId(parseInt(projectId))
      }
    } else if (moduleId) {
      featureItems = featureItemDB.findByModuleId(parseInt(moduleId))
    } else {
      return NextResponse.json({
        success: false,
        error: '需要提供 id、projectId 或 moduleId'
      }, { status: 400 })
    }

    // 获取功能点的模块信息
    const featureItemsWithModule = featureItems.map(item => {
      const module = featureModuleDB.findById(item.module_id)
      return {
        ...item,
        module
      }
    })

    return NextResponse.json({
      success: true,
      data: featureItemsWithModule
    })
  } catch (error) {
    console.error('获取功能点失败:', error)
    return NextResponse.json({
      success: false,
      error: '获取功能点失败'
    }, { status: 500 })
  }
}

// 创建新功能点
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      module_id,
      name,
      description,
      priority = 'medium',
      status = 'pending',
      progress_percentage = 0,
      estimated_hours,
      actual_hours,
      assignee,
      start_date,
      estimated_completion_date,
      actual_completion_date,
      notes
    } = body

    if (!module_id || !name) {
      return NextResponse.json({
        success: false,
        error: '模块ID和功能点名称不能为空'
      }, { status: 400 })
    }

    const featureItemId = featureItemDB.insertItem({
      module_id,
      name,
      description,
      priority,
      status,
      progress_percentage,
      estimated_hours,
      actual_hours,
      assignee,
      start_date,
      estimated_completion_date,
      actual_completion_date,
      notes
    })

    // 记录初始进度
    progressRecordDB.insertRecord({
      feature_item_id: featureItemId,
      new_status: status,
      new_progress: progress_percentage,
      notes: '功能点创建',
      updated_by: 'system'
    })

    const newFeatureItem = featureItemDB.findById(featureItemId)

    return NextResponse.json({
      success: true,
      data: newFeatureItem
    })
  } catch (error) {
    console.error('创建功能点失败:', error)
    return NextResponse.json({
      success: false,
      error: '创建功能点失败'
    }, { status: 500 })
  }
}

// 更新功能点（完整编辑）
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      id, 
      name, 
      description, 
      priority, 
      status, 
      progress_percentage, 
      estimated_hours, 
      actual_hours, 
      assignee, 
      start_date, 
      estimated_completion_date, 
      actual_completion_date, 
      notes 
    } = body

    if (!id) {
      return NextResponse.json({
        success: false,
        error: '功能点ID不能为空'
      }, { status: 400 })
    }

    // 检查功能点是否存在
    const existingItem = featureItemDB.findById(id)
    if (!existingItem) {
      return NextResponse.json({
        success: false,
        error: '功能点不存在'
      }, { status: 404 })
    }

    // 如果只是更新进度，使用原有方法
    if (Object.keys(body).length <= 4 && 'status' in body && 'progress_percentage' in body) {
      const success = featureItemDB.updateProgress(id, status, progress_percentage, notes)
      
      if (!success) {
        return NextResponse.json({
          success: false,
          error: '更新功能点失败'
        }, { status: 500 })
      }
    } else {
      // 完整编辑功能点
      if (!name || !name.trim()) {
        return NextResponse.json({
          success: false,
          error: '功能点名称不能为空'
        }, { status: 400 })
      }

      // 获取数据库连接直接更新
      const db = featureItemDB['db']
      const stmt = db.prepare(`
        UPDATE feature_items 
        SET name = ?, description = ?, priority = ?, status = ?, progress_percentage = ?, 
            estimated_hours = ?, actual_hours = ?, assignee = ?, start_date = ?, 
            estimated_completion_date = ?, actual_completion_date = ?, notes = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
      
      const result = stmt.run(
        name.trim(),
        description?.trim() || null,
        priority || 'medium',
        status || 'pending',
        Math.max(0, Math.min(100, progress_percentage || 0)),
        estimated_hours ? parseFloat(estimated_hours) : null,
        actual_hours ? parseFloat(actual_hours) : null,
        assignee?.trim() || null,
        start_date || null,
        estimated_completion_date || null,
        actual_completion_date || null,
        notes?.trim() || null,
        id
      )

      if (result.changes === 0) {
        return NextResponse.json({
          success: false,
          error: '更新功能点失败'
        }, { status: 500 })
      }

      // 记录编辑历史
      if (status !== existingItem.status || progress_percentage !== existingItem.progress_percentage) {
        progressRecordDB.insertRecord({
          feature_item_id: id,
          old_status: existingItem.status,
          new_status: status || existingItem.status,
          old_progress: existingItem.progress_percentage,
          new_progress: progress_percentage || existingItem.progress_percentage,
          notes: '功能点编辑更新',
          updated_by: 'user'
        })
      }
    }

    const updatedFeatureItem = featureItemDB.findById(id)

    return NextResponse.json({
      success: true,
      message: '功能点更新成功',
      data: updatedFeatureItem
    })
  } catch (error) {
    console.error('更新功能点失败:', error)
    return NextResponse.json({
      success: false,
      error: '更新功能点失败'
    }, { status: 500 })
  }
}

// 删除功能点
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({
        success: false,
        error: '功能点ID不能为空'
      }, { status: 400 })
    }

    // 检查功能点是否存在
    const existingItem = featureItemDB.findById(parseInt(id))
    if (!existingItem) {
      return NextResponse.json({
        success: false,
        error: '功能点不存在'
      }, { status: 404 })
    }

    // 删除功能点
    const db = featureItemDB['db']
    
    // 先删除相关的进度记录
    const deleteProgressStmt = db.prepare('DELETE FROM progress_records WHERE feature_item_id = ?')
    deleteProgressStmt.run(parseInt(id))
    
    // 删除功能点
    const deleteItemStmt = db.prepare('DELETE FROM feature_items WHERE id = ?')
    const result = deleteItemStmt.run(parseInt(id))

    if (result.changes === 0) {
      return NextResponse.json({
        success: false,
        error: '删除功能点失败'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: '功能点删除成功'
    })

  } catch (error) {
    console.error('删除功能点失败:', error)
    return NextResponse.json({
      success: false,
      error: '删除功能点失败'
    }, { status: 500 })
  }
}