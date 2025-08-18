/**
 * HTML题库解析器
 * 用于解析HTML格式的题库文件并转换为标准的题目格式
 */

export interface ParsedQuestion {
  questionNumber: number
  section?: string
  questionText: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  correctAnswer: string
  explanation?: string
}

export interface ParsedQuestionSet {
  name: string
  description?: string
  questions: ParsedQuestion[]
}

export interface ParseResult {
  success: boolean
  data?: ParsedQuestionSet
  error?: string
  warnings?: string[]
}

export class HTMLQuestionParser {
  
  /**
   * 解析HTML字符串内容
   * @param htmlContent HTML内容字符串
   * @param setName 题库名称（可选，从HTML中自动提取）
   * @returns 解析结果
   */
  static parseHTML(htmlContent: string, setName?: string): ParseResult {
    try {
      const warnings: string[] = []
      
      // 清理HTML内容，移除多余的空白字符
      const cleanHTML = htmlContent.trim()
      
      if (!cleanHTML) {
        return {
          success: false,
          error: 'HTML内容为空'
        }
      }
      
      // 提取标题
      const title = this.extractTitle(cleanHTML) || setName || '未命名题库'
      
      // 提取描述
      const description = this.extractDescription(cleanHTML)
      
      // 解析题目
      const questions = this.parseQuestions(cleanHTML)
      
      if (questions.length === 0) {
        return {
          success: false,
          error: '未找到任何题目，请检查HTML格式是否正确'
        }
      }
      
      // 验证题目完整性
      const validationResult = this.validateQuestions(questions)
      if (validationResult.errors.length > 0) {
        warnings.push(...validationResult.warnings)
      }
      
      return {
        success: true,
        data: {
          name: title,
          description: description,
          questions: questions
        },
        warnings: warnings.length > 0 ? warnings : undefined
      }
      
    } catch (error) {
      console.error('HTML解析错误:', error)
      return {
        success: false,
        error: `解析失败: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }
  
  /**
   * 从HTML中提取标题
   */
  private static extractTitle(html: string): string | null {
    // 尝试多种标题模式
    const titlePatterns = [
      /<h1[^>]*>(.*?)<\/h1>/i,
      /<title[^>]*>(.*?)<\/title>/i,
      /<header[^>]*>[\s\S]*?<h1[^>]*>(.*?)<\/h1>[\s\S]*?<\/header>/i,
      /class=["']quiz-container["'][^>]*>[\s\S]*?<h1[^>]*>(.*?)<\/h1>/i
    ]
    
    for (const pattern of titlePatterns) {
      const match = html.match(pattern)
      if (match && match[1]) {
        return this.cleanText(match[1])
      }
    }
    
    return null
  }
  
  /**
   * 从HTML中提取描述
   */
  private static extractDescription(html: string): string | null {
    // 查找描述段落
    const descPatterns = [
      /<p[^>]*style=["'][^"']*text-align\s*:\s*center[^"']*["'][^>]*>(.*?)<\/p>/i,
      /<header[^>]*>[\s\S]*?<p[^>]*>(.*?)<\/p>[\s\S]*?<\/header>/i,
      /<h1[^>]*>.*?<\/h1>\s*<p[^>]*>(.*?)<\/p>/i
    ]
    
    for (const pattern of descPatterns) {
      const match = html.match(pattern)
      if (match && match[1]) {
        const desc = this.cleanText(match[1])
        // 过滤掉太短的描述
        if (desc.length > 10) {
          return desc
        }
      }
    }
    
    return null
  }
  
  /**
   * 解析题目列表
   */
  private static parseQuestions(html: string): ParsedQuestion[] {
    const questions: ParsedQuestion[] = []
    
    // 查找所有题目块
    const questionBlockPattern = /<div[^>]*class=["']question-block["'][^>]*id=["']q(\d+)-block["'][^>]*>([\s\S]*?)<\/div>/gi
    
    let match
    while ((match = questionBlockPattern.exec(html)) !== null) {
      const questionNumber = parseInt(match[1])
      const questionHTML = match[2]
      
      const question = this.parseQuestionBlock(questionHTML, questionNumber)
      if (question) {
        questions.push(question)
      }
    }
    
    // 如果没有找到标准格式，尝试其他模式
    if (questions.length === 0) {
      return this.parseAlternativeFormat(html)
    }
    
    return questions.sort((a, b) => a.questionNumber - b.questionNumber)
  }
  
  /**
   * 解析单个题目块
   */
  private static parseQuestionBlock(questionHTML: string, questionNumber: number): ParsedQuestion | null {
    try {
      // 提取题目文本
      const questionTextMatch = questionHTML.match(/<p[^>]*class=["']question-text["'][^>]*>(.*?)<\/p>/i)
      if (!questionTextMatch) return null
      
      const questionText = this.cleanText(questionTextMatch[1])
      
      // 提取选项
      const optionsMatch = questionHTML.match(/<ul[^>]*class=["']options-list["'][^>]*>([\s\S]*?)<\/ul>/i)
      if (!optionsMatch) return null
      
      const optionsHTML = optionsMatch[1]
      const options = this.parseOptions(optionsHTML)
      
      if (options.length < 4) return null
      
      // 提取正确答案和解释
      const feedbackMatch = questionHTML.match(/<p[^>]*class=["']feedback["'][^>]*>(.*?)<\/p>/i)
      let correctAnswer = ''
      let explanation = ''
      
      if (feedbackMatch) {
        const feedback = this.cleanText(feedbackMatch[1])
        const answerMatch = feedback.match(/正确答案[：:]\s*([A-D])/i)
        if (answerMatch) {
          correctAnswer = answerMatch[1].toUpperCase()
        }
        explanation = feedback
      }
      
      // 提取章节信息（如果有的话）
      let section = this.extractSection(questionHTML, questionNumber)
      
      return {
        questionNumber,
        section,
        questionText,
        optionA: options[0] || '',
        optionB: options[1] || '',
        optionC: options[2] || '',
        optionD: options[3] || '',
        correctAnswer,
        explanation
      }
      
    } catch (error) {
      console.warn(`解析第${questionNumber}题时出错:`, error)
      return null
    }
  }
  
  /**
   * 解析选项列表
   */
  private static parseOptions(optionsHTML: string): string[] {
    const options: string[] = []
    
    // 匹配所有选项
    const optionPattern = /<li[^>]*><label[^>]*><input[^>]*value=["']([A-D])["'][^>]*>\s*(.*?)<\/label><\/li>/gi
    
    let match
    const optionMap: { [key: string]: string } = {}
    
    while ((match = optionPattern.exec(optionsHTML)) !== null) {
      const optionLetter = match[1].toUpperCase()
      const optionText = this.cleanText(match[2])
      optionMap[optionLetter] = optionText
    }
    
    // 按ABCD顺序返回
    return [
      optionMap['A'] || '',
      optionMap['B'] || '',
      optionMap['C'] || '',
      optionMap['D'] || ''
    ]
  }
  
  /**
   * 提取章节信息
   */
  private static extractSection(questionHTML: string, questionNumber: number): string | undefined {
    // 向上查找最近的章节标题
    const sectionPatterns = [
      /第[一二三四五六七八九十\d]+部分[：:]?(.*?)(?=<\/h2>|$)/i,
      /第[一二三四五六七八九十\d]+章[：:]?(.*?)(?=<\/h2>|$)/i,
      /<h2[^>]*>(.*?)<\/h2>/i
    ]
    
    for (const pattern of sectionPatterns) {
      const match = questionHTML.match(pattern)
      if (match && match[1]) {
        return this.cleanText(match[1])
      }
    }
    
    // 根据题目编号推断章节
    if (questionNumber <= 10) return '第一部分'
    if (questionNumber <= 20) return '第二部分'
    if (questionNumber <= 30) return '第三部分'
    if (questionNumber <= 40) return '第四部分'
    if (questionNumber <= 50) return '第五部分'
    
    return undefined
  }
  
  /**
   * 解析替代格式（兜底方案）
   */
  private static parseAlternativeFormat(html: string): ParsedQuestion[] {
    const questions: ParsedQuestion[] = []
    
    // 更宽松的题目匹配模式
    const patterns = [
      // 模式1: 数字. 题目文本
      /(\d+)\.\s*(.*?)(?=\d+\.|$)/gs,
      // 模式2: 题目编号在各种标签中
      /<(?:p|div|span)[^>]*>(\d+)[\.、]\s*(.*?)<\/(?:p|div|span)>/gi
    ]
    
    // 尝试各种模式
    for (const pattern of patterns) {
      const matches = Array.from(html.matchAll(pattern))
      if (matches.length > 0) {
        // 实现简单的解析逻辑
        // 这里需要根据实际的HTML格式进行调整
        break
      }
    }
    
    return questions
  }
  
  /**
   * 验证题目完整性
   */
  private static validateQuestions(questions: ParsedQuestion[]): { errors: string[], warnings: string[] } {
    const errors: string[] = []
    const warnings: string[] = []
    
    questions.forEach((q, index) => {
      const qNum = q.questionNumber || index + 1
      
      if (!q.questionText.trim()) {
        errors.push(`第${qNum}题缺少题目文本`)
      }
      
      if (!q.optionA.trim() || !q.optionB.trim() || !q.optionC.trim() || !q.optionD.trim()) {
        errors.push(`第${qNum}题选项不完整`)
      }
      
      if (!q.correctAnswer || !['A', 'B', 'C', 'D'].includes(q.correctAnswer)) {
        warnings.push(`第${qNum}题缺少正确答案或答案格式错误`)
      }
      
      if (!q.explanation || q.explanation.length < 10) {
        warnings.push(`第${qNum}题缺少详细解释`)
      }
    })
    
    return { errors, warnings }
  }
  
  /**
   * 清理HTML标签和多余空白字符
   */
  private static cleanText(text: string): string {
    return text
      .replace(/<[^>]*>/g, '') // 移除HTML标签
      .replace(/&nbsp;/g, ' ') // 替换非断空格
      .replace(/&lt;/g, '<')   // 解码HTML实体
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')     // 合并多个空白字符
      .trim()
  }
  
  /**
   * 从文件路径读取HTML并解析
   */
  static async parseFile(filePath: string, setName?: string): Promise<ParseResult> {
    try {
      const fs = await import('fs/promises')
      const htmlContent = await fs.readFile(filePath, 'utf-8')
      return this.parseHTML(htmlContent, setName)
    } catch (error) {
      return {
        success: false,
        error: `读取文件失败: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }
  
  /**
   * 批量解析多个文件
   */
  static async parseMultipleFiles(filePaths: string[]): Promise<ParsedQuestionSet[]> {
    const results: ParsedQuestionSet[] = []
    
    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i]
      const setName = `题库${i + 1}`
      
      try {
        const result = await this.parseFile(filePath, setName)
        if (result.success && result.data) {
          results.push(result.data)
        } else {
          console.warn(`解析文件失败 ${filePath}:`, result.error)
        }
      } catch (error) {
        console.warn(`解析文件出错 ${filePath}:`, error)
      }
    }
    
    return results
  }
}