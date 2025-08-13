import { NextRequest, NextResponse } from 'next/server'
import { trainingRecordDB, questionSetDB } from '@/lib/database'
import * as XLSX from 'xlsx'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // 获取筛选参数 (与records API相同的参数)
    const employeeName = searchParams.get('employeeName') || undefined
    const setIdParam = searchParams.get('setId')
    const setId = setIdParam && setIdParam !== 'all' ? parseInt(setIdParam) : undefined
    const minScore = searchParams.get('minScore') ? parseInt(searchParams.get('minScore')!) : undefined
    const maxScore = searchParams.get('maxScore') ? parseInt(searchParams.get('maxScore')!) : undefined
    const dateRange = (searchParams.get('dateRange') as 'today' | 'week' | 'month' | 'all') || 'all'
    const format = searchParams.get('format') || 'xlsx' // 支持 xlsx, csv
    
    console.log('导出培训数据，筛选条件:', { employeeName, setId, minScore, maxScore, dateRange, format })
    
    // 获取所有符合条件的培训记录 (不分页)
    const records = trainingRecordDB.findWithFilters({
      employeeName,
      setId,
      minScore,
      maxScore,
      dateRange,
      limit: 10000, // 设置一个较大的限制
      offset: 0
    })
    
    if (records.length === 0) {
      return NextResponse.json(
        { success: false, message: '没有找到符合条件的数据' },
        { status: 404 }
      )
    }
    
    // 获取试卷信息映射
    const questionSets = questionSetDB.findAll()
    const setMap = questionSets.reduce((map, set) => {
      map[set.id!] = set
      return map
    }, {} as { [key: number]: any })
    
    // 准备导出数据
    const exportData = records.map((record, index) => {
      const questionSet = setMap[record.set_id]
      const answers = JSON.parse(record.answers)
      
      // 计算正确题数和错误题数
      const correctCount = answers.filter((a: any) => a.isCorrect).length
      const wrongCount = answers.filter((a: any) => !a.isCorrect).length
      
      return {
        '序号': index + 1,
        '员工姓名': record.employee_name,
        '试卷名称': questionSet?.name || '未知试卷',
        '试卷ID': record.set_id,
        '得分': record.score,
        '满分': record.total_questions * 2, // 假设每题2分，满分100分
        '正确题数': correctCount,
        '错误题数': wrongCount,
        '正确率': `${Math.round((correctCount / record.total_questions) * 100)}%`,
        '是否通过': record.score >= 60 ? '是' : '否',
        '答题用时': record.session_duration ? `${Math.floor(record.session_duration / 60)}分${record.session_duration % 60}秒` : '未知',
        '开始时间': record.started_at ? new Date(record.started_at).toLocaleString('zh-CN') : '未知',
        '完成时间': record.completed_at ? new Date(record.completed_at).toLocaleString('zh-CN') : '未知',
        'IP地址': record.ip_address || '未知'
      }
    })
    
    // 创建工作簿
    const workbook = XLSX.utils.book_new()
    
    // 创建主要数据工作表
    const mainWorksheet = XLSX.utils.json_to_sheet(exportData)
    
    // 设置列宽
    const colWidths = [
      { wch: 6 },  // 序号
      { wch: 12 }, // 员工姓名
      { wch: 20 }, // 试卷名称
      { wch: 8 },  // 试卷ID
      { wch: 8 },  // 得分
      { wch: 8 },  // 满分
      { wch: 10 }, // 正确题数
      { wch: 10 }, // 错误题数
      { wch: 10 }, // 正确率
      { wch: 10 }, // 是否通过
      { wch: 12 }, // 答题用时
      { wch: 18 }, // 开始时间
      { wch: 18 }, // 完成时间
      { wch: 15 }  // IP地址
    ]
    
    mainWorksheet['!cols'] = colWidths
    
    XLSX.utils.book_append_sheet(workbook, mainWorksheet, '培训记录')
    
    // 创建统计汇总工作表
    const stats = trainingRecordDB.getTrainingStats()
    const scoreDistribution = trainingRecordDB.getScoreDistribution()
    
    const summaryData = [
      { '统计项': '总记录数', '数值': stats.totalRecords, '单位': '条' },
      { '统计项': '参与人数', '数值': stats.totalEmployees, '单位': '人' },
      { '统计项': '平均分数', '数值': stats.averageScore, '单位': '分' },
      { '统计项': '通过率', '数值': stats.passRate, '单位': '%' },
      { '统计项': '平均题目数', '数值': stats.totalQuestions, '单位': '题' },
      { '统计项': '', '数值': '', '单位': '' }, // 空行
      { '统计项': '分数分布', '数值': '', '单位': '' },
      ...scoreDistribution.map(dist => ({
        '统计项': dist.scoreRange,
        '数值': dist.count,
        '单位': '人'
      }))
    ]
    
    const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData)
    summaryWorksheet['!cols'] = [{ wch: 15 }, { wch: 10 }, { wch: 8 }]
    
    XLSX.utils.book_append_sheet(workbook, summaryWorksheet, '统计汇总')
    
    // 如果有详细答题记录需求，可以再创建一个工作表
    // 但这会使文件较大，暂时省略
    
    // 生成文件
    const fileName = `培训考试统计_${new Date().toISOString().slice(0, 10)}.xlsx`
    
    if (format === 'csv') {
      // 导出CSV格式
      const csvData = XLSX.utils.sheet_to_csv(mainWorksheet)
      
      return new NextResponse(csvData, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${encodeURIComponent('培训考试统计_' + new Date().toISOString().slice(0, 10) + '.csv')}"`
        }
      })
    } else {
      // 导出Excel格式
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
      
      return new NextResponse(excelBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`
        }
      })
    }
    
  } catch (error) {
    console.error('导出培训数据失败:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: '导出数据失败',
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}