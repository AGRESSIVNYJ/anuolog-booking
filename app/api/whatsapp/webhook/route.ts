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

    // Детальное логирование всего webhook для отладки
    console.log('Webhook получен (полная структура):', JSON.stringify(body, null, 2))
    console.log('Webhook получен (кратко):', {
      typeWebhook,
      idMessage,
      senderPhone: senderData?.sender,
      messageDataKeys: messageData ? Object.keys(messageData) : 'нет messageData',
      messageData: messageData,
    })

    // Обрабатываем только входящие текстовые сообщения
    if (typeWebhook !== 'incomingMessageReceived') {
      console.log('Пропуск: не входящее сообщение, typeWebhook:', typeWebhook)
      return NextResponse.json({ received: true })
    }

    // Пробуем разные варианты получения текста сообщения
    let messageText: string | undefined = undefined
    
    // Green API формат: messageData.textMessageData.textMessage
    if (messageData?.textMessageData?.textMessage) {
      messageText = messageData.textMessageData.textMessage
    } else if (messageData?.textMessage) {
      messageText = messageData.textMessage
    } else if (messageData?.extendedTextMessage?.text) {
      messageText = messageData.extendedTextMessage.text
    } else if (messageData?.message?.extendedTextMessage?.text) {
      messageText = messageData.message.extendedTextMessage.text
    } else if (messageData?.message?.conversation) {
      messageText = messageData.message.conversation
    } else if (typeof messageData === 'string') {
      messageText = messageData
    }

    console.log('Извлеченный текст сообщения:', {
      messageText,
      messageDataStructure: messageData,
    })

    if (!messageText) {
      console.log('Пропуск: текст сообщения не найден')
      return NextResponse.json({ received: true })
    }

    const senderPhone = senderData?.sender
    const normalizedMessageText = messageText.trim().toLowerCase()

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
    const cancelCommands = ['2', 'отмена', 'отменить', 'cancel', 'отменить запись', 'отменить сеанс', 'отмена записи']
    const isCancelCommand = cancelCommands.some(cmd => {
      const normalizedCmd = cmd.toLowerCase().trim()
      return normalizedMessageText === normalizedCmd || normalizedMessageText.includes(normalizedCmd)
    })
    
    console.log('Проверка команды отмены:', {
      originalMessageText: messageText,
      normalizedMessageText,
      isCancelCommand,
      senderPhone,
      cleanPhone,
      searchPhone,
      normalizedSearchPhone
    })

    if (isCancelCommand) {
      // Ищем ближайшую активную запись этого клиента
      const now = new Date()
      
      // Сначала получаем ВСЕ записи для отладки (включая отмененные и прошедшие)
      const allAppointmentsDebug = await prisma.appointment.findMany({
        orderBy: {
          date: 'desc', // Последние записи сначала
        },
        take: 10, // Последние 10 записей
      })
      
      console.log('Последние 10 записей в базе (для отладки):', {
        count: allAppointmentsDebug.length,
        appointments: allAppointmentsDebug.map(a => ({
          id: a.id,
          phone: a.phone,
          phoneNormalized: a.phone.replace(/\D/g, '').slice(-10),
          date: a.date,
          time: a.time,
          status: a.status,
          clientName: a.clientName
        }))
      })
      
      // Получаем все активные записи (не отмененные)
      // Не фильтруем по дате здесь, так как date может хранить только дату без правильного времени
      const allAppointments = await prisma.appointment.findMany({
        where: {
          status: {
            not: 'cancelled',
          },
        },
        orderBy: {
          date: 'asc', // Ближайшая запись первой
        },
      })
      
      // Фильтруем записи, учитывая дату И время записи
      const nowWithTime = new Date()
      const futureAppointments = allAppointments.filter(apt => {
        // Создаем полную дату+время из date (дата) и time (время записи)
        const appointmentDate = new Date(apt.date)
        const [hours, minutes] = apt.time.split(':').map(Number)
        appointmentDate.setHours(hours, minutes, 0, 0)
        
        // Проверяем, что запись в будущем
        return appointmentDate >= nowWithTime
      })
      
      console.log('Активные будущие записи:', {
        count: futureAppointments.length,
        totalActive: allAppointments.length,
        now: nowWithTime.toISOString(),
        appointments: futureAppointments.map(a => {
          const appointmentDate = new Date(a.date)
          const [hours, minutes] = a.time.split(':').map(Number)
          appointmentDate.setHours(hours, minutes, 0, 0)
          return {
            id: a.id,
            phone: a.phone,
            phoneNormalized: a.phone.replace(/\D/g, '').slice(-10),
            date: a.date.toISOString(),
            time: a.time,
            fullDateTime: appointmentDate.toISOString(),
            status: a.status
          }
        })
      })

      // Фильтруем по номеру телефона (нормализуем номера для сравнения)
      const matchingAppointments = futureAppointments.filter(apt => {
        const aptPhone = apt.phone.replace(/\D/g, '')
        const aptNormalized = aptPhone.length >= 10 ? aptPhone.slice(-10) : aptPhone
        const match = aptNormalized === normalizedSearchPhone
        
        console.log('Сравнение номеров:', {
          appointmentId: apt.id,
          aptPhone,
          aptNormalized,
          searchPhone,
          normalizedSearchPhone,
          match
        })
        
        return match
      })

      console.log('Найдено записей для отмены:', {
        totalActiveAppointments: allAppointments.length,
        totalFutureAppointments: futureAppointments.length,
        matchingAppointments: matchingAppointments.length,
        appointments: matchingAppointments.map(a => ({ id: a.id, phone: a.phone, date: a.date, time: a.time }))
      })

      if (matchingAppointments.length === 0) {
        // Не найдено активных записей
        console.log('Активные записи не найдены для номера:', normalizedSearchPhone)
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
        return NextResponse.json({ received: true, message: 'No active appointments found' })
      }

      const appointment = matchingAppointments[0]

      console.log('Отмена записи:', {
        appointmentId: appointment.id,
        clientName: appointment.clientName,
        phone: appointment.phone,
        date: appointment.date,
        time: appointment.time
      })

      // Отменяем запись
      const updatedAppointment = await prisma.appointment.update({
        where: { id: appointment.id },
        data: { status: 'cancelled' },
      })
      
      console.log('Запись отменена успешно:', updatedAppointment.id)

      // Отправляем подтверждение об отмене
      const settings = await prisma.settings.findFirst()
      
      console.log('Проверка настроек WhatsApp для отправки уведомления об отмене:', {
        hasSettings: !!settings,
        whatsappEnabled: settings?.whatsappEnabled,
        hasApiId: !!settings?.whatsappApiId,
        hasApiToken: !!settings?.whatsappApiToken,
        apiId: settings?.whatsappApiId,
        apiTokenLength: settings?.whatsappApiToken?.length,
        phoneNumber: settings?.whatsappPhoneNumber
      })
      
      if (settings?.whatsappEnabled && settings.whatsappApiId && settings.whatsappApiToken) {
        const appointmentDate = new Date(appointment.date)
        const dateStr = `${appointmentDate.getFullYear()}-${String(appointmentDate.getMonth() + 1).padStart(2, '0')}-${String(appointmentDate.getDate()).padStart(2, '0')}`
        const firstName = appointment.clientName.split(' ')[0]
        
        // Короткое сообщение об отмене
        const cancelMessage = `❌ *Запись отменена*\n\n` +
          `👤 Уважаемый(ая) ${firstName}!\n\n` +
          `Ваша запись на ${dateStr} в ${appointment.time} была успешно отменена.\n\n` +
          `Если возникнут вопросы, свяжитесь с нами.`

        // Очищаем номер телефона отправителя для отправки
        const recipientPhone = senderPhone.replace('@c.us', '').replace(/\D/g, '')
        let cleanRecipientPhone = recipientPhone
        if (!cleanRecipientPhone.startsWith('7')) {
          cleanRecipientPhone = `7${cleanRecipientPhone}`
        }

        console.log('Отправка уведомления об отмене:', {
          recipientPhone: cleanRecipientPhone,
          originalSenderPhone: senderPhone,
          appointmentId: appointment.id,
          clientName: appointment.clientName,
          date: dateStr,
          time: appointment.time,
          messageLength: cancelMessage.length,
          messagePreview: cancelMessage.substring(0, 100)
        })

        try {
          const result = await sendWhatsAppMessage(
            {
              apiId: settings.whatsappApiId,
              apiToken: settings.whatsappApiToken,
              phoneNumber: settings.whatsappPhoneNumber || '',
            },
            cleanRecipientPhone,
            cancelMessage
          )

          console.log('Результат отправки уведомления об отмене:', {
            success: result.success,
            error: result.error,
            recipientPhone: cleanRecipientPhone
          })

          if (result.success) {
            console.log('✅ Уведомление об отмене успешно отправлено клиенту:', cleanRecipientPhone)
          } else {
            console.error('❌ Ошибка при отправке уведомления об отмене:', result.error)
          }
        } catch (error) {
          console.error('❌ Исключение при отправке уведомления об отмене:', error)
        }
      } else {
        console.log('⚠️ WhatsApp отключен или не настроен, уведомление об отмене не отправлено')
        console.log('Детали:', {
          whatsappEnabled: settings?.whatsappEnabled,
          hasApiId: !!settings?.whatsappApiId,
          hasApiToken: !!settings?.whatsappApiToken
        })
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

