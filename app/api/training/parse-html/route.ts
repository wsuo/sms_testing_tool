import { NextRequest, NextResponse } from 'next/server'
import { HTMLQuestionParser } from '@/lib/html-question-parser'

// 解析HTML题库内容
export async function POST(request: NextRequest) {
  try {
    const { htmlContent, setName } = await request.json()
    
    if (!htmlContent || !htmlContent.trim()) {
      return NextResponse.json(
        { success: false, message: 'HTML内容不能为空' },
        { status: 400 }
      )
    }
    
    // 使用HTML解析器解析内容
    const parseResult = HTMLQuestionParser.parseHTML(htmlContent, setName)
    
    if (parseResult.success) {
      return NextResponse.json({
        success: true,
        data: parseResult.data,
        warnings: parseResult.warnings,
        message: `成功解析 ${parseResult.data?.questions.length || 0} 道题目`
      })
    } else {
      return NextResponse.json(
        { 
          success: false, 
          message: parseResult.error || '解析失败'
        },
        { status: 400 }
      )
    }
    
  } catch (error) {
    console.error('HTML解析失败:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'HTML解析失败',
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}