import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { testPhone } = body

    const settings = await prisma.settings.findFirst()

    if (!settings?.whatsappEnabled || !settings.whatsappApiId || !settings.whatsappApiToken) {
      return NextResponse.json(
        { error: 'WhatsApp не настроен. Заполните настройки в админ-панели.' },
        { status: 400 }
      )
    }

    if (!testPhone) {
      return NextResponse.json(
        { error: 'Укажите номер телефона для теста' },
        { status: 400 }
      )
    }

    const testMessage = 'Тестовое сообщение от системы записи. Если вы получили это сообщение, значит WhatsApp уведомления настроены правильно! ✅'

    const result = await sendWhatsAppMessage(
      {
        apiId: settings.whatsappApiId,
        apiToken: settings.whatsappApiToken,
        phoneNumber: settings.whatsappPhoneNumber || '',
      },
      testPhone,
      testMessage
    )

    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Тестовое сообщение успешно отправлено!' 
      })
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Ошибка при отправке сообщения' 
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Ошибка при тестировании WhatsApp:', error)
    return NextResponse.json(
      { error: 'Ошибка при тестировании WhatsApp' },
      { status: 500 }
    )
  }
}


