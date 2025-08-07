import { NextRequest, NextResponse } from 'next/server'
import { projectDB, featureItemDB } from '@/lib/database'

// 获取项目进度统计信息
export async function GET(request: NextRequest) {
  try {
    // 获取查询参数
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (projectId) {
      // 获取特定项目的详细统计
      const projectIdNum = parseInt(projectId)
      const stats = featureItemDB.getProjectStats(projectIdNum)
      const project = projectDB.findById(projectIdNum)
      
      if (!project) {
        return NextResponse.json({
          success: false,
          error: '项目不存在'
        }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        data: {
          project,
          stats
        }
      })
    } else {
      // 获取所有项目的汇总统计
      const projects = projectDB.findAll()
      const allStats = projects.map(project => ({
        project,
        stats: featureItemDB.getProjectStats(project.id!)
      }))

      const totalStats = {
        totalProjects: projects.length,
        activeProjects: projects.filter(p => p.status === 'active').length,
        totalItems: allStats.reduce((sum, s) => sum + s.stats.totalItems, 0),
        completedItems: allStats.reduce((sum, s) => sum + s.stats.completedItems, 0),
        inProgressItems: allStats.reduce((sum, s) => sum + s.stats.inProgressItems, 0),
        pendingItems: allStats.reduce((sum, s) => sum + s.stats.pendingItems, 0)
      }

      const overallCompletionRate = totalStats.totalItems > 0 
        ? Math.round((totalStats.completedItems / totalStats.totalItems) * 100) 
        : 0

      return NextResponse.json({
        success: true,
        data: {
          totalStats: {
            ...totalStats,
            completionRate: overallCompletionRate
          },
          projects: allStats
        }
      })
    }
  } catch (error) {
    console.error('获取项目进度统计失败:', error)
    return NextResponse.json({
      success: false,
      error: '获取项目进度统计失败'
    }, { status: 500 })
  }
}