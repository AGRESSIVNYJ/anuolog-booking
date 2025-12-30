import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendWhatsAppMessage, formatAppointmentMessage } from '@/lib/whatsapp'

/**
 * Webhook для получения входящих сообщений от Green API
 * Настройте этот URL в личном кабинете Green API: https://console.green-api.com/
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Структура входящего сообщения от Green API
    // https://green-api.com/docs/api/receiving/notifications-format/
    const { typeWebhook, instanceData, timestamp, idMessage, senderData, messageData } = body

    console.log('Webhook получен:', {
      typeWebhook,
      idMessage,
      senderPhone: senderData?.sender,
      messageText: messageData?.textMessage,
    })

    // Обрабатываем только входящие текстовые сообщения
    if (typeWebhook !== 'incomingMessageReceived' || !messageData?.textMessage) {
      return NextResponse.json({ received: true })
    }

    const senderPhone = senderData?.sender
    const messageText = messageData.textMessage.trim().toLowerCase()

    if (!senderPhone) {
      return NextResponse.json({ received: true })
    }

    // Очищаем номер телефона для поиска
    const cleanPhone = senderPhone.replace('@c.us', '').replace(/\D/g, '')
    let searchPhone = cleanPhone
    if (!searchPhone.startsWith('7')) {
      searchPhone = `7${searchPhone}`
    }
    
    // Нормализуем номер для поиска (последние 10 цифр)
    const normalizedSearchPhone = searchPhone.slice(-10)

    // Проверяем команды отмены
    const cancelCommands = ['2', 'отмена', 'отменить', 'cancel', 'отменить запись', 'отменить сеанс']
    const isCancelCommand = cancelCommands.some(cmd => messageText === cmd || messageText.includes(cmd))

    if (isCancelCommand) {
      // Ищем ближайшую активную запись этого клиента
      const now = new Date()
      
      // Получаем все активные записи
      const allAppointments = await prisma.appointment.findMany({
        where: {
          status: {
            not: 'cancelled',
          },
          date: {
            gte: now, // Только будущие записи
          },
        },
        orderBy: {
          date: 'asc', // Ближайшая запись первой
        },
      })

      // Фильтруем по номеру телефона (нормализуем номера для сравнения)
      const matchingAppointments = allAppointments.filter(apt => {
        const aptPhone = apt.phone.replace(/\D/g, '')
        const aptNormalized = aptPhone.length >= 10 ? aptPhone.slice(-10) : aptPhone
        return aptNormalized === normalizedSearchPhone
      })

      if (matchingAppointments.length === 0) {
        // Не найдено активных записей
        const settings = await prisma.settings.findFirst()
        if (settings?.whatsappEnabled && settings.whatsappApiId && settings.whatsappApiToken) {
          await sendWhatsAppMessage(
            {
              apiId: settings.whatsappApiId,
              apiToken: settings.whatsappApiToken,
              phoneNumber: settings.whatsappPhoneNumber || '',
            },
            senderPhone.replace('@c.us', ''),
            '❌ У вас нет активных записей для отмены.'
          )
        }
        return NextResponse.json({ received: true })
      }

      const appointment = matchingAppointments[0]

      // Отменяем запись
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { status: 'cancelled' },
      })

      // Отправляем подтверждение об отмене
      const settings = await prisma.settings.findFirst()
      if (settings?.whatsappEnabled && settings.whatsappApiId && settings.whatsappApiToken) {
        const appointmentDate = new Date(appointment.date)
        const dateStr = `${appointmentDate.getFullYear()}-${String(appointmentDate.getMonth() + 1).padStart(2, '0')}-${String(appointmentDate.getDate()).padStart(2, '0')}`
        
        const cancelMessage = `✅ *Запись отменена*\n\n` +
          `👤 Уважаемый(ая) ${appointment.clientName.split(' ')[0]}!\n\n` +
          `Ваша запись была успешно отменена:\n\n` +
          `📅 Дата: ${dateStr}\n` +
          `⏰ Время: ${appointment.time}\n\n` +
          `Если у вас возникнут вопросы, свяжитесь с нами.`

        await sendWhatsAppMessage(
          {
            apiId: settings.whatsappApiId,
            apiToken: settings.whatsappApiToken,
            phoneNumber: settings.whatsappPhoneNumber || '',
          },
          senderPhone.replace('@c.us', ''),
          cancelMessage
        )
      }

      console.log(`Запись ${appointment.id} отменена клиентом ${senderPhone}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Ошибка при обработке webhook:', error)
    // Всегда возвращаем успешный ответ, чтобы Green API не повторял запрос
    return NextResponse.json({ received: true })
  }
}

// GET для проверки webhook (Green API может проверять доступность)
export async function GET() {
  return NextResponse.json({ status: 'ok', message: 'Webhook is active' })
}

