import * as fs from 'fs'
import * as path from 'path'
import { JSDOM } from 'jsdom'
import { Question, QuestionSet } from './database'

export interface ParsedQuestionSet {
  name: string
  description: string
  questions: ParsedQuestion[]
}

export interface ParsedQuestion {
  questionNumber: number
  section: string
  questionText: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  correctAnswer: string
  explanation?: string
}

export class QuestionParser {
  
  /**
   * 解析单个HTML题库文件
   */
  static async parseHtmlFile(filePath: string): Promise<ParsedQuestionSet> {
    try {
      // 读取HTML文件
      const htmlContent = fs.readFileSync(filePath, 'utf-8')
      
      // 使用JSDOM解析HTML
      const dom = new JSDOM(htmlContent)
      const document = dom.window.document
      
      // 提取试卷名称
      const titleElement = document.querySelector('title') || document.querySelector('h1') || document.querySelector('h2')
      const setName = titleElement?.textContent?.trim() || path.basename(filePath, '.html')
      
      // 解析题目
      const questions: ParsedQuestion[] = []
      
      // 查找包含答案的script标签
      let answersMap: { [key: string]: string } = {}
      const scriptTags = document.querySelectorAll('script')
      
      for (const script of scriptTags) {
        const scriptContent = script.textContent || ''
        console.log('检查脚本内容是否包含答案...')
        
        if (scriptContent.includes('answers') || scriptContent.includes('q1:') || scriptContent.includes('q2:')) {
          console.log('找到包含答案的脚本')
          
          // 尝试提取完整的答案对象 (格式如: answers = { q1: 'B', q2: 'C', ... })
          const answerMatches = scriptContent.match(/answers\s*[=:]\s*\{([^}]+)\}/g) ||
                               scriptContent.match(/const\s+answers\s*=\s*\{([^}]+)\}/g)
          
          if (answerMatches) {
            for (const match of answerMatches) {
              try {
                // 提取大括号内的内容
                const bracesMatch = match.match(/\{([^}]+)\}/)
                if (bracesMatch) {
                  const answersContent = bracesMatch[1]
                  console.log('提取到答案内容:', answersContent.substring(0, 100) + '...')
                  
                  // 解析每个答案键值对
                  const answerPairs = answersContent.match(/(q\d+|[\d]+)\s*:\s*['"]([ABCD])['"]/g)
                  if (answerPairs) {
                    for (const pair of answerPairs) {
                      const pairMatch = pair.match(/(q\d+|\d+)\s*:\s*['"]([ABCD])['"]/)
                      if (pairMatch) {
                        const [, key, answer] = pairMatch
                        answersMap[key] = answer
                        console.log(`找到答案: ${key} -> ${answer}`)
                      }
                    }
                  }
                }
              } catch (e) {
                console.warn('解析答案对象失败:', e)
              }
            }
          }
          
          // 尝试直接匹配单个答案 (格式如: q1: 'B')
          const singleAnswerMatches = scriptContent.match(/(q\d+|\d+)\s*:\s*['"]([ABCD])['"]?/g)
          if (singleAnswerMatches) {
            console.log(`找到 ${singleAnswerMatches.length} 个单独答案`)
            for (const match of singleAnswerMatches) {
              const pairMatch = match.match(/(q\d+|\d+)\s*:\s*['"]([ABCD])['"]?/)
              if (pairMatch) {
                const [, key, answer] = pairMatch
                answersMap[key] = answer
              }
            }
          }
        }
      }
      
      console.log('答案映射结果:', Object.keys(answersMap).length, '个答案')
      
      // 解析题目内容
      const questionElements = this.findQuestionElements(document)
      
      for (let i = 0; i < questionElements.length; i++) {
        const element = questionElements[i]
        const questionData = this.parseQuestionElement(element, i + 1, answersMap)
        
        if (questionData) {
          questions.push(questionData)
        }
      }
      
      return {
        name: setName,
        description: `从 ${path.basename(filePath)} 导入的题库`,
        questions
      }
      
    } catch (error) {
      console.error(`解析题库文件失败: ${filePath}`, error)
      throw new Error(`解析题库文件失败: ${error}`)
    }
  }
  
  /**
   * 查找题目元素
   */
  private static findQuestionElements(document: Document): Element[] {
    const questions: Element[] = []
    
    // 首先尝试查找结构化的题目块
    const questionBlocks = Array.from(document.querySelectorAll('.question-block'))
    if (questionBlocks.length > 0) {
      console.log(`找到 ${questionBlocks.length} 个结构化题目块`)
      return questionBlocks
    }
    
    // 尝试其他选择器模式
    const selectors = [
      '[class*="question"]',
      '[id*="question"]', 
      '[id*="q"][id$="-block"]',  // 匹配如 q1-block 的ID
      'div:has(.question-text)', // 包含题目文本的div
      'div:has(ul.options-list)' // 包含选项列表的div
    ]
    
    for (const selector of selectors) {
      try {
        const elements = Array.from(document.querySelectorAll(selector))
        
        // 筛选包含题目特征的元素
        const questionLike = elements.filter(el => {
          const text = el.textContent || ''
          const hasQuestionText = el.querySelector('.question-text') || /\d+[、．.].*[？?]/.test(text)
          const hasOptions = el.querySelector('.options-list') || el.querySelector('ul') || 
            (text.includes('A.') && text.includes('B.') && text.includes('C.') && text.includes('D.'))
          
          return hasQuestionText && hasOptions
        })
        
        if (questionLike.length > 0) {
          console.log(`通过选择器 ${selector} 找到 ${questionLike.length} 个题目`)
          questions.push(...questionLike)
          break
        }
      } catch (e) {
        console.warn(`选择器 ${selector} 执行失败:`, e)
        continue
      }
    }
    
    // 如果没有找到结构化的题目，尝试通过文本解析
    if (questions.length === 0) {
      console.log('未找到结构化题目，尝试文本解析')
      const bodyText = document.body?.textContent || ''
      const questionBlocks = this.parseTextQuestions(bodyText)
      
      // 创建虚拟元素包装文本题目
      for (const block of questionBlocks) {
        const div = document.createElement('div')
        div.textContent = block
        questions.push(div)
      }
      console.log(`通过文本解析找到 ${questions.length} 个题目`)
    }
    
    return questions
  }
  
  /**
   * 解析单个题目元素
   */
  private static parseQuestionElement(element: Element, defaultNumber: number, answersMap: { [key: string]: string }): ParsedQuestion | null {
    try {
      // 提取题目文本
      const questionTextElement = element.querySelector('.question-text')
      let questionText = questionTextElement?.textContent?.trim() || ''
      
      // 如果没有找到专门的题目文本元素，从整个元素中提取
      if (!questionText) {
        const fullText = element.textContent || ''
        const questionMatch = fullText.match(/^\d+[、．.]\s*([^AB\n]*?)(?=\s*A[.、．：:]|$)/)
        questionText = questionMatch ? questionMatch[1].trim() : ''
      }
      
      // 提取题目号
      let questionNumber = defaultNumber
      const numberMatch = questionText.match(/^(\d+)[、．.]\s*/)
      if (numberMatch) {
        questionNumber = parseInt(numberMatch[1])
        // 移除题号，保留题目内容
        questionText = questionText.replace(/^\d+[、．.]\s*/, '').trim()
      } else {
        // 尝试从ID中提取题号
        const idMatch = element.id?.match(/q(\d+)/)
        if (idMatch) {
          questionNumber = parseInt(idMatch[1])
        }
      }
      
      // 提取选项
      const options: { [key: string]: string } = {}
      const optionsListElement = element.querySelector('.options-list') || element.querySelector('ul')
      
      if (optionsListElement) {
        // 结构化选项提取
        const optionElements = optionsListElement.querySelectorAll('li label')
        
        for (const labelElement of optionElements) {
          const inputElement = labelElement.querySelector('input[type="radio"]')
          const value = inputElement?.getAttribute('value')
          
          if (value && ['A', 'B', 'C', 'D'].includes(value)) {
            // 获取选项文本，排除input元素
            let optionText = labelElement.textContent || ''
            // 移除可能的前缀符号和空格
            optionText = optionText.replace(/^[ABCD][.、．：:]\s*/, '').trim()
            options[value] = optionText
          }
        }
      }
      
      // 如果结构化提取失败，尝试文本模式匹配
      if (Object.keys(options).length === 0) {
        const fullText = element.textContent || ''
        const lines = fullText.split(/\n/)
        
        for (const line of lines) {
          const trimmedLine = line.trim()
          // 匹配如 "A. 选项内容" 或 "A 选项内容" 格式
          const optionMatch = trimmedLine.match(/^([ABCD])[.、．：:\s]+(.+)$/)
          if (optionMatch) {
            const [, letter, content] = optionMatch
            options[letter] = content.trim()
          }
        }
      }
      
      // 提取章节信息（如果有标题元素）
      let section = ''
      const sectionElement = element.closest('div')?.previousElementSibling
      if (sectionElement && (sectionElement.tagName === 'H2' || sectionElement.tagName === 'H3')) {
        section = sectionElement.textContent?.trim() || ''
      }
      
      // 查找正确答案
      let correctAnswer = ''
      
      // 首先从答案映射中查找
      const possibleKeys = [
        `q${questionNumber}`,
        questionNumber.toString(),
        questionNumber
      ]
      
      for (const key of possibleKeys) {
        if (answersMap[key]) {
          correctAnswer = answersMap[key]
          break
        }
      }
      
      // 如果还没找到答案，尝试从反馈文本中提取
      if (!correctAnswer) {
        const feedbackElement = element.querySelector('.feedback')
        if (feedbackElement) {
          const feedbackText = feedbackElement.textContent || ''
          const answerMatch = feedbackText.match(/正确答案[：:]\s*([ABCD])/i)
          if (answerMatch) {
            correctAnswer = answerMatch[1]
          }
        }
      }
      
      // 验证数据完整性
      const requiredOptions = ['A', 'B', 'C', 'D']
      const missingOptions = requiredOptions.filter(opt => !options[opt] || !options[opt].trim())
      
      if (!questionText.trim()) {
        console.warn(`题目 ${questionNumber}: 题目文本为空`)
        return null
      }
      
      if (missingOptions.length > 0) {
        console.warn(`题目 ${questionNumber}: 缺少选项 ${missingOptions.join(', ')}`, {
          questionText: questionText.substring(0, 50),
          availableOptions: Object.keys(options),
          optionSample: Object.entries(options).slice(0, 2)
        })
        return null
      }
      
      if (!correctAnswer || !['A', 'B', 'C', 'D'].includes(correctAnswer)) {
        console.warn(`题目 ${questionNumber}: 正确答案无效`, {
          correctAnswer,
          questionText: questionText.substring(0, 50)
        })
        return null
      }
      
      // 提取解释（如果有）
      const feedbackElement = element.querySelector('.feedback')
      let explanation = ''
      if (feedbackElement) {
        explanation = feedbackElement.textContent?.replace(/正确答案[：:]\s*[ABCD][。.]\s*/, '') || ''
      }
      
      console.log(`成功解析题目 ${questionNumber}: ${questionText.substring(0, 30)}...`)
      
      return {
        questionNumber,
        section,
        questionText: questionText.trim(),
        optionA: options['A'],
        optionB: options['B'], 
        optionC: options['C'],
        optionD: options['D'],
        correctAnswer,
        explanation: explanation.trim()
      }
      
    } catch (error) {
      console.error(`解析题目元素失败 (defaultNumber: ${defaultNumber}):`, error)
      return null
    }
  }
  
  /**
   * 从纯文本中解析题目
   */
  private static parseTextQuestions(text: string): string[] {
    // 按题目分割文本
    const questionPattern = /\d+[、．.]\s*[^。]*?[？?]/g
    const questions: string[] = []
    
    let match
    while ((match = questionPattern.exec(text)) !== null) {
      let questionBlock = match[0]
      
      // 尝试获取题目后面的选项
      const restText = text.substring(match.index + questionBlock.length)
      const optionsMatch = restText.match(/^[\s\S]*?(?=\d+[、．.]|$)/)
      
      if (optionsMatch) {
        questionBlock += optionsMatch[0]
      }
      
      questions.push(questionBlock.trim())
    }
    
    return questions
  }
  
  /**
   * 解析多个题库文件
   */
  static async parseMultipleFiles(filePaths: string[]): Promise<ParsedQuestionSet[]> {
    const results: ParsedQuestionSet[] = []
    
    for (const filePath of filePaths) {
      try {
        console.log(`正在解析题库文件: ${filePath}`)
        const questionSet = await this.parseHtmlFile(filePath)
        results.push(questionSet)
        console.log(`成功解析题库: ${questionSet.name}, 题目数量: ${questionSet.questions.length}`)
      } catch (error) {
        console.error(`解析文件失败: ${filePath}`, error)
      }
    }
    
    return results
  }
  
  /**
   * 验证题目数据
   */
  static validateQuestionSet(questionSet: ParsedQuestionSet): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    
    if (!questionSet.name.trim()) {
      errors.push('试卷名称不能为空')
    }
    
    if (questionSet.questions.length === 0) {
      errors.push('试卷必须包含至少一道题目')
    }
    
    for (let i = 0; i < questionSet.questions.length; i++) {
      const question = questionSet.questions[i]
      const prefix = `题目 ${question.questionNumber}:`
      
      if (!question.questionText.trim()) {
        errors.push(`${prefix} 题目内容不能为空`)
      }
      
      if (!question.optionA.trim()) errors.push(`${prefix} 选项A不能为空`)
      if (!question.optionB.trim()) errors.push(`${prefix} 选项B不能为空`)
      if (!question.optionC.trim()) errors.push(`${prefix} 选项C不能为空`)
      if (!question.optionD.trim()) errors.push(`${prefix} 选项D不能为空`)
      
      if (!['A', 'B', 'C', 'D'].includes(question.correctAnswer)) {
        errors.push(`${prefix} 正确答案必须是A、B、C、D中的一个`)
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
}