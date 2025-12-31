import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    const body = await request.json()
    const { status, instagramUsername } = body

    if (status && !['pending', 'approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Некорректный статус' },
        { status: 400 }
      )
    }

    // Очищаем Instagram username от @ и лишних символов
    const updateData: any = { ...body }
    if (instagramUsername !== undefined) {
      updateData.instagramUsername = instagramUsername 
        ? instagramUsername.trim().replace(/^@/, '').replace(/[^a-zA-Z0-9._]/g, '')
        : null
    }

    const review = await prisma.review.update({
      where: { id },
      data: updateData,
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




