import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const blockedDates = await prisma.blockedDate.findMany({
      orderBy: {
        date: 'asc',
      },
    })
    return NextResponse.json(blockedDates)
  } catch (error) {
    console.error('Ошибка при получении заблокированных дат:', error)
    return NextResponse.json(
      { error: 'Ошибка при получении заблокированных дат' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date, reason } = body

    if (!date) {
      return NextResponse.json(
        { error: 'Укажите дату для блокировки' },
        { status: 400 }
      )
    }

    // Проверяем, не заблокирована ли уже эта дата
    const existing = await prisma.blockedDate.findUnique({
      where: { date: new Date(date) },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Эта дата уже заблокирована' },
        { status: 400 }
      )
    }

    const blockedDate = await prisma.blockedDate.create({
      data: {
        date: new Date(date),
        reason: reason || null,
      },
    })

    return NextResponse.json(blockedDate, { status: 201 })
  } catch (error) {
    console.error('Ошибка при создании заблокированной даты:', error)
    return NextResponse.json(
      { error: 'Ошибка при создании заблокированной даты' },
      { status: 500 }
    )
  }
}




