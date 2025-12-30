import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    const body = await request.json()

    const appointment = await prisma.appointment.update({
      where: { id },
      data: body,
    })

    return NextResponse.json(appointment)
  } catch (error) {
    return NextResponse.json(
      { error: 'Ошибка при обновлении записи' },
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

    await prisma.appointment.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Запись удалена' })
  } catch (error) {
    return NextResponse.json(
      { error: 'Ошибка при удалении записи' },
      { status: 500 }
    )
  }
}




