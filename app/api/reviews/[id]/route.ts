import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    const body = await request.json()
    const { status } = body

    if (status && !['pending', 'approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Некорректный статус' },
        { status: 400 }
      )
    }

    const review = await prisma.review.update({
      where: { id },
      data: body,
    })

    return NextResponse.json(review)
  } catch (error) {
    console.error('Ошибка при обновлении отзыва:', error)
    return NextResponse.json(
      { error: 'Ошибка при обновлении отзыва' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)

    await prisma.review.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Отзыв удален' })
  } catch (error) {
    console.error('Ошибка при удалении отзыва:', error)
    return NextResponse.json(
      { error: 'Ошибка при удалении отзыва' },
      { status: 500 }
    )
  }
}




