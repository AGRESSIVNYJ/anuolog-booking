import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)

    await prisma.blockedDate.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Дата разблокирована' })
  } catch (error) {
    console.error('Ошибка при удалении заблокированной даты:', error)
    return NextResponse.json(
      { error: 'Ошибка при удалении заблокированной даты' },
      { status: 500 }
    )
  }
}




