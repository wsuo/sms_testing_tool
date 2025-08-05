import { NextRequest, NextResponse } from 'next/server'
import { executeQuery, testConnection } from '@/lib/mysql'

export async function POST(request: NextRequest) {
  try {
    const { updateTime, confirm } = await request.json()
    
    if (!updateTime) {
      return NextResponse.json(
        { success: false, error: '缺少更新时间参数' },
        { status: 400 }
      )
    }
    
    if (!confirm) {
      return NextResponse.json(
        { success: false, error: '请确认执行全量更新操作' },
        { status: 400 }
      )
    }
    
    // 验证数据库连接
    const isConnected = await testConnection()
    if (!isConnected) {
      throw new Error('无法连接到MySQL数据库，请检查配置')
    }
    
    console.log(`开始全量更新操作，保留更新时间晚于: ${updateTime}`)
    
    // 首先查询要删除的记录数量（用于统计）
    const countSqlCompany = `
      SELECT COUNT(*) as count 
      FROM seller_company 
      WHERE update_time < ? OR update_time IS NULL
    `
    
    const countSqlLang = `
      SELECT COUNT(*) as count 
      FROM seller_company_lang scl
      INNER JOIN seller_company sc ON scl.company_id = sc.company_id
      WHERE sc.update_time < ? OR sc.update_time IS NULL
    `
    
    const [companyCountResult] = await executeQuery(countSqlCompany, [updateTime])
    const [langCountResult] = await executeQuery(countSqlLang, [updateTime])
    
    const companyCount = (companyCountResult as any).count
    const langCount = (langCountResult as any).count
    
    console.log(`将删除 ${companyCount} 条公司主表记录，${langCount} 条多语言表记录`)
    
    // 删除多语言表中的旧数据
    const deleteLangSql = `
      DELETE scl FROM seller_company_lang scl
      INNER JOIN seller_company sc ON scl.company_id = sc.company_id
      WHERE sc.update_time < ? OR sc.update_time IS NULL
    `
    
    // 删除主表中的旧数据
    const deleteCompanySql = `
      DELETE FROM seller_company 
      WHERE update_time < ? OR update_time IS NULL
    `
    
    // 执行删除操作
    await executeQuery(deleteLangSql, [updateTime])
    console.log(`已删除多语言表中的旧数据`)
    
    await executeQuery(deleteCompanySql, [updateTime])
    console.log(`已删除主表中的旧数据`)
    
    // 查询剩余记录数量
    const remainingCompanyResult = await executeQuery('SELECT COUNT(*) as count FROM seller_company')
    const remainingLangResult = await executeQuery('SELECT COUNT(*) as count FROM seller_company_lang')
    
    const remainingCompanyCount = (remainingCompanyResult[0] as any).count
    const remainingLangCount = (remainingLangResult[0] as any).count
    
    console.log(`全量更新完成，剩余公司记录: ${remainingCompanyCount}, 剩余多语言记录: ${remainingLangCount}`)
    
    return NextResponse.json({
      success: true,
      result: {
        deletedCompanyCount: companyCount,
        deletedLangCount: langCount,
        remainingCompanyCount,
        remainingLangCount,
        updateTime,
        message: `全量更新完成，删除了 ${companyCount} 条公司记录和 ${langCount} 条多语言记录`
      }
    })
    
  } catch (error) {
    console.error('全量更新失败:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : '全量更新失败' 
      },
      { status: 500 }
    )
  }
}

// GET请求用于预览将要删除的数据统计
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const updateTime = searchParams.get('update_time')
    
    if (!updateTime) {
      return NextResponse.json(
        { success: false, error: '缺少更新时间参数' },
        { status: 400 }
      )
    }
    
    // 验证数据库连接
    const isConnected = await testConnection()
    if (!isConnected) {
      throw new Error('无法连接到MySQL数据库，请检查配置')
    }
    
    // 查询要删除的记录数量
    const countSqlCompany = `
      SELECT COUNT(*) as count 
      FROM seller_company 
      WHERE update_time < ? OR update_time IS NULL
    `
    
    const countSqlLang = `
      SELECT COUNT(*) as count 
      FROM seller_company_lang scl
      INNER JOIN seller_company sc ON scl.company_id = sc.company_id
      WHERE sc.update_time < ? OR sc.update_time IS NULL
    `
    
    const totalCompanySql = 'SELECT COUNT(*) as count FROM seller_company'
    const totalLangSql = 'SELECT COUNT(*) as count FROM seller_company_lang'
    
    const [companyCountResult] = await executeQuery(countSqlCompany, [updateTime])
    const [langCountResult] = await executeQuery(countSqlLang, [updateTime])
    const [totalCompanyResult] = await executeQuery(totalCompanySql)
    const [totalLangResult] = await executeQuery(totalLangSql)
    
    const toDeleteCompanyCount = (companyCountResult as any).count
    const toDeleteLangCount = (langCountResult as any).count
    const totalCompanyCount = (totalCompanyResult as any).count
    const totalLangCount = (totalLangResult as any).count
    
    return NextResponse.json({
      success: true,
      preview: {
        updateTime,
        toDeleteCompanyCount,
        toDeleteLangCount,
        toKeepCompanyCount: totalCompanyCount - toDeleteCompanyCount,
        toKeepLangCount: totalLangCount - toDeleteLangCount,
        totalCompanyCount,
        totalLangCount,
        deletePercentage: totalCompanyCount > 0 ? Math.round((toDeleteCompanyCount / totalCompanyCount) * 100) : 0
      }
    })
    
  } catch (error) {
    console.error('获取全量更新预览失败:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : '获取全量更新预览失败' 
      },
      { status: 500 }
    )
  }
}