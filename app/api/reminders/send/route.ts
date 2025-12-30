import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendWhatsAppMessage, formatReminderMessage } from '@/lib/whatsapp'

// Проверка авторизации для cron jobs (опционально, для безопасности)
function verifyCronRequest(request: NextRequest): boolean {
  // Для Vercel Cron Jobs заголовок автоматически добавляется
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  // Если установлен CRON_SECRET, проверяем его
  if (cronSecret) {
    return authHeader === `Bearer ${cronSecret}`
  }
  
  // Если CRON_SECRET не установлен, разрешаем запрос (для разработки)
  return true
}

export async function POST(request: NextRequest) {
  // Проверка авторизации (опционально)
  if (!verifyCronRequest(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
  try {
    const settings = await prisma.settings.findFirst()

    if (!settings?.whatsappEnabled || !settings.whatsappApiId || !settings.whatsappApiToken) {
      return NextResponse.json(
        { error: 'WhatsApp не настроен' },
        { status: 400 }
      )
    }

    // Получаем текущую дату и время
    const now = new Date()
    
    // Ищем все будущие записи, которые еще не отменили
    const appointments = await prisma.appointment.findMany({
      where: {
        status: {
          not: 'cancelled',
        },
        date: {
          gte: now, // Только будущие записи
        },
      },
    })

    let sent24hCount = 0
    let sent3hCount = 0
    let errorCount = 0

    for (const appointment of appointments) {
      try {
        const appointmentDate = new Date(appointment.date)
        const appointmentDateTime = new Date(appointmentDate)
        
        // Парсим время из строки (формат "HH:MM")
        const [hours, minutes] = appointment.time.split(':').map(Number)
        appointmentDateTime.setHours(hours, minutes, 0, 0)

        const hoursUntil = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)
        
        // Проверяем напоминание за 24 часа (22-26 часов до записи)
        if (!appointment.reminder24hSent && hoursUntil >= 22 && hoursUntil <= 26) {
          const message = formatReminderMessage(
            appointment.clientName,
            appointmentDate,
            appointment.time,
            settings.officeAddress,
            settings.sessionPrice,
            settings.reminderMessageTemplate,
            '24 часа'
          )

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
            await prisma.appointment.update({
              where: { id: appointment.id },
              data: { reminder24hSent: true },
            })
            sent24hCount++
          } else {
            console.error(`Ошибка отправки напоминания за 24ч для записи ${appointment.id}:`, result.error)
            errorCount++
          }
        }
        
        // Проверяем напоминание за 3 часа (2-4 часа до записи)
        if (!appointment.reminder3hSent && hoursUntil >= 2 && hoursUntil <= 4) {
          const message = formatReminderMessage(
            appointment.clientName,
            appointmentDate,
            appointment.time,
            settings.officeAddress,
            settings.sessionPrice,
            settings.reminderMessageTemplate,
            '3 часа'
          )

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
            await prisma.appointment.update({
              where: { id: appointment.id },
              data: { reminder3hSent: true },
            })
            sent3hCount++
          } else {
            console.error(`Ошибка отправки напоминания за 3ч для записи ${appointment.id}:`, result.error)
            errorCount++
          }
        }
      } catch (error) {
        console.error(`Ошибка при обработке записи ${appointment.id}:`, error)
        errorCount++
      }
    }

    const totalSent = sent24hCount + sent3hCount

    return NextResponse.json({
      success: true,
      message: `Обработано записей: ${appointments.length}, отправлено: ${totalSent} (24ч: ${sent24hCount}, 3ч: ${sent3hCount}), ошибок: ${errorCount}`,
      sent24h: sent24hCount,
      sent3h: sent3hCount,
      sent: totalSent,
      errors: errorCount,
      total: appointments.length,
    })
  } catch (error) {
    console.error('Ошибка при отправке напоминаний:', error)
    return NextResponse.json(
      { error: 'Ошибка при отправке напоминаний' },
      { status: 500 }
    )
  }
}

