import { NextRequest, NextResponse } from 'next/server'
import { QuestionParser } from '@/lib/question-parser'
import { questionSetDB, questionDB } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    console.log('开始导入题库数据...')
    
    // 定义题库文件路径
    const questionFilePaths = [
      '/Users/wshuo/Library/Containers/com.tencent.xinWeChat/Data/Documents/xwechat_files/wxid_t363f9pmzjwb22_88d0/msg/file/2025-08/员工培训考核-题库1.html',
      '/Users/wshuo/Library/Containers/com.tencent.xinWeChat/Data/Documents/xwechat_files/wxid_t363f9pmzjwb22_88d0/msg/file/2025-08/员工培训考核-题库2.html',
      '/Users/wshuo/Library/Containers/com.tencent.xinWeChat/Data/Documents/xwechat_files/wxid_t363f9pmzjwb22_88d0/msg/file/2025-08/员工培训考核-题库3.html'
    ]
    
    // 解析所有题库文件
    const parsedSets = await QuestionParser.parseMultipleFiles(questionFilePaths)
    
    const importResults: any[] = []
    let totalQuestions = 0
    let totalErrors = 0
    
    for (const parsedSet of parsedSets) {
      try {
        console.log(`正在导入题库: ${parsedSet.name}`)
        
        // 验证题库数据
        const validation = QuestionParser.validateQuestionSet(parsedSet)
        if (!validation.isValid) {
          console.error(`题库验证失败: ${parsedSet.name}`, validation.errors)
          importResults.push({
            setName: parsedSet.name,
            success: false,
            error: `数据验证失败: ${validation.errors.join(', ')}`,
            questionsCount: 0
          })
          totalErrors++
          continue
        }
        
        // 检查是否已存在同名题库
        const existingSets = questionSetDB.findAll()
        const existingSet = existingSets.find(set => set.name === parsedSet.name)
        
        let setId: number
        
        if (existingSet) {
          // 如果存在，清空原有题目
          console.log(`清空现有题库 "${parsedSet.name}" 的题目`)
          questionDB.deleteBySetId(existingSet.id!)
          setId = existingSet.id!
        } else {
          // 创建新题库
          setId = questionSetDB.insertQuestionSet({
            name: parsedSet.name,
            description: parsedSet.description,
            total_questions: parsedSet.questions.length
          })
          console.log(`创建新题库: ID=${setId}`)
        }
        
        // 准备题目数据
        const questionsData = parsedSet.questions.map(q => ({
          set_id: setId,
          question_number: q.questionNumber,
          section: q.section || '通用知识',
          question_text: q.questionText,
          option_a: q.optionA,
          option_b: q.optionB,
          option_c: q.optionC,
          option_d: q.optionD,
          correct_answer: q.correctAnswer,
          explanation: q.explanation
        }))
        
        // 批量插入题目
        const insertedCount = questionDB.insertBatch(questionsData)
        totalQuestions += insertedCount
        
        console.log(`成功导入 ${insertedCount} 道题目到题库 "${parsedSet.name}"`)
        
        importResults.push({
          setName: parsedSet.name,
          setId,
          success: true,
          questionsCount: insertedCount,
          validationErrors: validation.errors
        })
        
      } catch (error) {
        console.error(`导入题库失败: ${parsedSet.name}`, error)
        importResults.push({
          setName: parsedSet.name,
          success: false,
          error: `导入失败: ${error}`,
          questionsCount: 0
        })
        totalErrors++
      }
    }
    
    const response = {
      success: totalErrors === 0,
      message: totalErrors === 0 
        ? `成功导入所有题库，总计 ${totalQuestions} 道题目` 
        : `导入完成，成功 ${parsedSets.length - totalErrors} 个，失败 ${totalErrors} 个，总计 ${totalQuestions} 道题目`,
      data: {
        totalSets: parsedSets.length,
        successfulSets: parsedSets.length - totalErrors,
        failedSets: totalErrors,
        totalQuestions,
        importResults
      }
    }
    
    console.log('题库导入完成:', response)
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('题库导入过程发生错误:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: '题库导入失败',
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}

// 获取题库导入状态
export async function GET(request: NextRequest) {
  try {
    // 获取现有题库统计
    const questionSets = questionSetDB.findAll()
    const stats = []
    
    for (const set of questionSets) {
      const questionCount = questionDB.countBySetId(set.id!)
      stats.push({
        id: set.id,
        name: set.name,
        description: set.description,
        totalQuestions: set.total_questions,
        actualQuestions: questionCount,
        createdAt: set.created_at,
        updatedAt: set.updated_at
      })
    }
    
    return NextResponse.json({
      success: true,
      data: {
        totalSets: questionSets.length,
        questionSets: stats
      }
    })
    
  } catch (error) {
    console.error('获取题库状态失败:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: '获取题库状态失败',
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}