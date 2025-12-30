import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const where = status ? { status } : {}

    const reviews = await prisma.review.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(reviews)
  } catch (error) {
    console.error('Ошибка при получении отзывов:', error)
    return NextResponse.json(
      { error: 'Ошибка при получении отзывов' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clientName, rating, comment } = body

    if (!clientName || !rating) {
      return NextResponse.json(
        { error: 'Заполните все обязательные поля' },
        { status: 400 }
      )
    }

    // Валидация рейтинга
    const ratingNum = parseInt(String(rating))
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return NextResponse.json(
        { error: 'Рейтинг должен быть от 1 до 5' },
        { status: 400 }
      )
    }

    const review = await prisma.review.create({
      data: {
        clientName,
        rating: ratingNum,
        comment: comment?.trim() || null,
        status: 'pending', // Новые отзывы требуют модерации
      },
    })

    return NextResponse.json(review, { status: 201 })
  } catch (error) {
    console.error('Ошибка при создании отзыва:', error)
    return NextResponse.json(
      { error: 'Ошибка при создании отзыва' },
      { status: 500 }
    )
  }
}




