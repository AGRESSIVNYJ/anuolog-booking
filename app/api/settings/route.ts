import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    let settings = await prisma.settings.findFirst()

    // Если настроек нет, создаем дефолтные
    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          workDays: '[1,2,3,4,5]',
          workStartTime: '09:00',
          workEndTime: '19:00',
          sessionDuration: 30,
        },
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    return NextResponse.json(
      { error: 'Ошибка при получении настроек' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      workDays, 
      workStartTime, 
      workEndTime, 
      sessionDuration, 
      breakStartTime, 
      breakEndTime, 
      officeAddress,
      sessionPrice,
      whatsappEnabled,
      whatsappApiId,
      whatsappApiToken,
      whatsappPhoneNumber,
      confirmationMessageTemplate,
      reminderMessageTemplate
    } = body

    // Валидация обязательных полей
    if (!workDays || !workStartTime || !workEndTime || sessionDuration === undefined) {
      return NextResponse.json(
        { error: 'Заполните все обязательные поля' },
        { status: 400 }
      )
    }

    // Валидация sessionDuration
    const duration = parseInt(String(sessionDuration))
    if (isNaN(duration) || duration < 15 || duration > 120) {
      return NextResponse.json(
        { error: 'Длительность сеанса должна быть от 15 до 120 минут' },
        { status: 400 }
      )
    }

    // Обработка пустых строк для перерыва и адреса
    const breakStart = breakStartTime && breakStartTime.trim() !== '' ? breakStartTime.trim() : null
    const breakEnd = breakEndTime && breakEndTime.trim() !== '' ? breakEndTime.trim() : null
    const address = officeAddress && officeAddress.trim() !== '' ? officeAddress.trim() : null
    const price = sessionPrice !== undefined && sessionPrice !== null && sessionPrice !== '' 
      ? parseInt(String(sessionPrice)) 
      : null
    
    // Обработка настроек WhatsApp
    const whatsappId = whatsappApiId && whatsappApiId.trim() !== '' ? whatsappApiId.trim() : null
    const whatsappToken = whatsappApiToken && whatsappApiToken.trim() !== '' ? whatsappApiToken.trim() : null
    const whatsappPhone = whatsappPhoneNumber && whatsappPhoneNumber.trim() !== '' ? whatsappPhoneNumber.trim() : null
    const confirmationTemplate = confirmationMessageTemplate && confirmationMessageTemplate.trim() !== '' ? confirmationMessageTemplate.trim() : null
    const reminderTemplate = reminderMessageTemplate && reminderMessageTemplate.trim() !== '' ? reminderMessageTemplate.trim() : null

    let settings = await prisma.settings.findFirst()

    if (settings) {
      // Обновляем существующие настройки
      settings = await prisma.settings.update({
        where: { id: settings.id },
        data: {
          workDays: workDays,
          workStartTime: workStartTime,
          workEndTime: workEndTime,
          sessionDuration: duration,
          breakStartTime: breakStart,
          breakEndTime: breakEnd,
          officeAddress: address,
          sessionPrice: price,
          whatsappEnabled: whatsappEnabled || false,
          whatsappApiId: whatsappId,
          whatsappApiToken: whatsappToken,
          whatsappPhoneNumber: whatsappPhone,
          confirmationMessageTemplate: confirmationTemplate,
          reminderMessageTemplate: reminderTemplate,
        },
      })
    } else {
      // Создаем новые настройки
      settings = await prisma.settings.create({
        data: {
          workDays: workDays,
          workStartTime: workStartTime,
          workEndTime: workEndTime,
          sessionDuration: duration,
          breakStartTime: breakStart,
          breakEndTime: breakEnd,
          officeAddress: address,
          sessionPrice: price,
          whatsappEnabled: whatsappEnabled || false,
          whatsappApiId: whatsappId,
          whatsappApiToken: whatsappToken,
          whatsappPhoneNumber: whatsappPhone,
          confirmationMessageTemplate: confirmationTemplate,
          reminderMessageTemplate: reminderTemplate,
        },
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Ошибка при сохранении настроек:', error)
    return NextResponse.json(
      { 
        error: 'Ошибка при сохранении настроек',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка'
      },
      { status: 500 }
    )
  }
}

