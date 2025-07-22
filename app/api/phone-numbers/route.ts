import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

// 定义运营商类型
export type Carrier = '移动' | '电信' | '联通'

// 定义手机号码数据结构
export interface PhoneNumber {
  id: string
  carrier: Carrier
  number: string
  createdAt: string
  updatedAt: string
}

// 数据文件路径
const DATA_FILE = path.join(process.cwd(), 'data', 'phone-numbers.json')

// 确保数据目录存在
async function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data')
  try {
    await fs.access(dataDir)
  } catch {
    await fs.mkdir(dataDir, { recursive: true })
  }
}

// 读取手机号码数据
async function readPhoneNumbers(): Promise<PhoneNumber[]> {
  try {
    await ensureDataDir()
    const data = await fs.readFile(DATA_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    // 如果文件不存在，返回空数组
    return []
  }
}

// 保存手机号码数据
async function savePhoneNumbers(phoneNumbers: PhoneNumber[]) {
  await ensureDataDir()
  await fs.writeFile(DATA_FILE, JSON.stringify(phoneNumbers, null, 2))
}

// GET - 获取所有手机号码
export async function GET() {
  try {
    const phoneNumbers = await readPhoneNumbers()
    return NextResponse.json({ data: phoneNumbers })
  } catch (error) {
    console.error('Failed to read phone numbers:', error)
    return NextResponse.json(
      { error: '读取数据失败' },
      { status: 500 }
    )
  }
}

// POST - 添加新的手机号码
export async function POST(request: NextRequest) {
  try {
    const { carrier, number } = await request.json()
    
    if (!carrier || !number) {
      return NextResponse.json(
        { error: '运营商和手机号码不能为空' },
        { status: 400 }
      )
    }
    
    if (!['移动', '电信', '联通'].includes(carrier)) {
      return NextResponse.json(
        { error: '无效的运营商类型' },
        { status: 400 }
      )
    }
    
    // 验证手机号码格式
    if (!/^1[3-9]\d{9}$/.test(number)) {
      return NextResponse.json(
        { error: '无效的手机号码格式' },
        { status: 400 }
      )
    }
    
    const phoneNumbers = await readPhoneNumbers()
    
    // 检查号码是否已存在
    if (phoneNumbers.some(p => p.number === number)) {
      return NextResponse.json(
        { error: '该手机号码已存在' },
        { status: 400 }
      )
    }
    
    const newPhoneNumber: PhoneNumber = {
      id: Date.now().toString(),
      carrier,
      number,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    phoneNumbers.push(newPhoneNumber)
    await savePhoneNumbers(phoneNumbers)
    
    return NextResponse.json({ data: newPhoneNumber })
  } catch (error) {
    console.error('Failed to add phone number:', error)
    return NextResponse.json(
      { error: '添加失败' },
      { status: 500 }
    )
  }
}

// PUT - 更新手机号码
export async function PUT(request: NextRequest) {
  try {
    const { id, carrier, number } = await request.json()
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID不能为空' },
        { status: 400 }
      )
    }
    
    const phoneNumbers = await readPhoneNumbers()
    const index = phoneNumbers.findIndex(p => p.id === id)
    
    if (index === -1) {
      return NextResponse.json(
        { error: '手机号码不存在' },
        { status: 404 }
      )
    }
    
    // 检查新号码是否与其他记录重复
    if (number && phoneNumbers.some((p, i) => i !== index && p.number === number)) {
      return NextResponse.json(
        { error: '该手机号码已存在' },
        { status: 400 }
      )
    }
    
    // 更新数据
    if (carrier && ['移动', '电信', '联通'].includes(carrier)) {
      phoneNumbers[index].carrier = carrier
    }
    if (number && /^1[3-9]\d{9}$/.test(number)) {
      phoneNumbers[index].number = number
    }
    phoneNumbers[index].updatedAt = new Date().toISOString()
    
    await savePhoneNumbers(phoneNumbers)
    
    return NextResponse.json({ data: phoneNumbers[index] })
  } catch (error) {
    console.error('Failed to update phone number:', error)
    return NextResponse.json(
      { error: '更新失败' },
      { status: 500 }
    )
  }
}

// DELETE - 删除手机号码
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID不能为空' },
        { status: 400 }
      )
    }
    
    const phoneNumbers = await readPhoneNumbers()
    const filteredNumbers = phoneNumbers.filter(p => p.id !== id)
    
    if (filteredNumbers.length === phoneNumbers.length) {
      return NextResponse.json(
        { error: '手机号码不存在' },
        { status: 404 }
      )
    }
    
    await savePhoneNumbers(filteredNumbers)
    
    return NextResponse.json({ message: '删除成功' })
  } catch (error) {
    console.error('Failed to delete phone number:', error)
    return NextResponse.json(
      { error: '删除失败' },
      { status: 500 }
    )
  }
}