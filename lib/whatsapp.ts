/**
 * Утилита для отправки сообщений в WhatsApp через Green API
 * Документация: https://green-api.com/docs/
 */

type WhatsAppConfig = {
  apiId: string
  apiToken: string
  phoneNumber: string
}

export async function sendWhatsAppMessage(
  config: WhatsAppConfig,
  to: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Очищаем номер телефона от лишних символов
    const cleanPhone = to.replace(/\D/g, '')
    
    // Если номер начинается с +7, убираем +
    // Если номер начинается с 7, оставляем как есть
    // Если номер начинается с другого, добавляем 7
    let phoneNumber = cleanPhone
    if (!phoneNumber.startsWith('7')) {
      phoneNumber = `7${phoneNumber}`
    }

    // Формируем URL для Green API
    // Правильный формат: https://api.green-api.com/waInstance{idInstance}/sendMessage/{apiTokenInstance}
    const url = `https://api.green-api.com/waInstance${config.apiId}/sendMessage/${config.apiToken}`
    
    const requestBody = {
      chatId: `${phoneNumber}@c.us`,
      message: message,
    }

    console.log('WhatsApp запрос:', {
      url: url.replace(config.apiToken, '***'),
      apiId: config.apiId,
      apiTokenLength: config.apiToken.length,
      chatId: requestBody.chatId,
      messageLength: message.length,
    })
    
    // Дополнительная проверка формата
    if (!config.apiId || !config.apiToken) {
      return {
        success: false,
        error: 'ID API или токен не указаны',
      }
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    let responseData: any = {}
    try {
      const text = await response.text()
      if (text) {
        responseData = JSON.parse(text)
      }
    } catch (e) {
      // Если не JSON, оставляем пустой объект
    }

    console.log('WhatsApp ответ:', {
      status: response.status,
      statusText: response.statusText,
      data: responseData,
    })

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`
      
      if (response.status === 401) {
        errorMessage = 'Ошибка авторизации (401). Возможные причины:\n' +
          '1. Неверный ID API или токен\n' +
          '2. Токен истек - обновите его в личном кабинете Green API\n' +
          '3. Инстанс не авторизован - проверьте статус в личном кабинете\n' +
          '4. Убедитесь, что скопировали токен полностью, без пробелов'
      } else if (responseData.errorText) {
        errorMessage = responseData.errorText
      } else if (responseData.error) {
        errorMessage = responseData.error
      }

      console.error('Детали ошибки WhatsApp:', {
        status: response.status,
        statusText: response.statusText,
        responseData,
        apiId: config.apiId,
        tokenLength: config.apiToken.length,
      })

      return {
        success: false,
        error: errorMessage,
      }
    }

    // Проверяем, есть ли ошибка в ответе (Green API может возвращать 200 с ошибкой)
    if (responseData.error) {
      return {
        success: false,
        error: responseData.errorText || responseData.error || 'Ошибка API',
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Ошибка при отправке WhatsApp сообщения:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Неизвестная ошибка',
    }
  }
}

export function formatAppointmentMessage(
  clientName: string,
  date: Date,
  time: string,
  officeAddress?: string | null,
  sessionPrice?: number | null,
  template?: string | null
): string {
  // Форматируем дату как YYYY-MM-DD
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const dateStr = `${year}-${month}-${day}`

  // Извлекаем имя (первое слово)
  const firstName = clientName.split(' ')[0]

  // Если есть пользовательский шаблон, используем его
  if (template && template.trim() !== '') {
    let message = template
    message = message.replace(/{clientName}/g, clientName)
    message = message.replace(/{firstName}/g, firstName)
    message = message.replace(/{date}/g, dateStr)
    message = message.replace(/{time}/g, time)
    
    // Обработка цены - показываем только если указана
    if (sessionPrice !== null && sessionPrice !== undefined && sessionPrice > 0) {
      message = message.replace(/{price}/g, sessionPrice.toLocaleString('ru-RU'))
    } else {
      // Удаляем строки с ценой, если она не указана
      message = message.replace(/💰 Стоимость: \{price\} тенге\n\n?/g, '')
      message = message.replace(/💰 Стоимость: \{price\} тенге/g, '')
    }
    
    // Обработка адреса
    if (officeAddress) {
      message = message.replace(/{address}/g, officeAddress)
    } else {
      // Удаляем строки с адресом, если он не указан
      message = message.replace(/📍 \{address\}\n\n?/g, '')
      message = message.replace(/📍 \{address\}/g, '')
    }
    
    return message
  }

  // Стандартный шаблон
  let message = `✅ *ПОДТВЕРЖДЕНИЕ ЗАПИСИ*\n\n\n`
  message += `👤 *Уважаемый(ая) ${firstName}!*\n\n`
  message += `📅 *ДЕТАЛИ ЗАПИСИ*\n\n`
  message += `━━━━━━━━━━━━━━━━\n\n`
  message += `📅 Дата: ${dateStr}\n\n`
  message += `⏰ Время: ${time}\n\n`
  
  // Всегда показываем стоимость, если она указана
  if (sessionPrice !== null && sessionPrice !== undefined && sessionPrice > 0) {
    message += `💰 Стоимость: ${sessionPrice.toLocaleString('ru-RU')} тенге\n\n`
  }
  
  if (officeAddress) {
    message += `📍 ${officeAddress}\n\n`
  }
  
  message += `\n❗️ *ВАЖНО*\n\n`
  message += `━━━━━━━━━━━━━━━━\n\n`
  message += `• Запись успешно создана\n\n`
  message += `• За 3 часа до записи вы получите напоминание\n\n`
  message += `• Если у вас изменились планы, сообщите нам заранее\n\n`
  message += `\nЖду вас на приёме!`

  return message
}

export function formatReminderMessage(
  clientName: string,
  date: Date,
  time: string,
  officeAddress?: string | null,
  sessionPrice?: number | null,
  template?: string | null,
  hoursBefore: string = '3 часа'
): string {
  // Форматируем дату как YYYY-MM-DD
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const dateStr = `${year}-${month}-${day}`

  // Извлекаем имя (первое слово)
  const firstName = clientName.split(' ')[0]

  // Если есть пользовательский шаблон, используем его
  if (template && template.trim() !== '') {
    let message = template
    message = message.replace(/{clientName}/g, clientName)
    message = message.replace(/{firstName}/g, firstName)
    message = message.replace(/{date}/g, dateStr)
    message = message.replace(/{time}/g, time)
    
    // Обработка цены - показываем только если указана
    if (sessionPrice !== null && sessionPrice !== undefined && sessionPrice > 0) {
      message = message.replace(/{price}/g, sessionPrice.toLocaleString('ru-RU'))
    } else {
      // Удаляем строки с ценой, если она не указана
      message = message.replace(/💰 Стоимость: \{price\} тенге\n\n?/g, '')
      message = message.replace(/💰 Стоимость: \{price\} тенге/g, '')
    }
    
    // Обработка адреса
    if (officeAddress) {
      message = message.replace(/{address}/g, officeAddress)
    } else {
      // Удаляем строки с адресом, если он не указан
      message = message.replace(/📍 \{address\}\n\n?/g, '')
      message = message.replace(/📍 \{address\}/g, '')
    }
    
    return message
  }

  // Стандартный шаблон
  let message = `⏰ *Напоминание: до вашей записи осталось ${hoursBefore}!*\n\n\n`
  message += `👤 *Уважаемый(ая) ${firstName}!*\n\n`
  message += `📝 *ДЕТАЛИ ЗАПИСИ*\n\n`
  message += `━━━━━━━━━━━━━━━━\n\n`
  message += `📅 Дата: ${dateStr}\n\n`
  message += `⏰ Время: ${time}\n\n`
  
  // Всегда показываем стоимость, если она указана
  if (sessionPrice !== null && sessionPrice !== undefined && sessionPrice > 0) {
    message += `💰 Стоимость: ${sessionPrice.toLocaleString('ru-RU')} тенге\n\n`
  }
  
  if (officeAddress) {
    message += `📍 ${officeAddress}\n\n`
  }
  
  message += `\n❗️ *ВАЖНО*\n\n`
  message += `━━━━━━━━━━━━━━━━\n\n`
  message += `• Пожалуйста, приходите вовремя\n\n`
  message += `• Если у вас изменились планы, сообщите нам заранее\n\n`
  message += `• Для отмены записи отправьте "2"\n\n`
  message += `\nЖду вас на приёме!`

  return message
}

