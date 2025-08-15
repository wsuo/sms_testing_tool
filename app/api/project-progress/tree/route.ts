import { NextRequest, NextResponse } from 'next/server'
import { 
  platformDB, 
  projectDB, 
  projectPhaseDB, 
  featureModuleDB, 
  featureItemDB 
} from '@/lib/database'

// 获取树状数据结构：期数 -> 平台 -> 模块 -> 功能点
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const phaseName = searchParams.get('phase')
    
    let platformTree: any[] = []
    let stats = {
      totalPlatforms: 0,
      totalModules: 0,
      totalItems: 0,
      completedItems: 0,
      completionRate: 0
    }

    // 获取所有活跃平台
    const platforms = await platformDB.findAll()
    
    // 确保 platforms 是数组
    if (!Array.isArray(platforms)) {
      console.warn('platformDB.findAll() 返回的不是数组:', platforms)
      return NextResponse.json({
        success: true,
        data: {
          platformTree: [],
          stats: {
            totalPlatforms: 0,
            totalModules: 0,
            totalItems: 0,
            completedItems: 0,
            completionRate: 0
          }
        }
      })
    }
    
    stats.totalPlatforms = platforms.length

    for (const platform of platforms) {
      // 获取该平台的所有项目
      const projects = await projectDB.findByPlatformId(platform.id!)
      
      // 确保 projects 是数组
      if (!Array.isArray(projects)) {
        console.warn(`projectDB.findByPlatformId(${platform.id}) 返回的不是数组:`, projects)
        continue
      }
      
      let platformModules: any[] = []
      let platformStats = {
        totalModules: 0,
        totalItems: 0,
        completedItems: 0,
        completionRate: 0
      }

      for (const project of projects) {
        // 获取项目的阶段（期数）
        const phases = await projectPhaseDB.findByProjectId(project.id!)
        
        // 确保 phases 是数组
        if (!Array.isArray(phases)) {
          console.warn(`projectPhaseDB.findByProjectId(${project.id}) 返回的不是数组:`, phases)
          continue
        }
        
        // 如果指定了期数，只处理该期数的数据
        let targetPhases = phases
        if (phaseName && phaseName !== 'all') {
          targetPhases = phases.filter(phase => phase.name === phaseName)
        }

        for (const phase of targetPhases) {
          // 获取该阶段的模块
          const modules = await featureModuleDB.findByPhaseId(phase.id!)
          
          // 确保 modules 是数组
          if (!Array.isArray(modules)) {
            console.warn(`featureModuleDB.findByPhaseId(${phase.id}) 返回的不是数组:`, modules)
            continue
          }
          
          for (const module of modules) {
            // 获取模块的功能点
            const featureItems = await featureItemDB.findByModuleId(module.id!)
            
            // 确保 featureItems 是数组
            if (!Array.isArray(featureItems)) {
              console.warn(`featureItemDB.findByModuleId(${module.id}) 返回的不是数组:`, featureItems)
              continue
            }
            
            // 计算模块统计
            const completedItems = featureItems.filter(
              item => item.status === 'completed' || item.status === 'deployed'
            ).length
            
            const moduleStats = {
              totalItems: featureItems.length,
              completedItems,
              completionRate: featureItems.length > 0 
                ? Math.round((completedItems / featureItems.length) * 100) 
                : 0
            }

            platformModules.push({
              module,
              featureItems,
              stats: moduleStats
            })

            // 累计平台统计
            platformStats.totalItems += featureItems.length
            platformStats.completedItems += completedItems
          }

          platformStats.totalModules += modules.length
        }
      }

      // 计算平台完成率
      platformStats.completionRate = platformStats.totalItems > 0 
        ? Math.round((platformStats.completedItems / platformStats.totalItems) * 100) 
        : 0

      // 只有有数据的平台才加入结果
      if (platformModules.length > 0) {
        platformTree.push({
          platform,
          modules: platformModules,
          stats: platformStats
        })
      }

      // 累计总统计
      stats.totalModules += platformStats.totalModules
      stats.totalItems += platformStats.totalItems
      stats.completedItems += platformStats.completedItems
    }

    // 计算总完成率
    stats.completionRate = stats.totalItems > 0 
      ? Math.round((stats.completedItems / stats.totalItems) * 100) 
      : 0

    return NextResponse.json({
      success: true,
      data: {
        platformTree,
        stats
      }
    })
  } catch (error) {
    console.error('获取树状数据失败:', error)
    return NextResponse.json({
      success: false,
      error: '获取树状数据失败'
    }, { status: 500 })
  }
}