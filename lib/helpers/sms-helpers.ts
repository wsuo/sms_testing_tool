import { SmsStatus } from '@/hooks/useSmsStatus'

export const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case "已送达":
      return "default"
    case "发送失败":
      return "destructive"
    case "发送中":
      return "secondary"
    case "发送中(已停止查询)":
      return "outline"
    default:
      return "outline"
  }
}

// 错误代码转换为可读信息
export const getErrorMessage = (errorCode: string) => {
  const errorMap: Record<string, string> = {
    'IS_CLOSE': '短信通道被关停，阿里云会自动剔除被关停通道，建议稍后重试',
    'PARAMS_ILLEGAL': '参数错误，请检查短信签名、短信文案或手机号码等参数是否传入正确',
    'MOBILE_NOT_ON_SERVICE': '手机号停机、空号、暂停服务、关机或不在服务区，请核实接收手机号码状态是否正常',
    'MOBILE_SEND_LIMIT': '单个号码日、月发送上限或频繁发送超限，为防止恶意调用已进行流控限制',
    'MOBILE_ACCOUNT_ABNORMAL': '用户账户异常、携号转网或欠费等，建议检查号码状态确保正常后重试',
    'MOBILE_IN_BLACK': '手机号在黑名单中，通常是用户已退订此签名或命中运营商平台黑名单规则',
    'MOBLLE_TERMINAL_ERROR': '手机终端问题，如内存满、SIM卡满、非法设备等，建议检查终端设备状况',
    'CONTENT_KEYWORD': '内容关键字拦截，运营商自动拦截潜在风险或高投诉的内容关键字',
    'INVALID_NUMBER': '号码状态异常，如关机、停机、空号、暂停服务、不在服务区或号码格式错误',
    'CONTENT_ERROR': '推广短信内容中必须带退订信息，请在短信结尾添加"拒收请回复R"',
    'REQUEST_SUCCESS': '请求成功但未收到运营商回执，大概率是接收用户状态异常导致',
    'SP_NOT_BY_INTER_SMS': '收件人未开通国际短信功能，请联系运营商开通后再发送',
    'SP_UNKNOWN_ERROR': '运营商未知错误，阿里云平台接收到的运营商回执报告为未知错误',
    'USER_REJECT': '接收用户已退订此业务或产品未开通，建议将此类用户剔除出发送清单',
    'NO_ROUTE': '当前短信内容无可用通道发送，发送的业务场景属于暂时无法支持的场景',
    'isv.UNSUPPORTED_CONTENT': '不支持的短信内容，包含繁体字、emoji表情符号或其他非常用字符',
    'isv.SMS_CONTENT_MISMATCH_TEMPLATE_TYPE': '短信内容和模板属性不匹配，通知模板无法发送推广营销文案',
    'isv.ONE_CODE_MULTIPLE_SIGN': '一码多签，当前传入的扩展码和签名与历史记录不一致',
    'isv.CODE_EXCEED_LIMIT': '自拓扩展码个数已超过上限，无法分配新的扩展码发送新签名',
    'isv.CODE_ERROR': '传入扩展码不可用，自拓扩展位数超限',
    'PORT_NOT_REGISTERED': '当前使用端口号尚未完成企业实名制报备流程，需要完成实名制报备',
    'isv.SIGN_SOURCE_ILLEGAL': '签名来源不支持，创建和修改签名时使用了不支持的签名来源',
    'DELIVERED': '已送达' // 成功状态，不是错误
  }

  return errorMap[errorCode] || `未知错误代码: ${errorCode}`
}

// 错误分类功能
export interface ErrorCategory {
  category: string
  color: string
  icon: string
  description: string
}

export const getErrorCategory = (errorCode: string): ErrorCategory => {
  // 用户相关问题 - 手机号码状态异常
  if ([
    'MOBILE_NOT_ON_SERVICE',
    'INVALID_NUMBER', 
    'MOBILE_ACCOUNT_ABNORMAL',
    'MOBLLE_TERMINAL_ERROR'
  ].some(code => errorCode.includes(code))) {
    return {
      category: '用户问题',
      color: 'destructive',
      icon: '📵',
      description: '接收方手机号码或设备问题'
    }
  }
  
  // 内容相关问题 - 短信内容或模板问题
  if ([
    'CONTENT_KEYWORD',
    'CONTENT_ERROR',
    'isv.UNSUPPORTED_CONTENT',
    'isv.SMS_CONTENT_MISMATCH_TEMPLATE_TYPE'
  ].some(code => errorCode.includes(code))) {
    return {
      category: '内容问题',
      color: 'secondary',
      icon: '🚫',
      description: '短信内容被拦截或格式不符'
    }
  }
  
  // 用户拒绝/黑名单问题
  if ([
    'MOBILE_IN_BLACK',
    'USER_REJECT'
  ].some(code => errorCode.includes(code))) {
    return {
      category: '用户拒绝',
      color: 'outline',
      icon: '🛑',
      description: '用户主动拒绝或在黑名单中'
    }
  }
  
  // 发送限制问题
  if ([
    'MOBILE_SEND_LIMIT'
  ].some(code => errorCode.includes(code))) {
    return {
      category: '发送限制',
      color: 'default',
      icon: '⏰',
      description: '发送频率或数量超限'
    }
  }
  
  // 网络/通道问题
  if ([
    'IS_CLOSE',
    'NO_ROUTE',
    'SP_UNKNOWN_ERROR',
    'REQUEST_SUCCESS'
  ].some(code => errorCode.includes(code))) {
    return {
      category: '通道问题',
      color: 'destructive',
      icon: '🌐',
      description: '短信通道或网络问题'
    }
  }
  
  // 配置/参数问题
  if ([
    'PARAMS_ILLEGAL',
    'isv.ONE_CODE_MULTIPLE_SIGN',
    'isv.CODE_EXCEED_LIMIT',
    'isv.CODE_ERROR',
    'PORT_NOT_REGISTERED',
    'isv.SIGN_SOURCE_ILLEGAL'
  ].some(code => errorCode.includes(code))) {
    return {
      category: '配置问题',
      color: 'secondary',
      icon: '⚙️',
      description: '短信配置或参数错误'
    }
  }
  
  // 功能限制问题
  if ([
    'SP_NOT_BY_INTER_SMS'
  ].some(code => errorCode.includes(code))) {
    return {
      category: '功能限制',
      color: 'outline',
      icon: '🔒',
      description: '功能未开通或不支持'
    }
  }
  
  // 默认分类
  return {
    category: '其他问题',
    color: 'default',
    icon: '⚠️',
    description: '其他未分类的问题'
  }
}

// 获取错误分类统计
export const getErrorCategoryStats = (failureReasons: Array<{errorCode: string, count: number}>) => {
  const categoryMap = new Map<string, {category: ErrorCategory, count: number}>()
  
  failureReasons.forEach(reason => {
    const category = getErrorCategory(reason.errorCode)
    const existing = categoryMap.get(category.category)
    
    if (existing) {
      existing.count += reason.count
    } else {
      categoryMap.set(category.category, {
        category,
        count: reason.count
      })
    }
  })
  
  return Array.from(categoryMap.values())
    .sort((a, b) => b.count - a.count)
}

// 计算后台监控状态
export const getMonitoringStatus = (smsStatuses: SmsStatus[]) => {
  const pendingCount = smsStatuses.filter(sms => 
    sms.status === "发送中" || sms.status === "发送中(已停止查询)"
  ).length
  
  if (pendingCount > 0) {
    return {
      isMonitoring: true,
      text: `后台监控中 (${pendingCount}条)`,
      variant: "default" as const
    }
  } else {
    return {
      isMonitoring: false,  
      text: "监控空闲",
      variant: "secondary" as const
    }
  }
}