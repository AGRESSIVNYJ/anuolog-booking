import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendWhatsAppMessage, formatAppointmentMessage } from '@/lib/whatsapp'

export async function GET() {
  try {
    const appointments = await prisma.appointment.findMany({
      orderBy: {
        date: 'asc',
      },
    })
    return NextResponse.json(appointments)
  } catch (error) {
    return NextResponse.json(
      { error: 'Ошибка при получении записей' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clientName, phone, email, date, time, notes } = body

    if (!clientName || !phone || !date || !time) {
      return NextResponse.json(
        { error: 'Заполните все обязательные поля' },
        { status: 400 }
      )
    }

    const appointment = await prisma.appointment.create({
      data: {
        clientName,
        phone,
        email: email || null,
        date: new Date(date),
        time,
        notes: notes || null,
      },
    })

    // Отправляем уведомление в WhatsApp, если настроено
    try {
      const settings = await prisma.settings.findFirst()
      console.log('WhatsApp настройки:', {
        enabled: settings?.whatsappEnabled,
        hasApiId: !!settings?.whatsappApiId,
        hasApiToken: !!settings?.whatsappApiToken,
        hasPhoneNumber: !!settings?.whatsappPhoneNumber,
        sessionPrice: settings?.sessionPrice,
        sessionPriceType: typeof settings?.sessionPrice,
      })

      if (
        settings?.whatsappEnabled &&
        settings.whatsappApiId &&
        settings.whatsappApiToken &&
        settings.whatsappPhoneNumber
      ) {
        const message = formatAppointmentMessage(
          clientName,
          new Date(date),
          time,
          settings.officeAddress,
          settings.sessionPrice,
          settings.confirmationMessageTemplate
        )

        console.log('Отправка WhatsApp сообщения:', {
          to: phone,
          apiId: settings.whatsappApiId,
          apiTokenLength: settings.whatsappApiToken?.length || 0,
          messageLength: message.length,
          sessionPrice: settings.sessionPrice,
          hasPrice: !!settings.sessionPrice && settings.sessionPrice > 0,
        })

        const result = await sendWhatsAppMessage(
          {
            apiId: settings.whatsappApiId,
            apiToken: settings.whatsappApiToken,
            phoneNumber: settings.whatsappPhoneNumber,
          },
          phone,
          message
        )

        if (result.success) {
          console.log('WhatsApp сообщение успешно отправлено')
        } else {
          console.error('Ошибка отправки WhatsApp:', result.error)
        }
      } else {
        console.log('WhatsApp уведомления отключены или не настроены')
      }
    } catch (error) {
      // Не прерываем создание записи, если отправка WhatsApp не удалась
      console.error('Ошибка при отправке WhatsApp уведомления:', error)
    }

    return NextResponse.json(appointment, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Ошибка при создании записи' },
      { status: 500 }
    )
  }
}



