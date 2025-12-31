import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendWhatsAppMessage, formatReviewRequestMessage } from '@/lib/whatsapp'

/**
 * API endpoint для отправки запросов на отзывы через WhatsApp
 * Отправляет запросы клиентам, у которых завершен сеанс, но еще не был отправлен запрос на отзыв
 */
export async function POST(request: NextRequest) {
  try {
    const settings = await prisma.settings.findFirst()
    
    if (!settings?.whatsappEnabled || !settings.whatsappApiId || !settings.whatsappApiToken) {
      return NextResponse.json(
        { error: 'WhatsApp не настроен' },
        { status: 400 }
      )
    }

    // Находим завершенные записи, для которых еще не был отправлен запрос на отзыв
    // Отправляем запрос через 1 час после завершения сеанса
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000) // 1 час назад
    
    const completedAppointments = await prisma.appointment.findMany({
      where: {
        status: 'completed',
        reviewRequestSent: false,
        // Проверяем, что сеанс завершен более часа назад
        updatedAt: {
          lte: oneHourAgo,
        },
      },
      orderBy: {
        updatedAt: 'asc',
      },
      take: 10, // Обрабатываем по 10 записей за раз
    })

    console.log('Найдено записей для отправки запроса на отзыв:', completedAppointments.length)

    const results = []

    for (const appointment of completedAppointments) {
      try {
        // Формируем сообщение
        const message = formatReviewRequestMessage(
          appointment.clientName,
          settings.reviewRequestTemplate
        )

        // Отправляем сообщение
        const result = await sendWhatsAppMessage(
          {
            apiId: settings.whatsappApiId,
            apiToken: settings.whatsappApiToken,
            phoneNumber: settings.whatsappPhoneNumber || '',
          },
          appointment.phone,
          message
        )

        if (result.success) {
          // Помечаем, что запрос на отзыв отправлен
          await prisma.appointment.update({
            where: { id: appointment.id },
            data: { reviewRequestSent: true },
          })

          console.log(`Запрос на отзыв отправлен для записи ${appointment.id}`)
          results.push({ appointmentId: appointment.id, success: true })
        } else {
          console.error(`Ошибка при отправке запроса на отзыв для записи ${appointment.id}:`, result.error)
          results.push({ appointmentId: appointment.id, success: false, error: result.error })
        }
      } catch (error) {
        console.error(`Ошибка при обработке записи ${appointment.id}:`, error)
        results.push({ appointmentId: appointment.id, success: false, error: error instanceof Error ? error.message : 'Неизвестная ошибка' })
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    })
  } catch (error) {
    console.error('Ошибка при отправке запросов на отзывы:', error)
    return NextResponse.json(
      { error: 'Ошибка при отправке запросов на отзывы' },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint для ручной отправки запросов на отзывы (для тестирования)
 */
export async function GET() {
  try {
    const settings = await prisma.settings.findFirst()
    
    if (!settings?.whatsappEnabled || !settings.whatsappApiId || !settings.whatsappApiToken) {
      return NextResponse.json(
        { error: 'WhatsApp не настроен' },
        { status: 400 }
      )
    }

    // Находим завершенные записи без отправленного запроса на отзыв
    const completedAppointments = await prisma.appointment.findMany({
      where: {
        status: 'completed',
        reviewRequestSent: false,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 5,
    })

    return NextResponse.json({
      count: completedAppointments.length,
      appointments: completedAppointments.map(a => ({
        id: a.id,
        clientName: a.clientName,
        phone: a.phone,
        date: a.date,
        time: a.time,
        updatedAt: a.updatedAt,
      })),
    })
  } catch (error) {
    console.error('Ошибка при получении записей для запроса отзывов:', error)
    return NextResponse.json(
      { error: 'Ошибка при получении записей' },
      { status: 500 }
    )
  }
}
