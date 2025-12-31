'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

function TestWhatsAppButton({ apiId, apiToken }: { apiId: string; apiToken: string }) {
  const [testPhone, setTestPhone] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState('')

  const handleTest = async () => {
    if (!testPhone.trim()) {
      setTestResult('Укажите номер телефона для теста')
      return
    }

    if (!apiId || !apiToken) {
      setTestResult('Заполните ID API и токен перед тестированием')
      return
    }

    setTesting(true)
    setTestResult('')

    try {
      const response = await fetch('/api/whatsapp/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ testPhone: testPhone.trim() }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setTestResult('✅ Тестовое сообщение успешно отправлено! Проверьте WhatsApp.')
      } else {
        setTestResult(`❌ Ошибка: ${data.error || 'Неизвестная ошибка'}`)
      }
    } catch (error) {
      setTestResult('❌ Ошибка при отправке тестового сообщения')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="tel"
          value={testPhone}
          onChange={(e) => setTestPhone(e.target.value)}
          placeholder="+7 (701) 777-77-77"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
        />
        <button
          type="button"
          onClick={handleTest}
          disabled={testing || !apiId || !apiToken}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium"
        >
          {testing ? 'Отправка...' : 'Тест'}
        </button>
      </div>
      {testResult && (
        <p className={`text-xs ${
          testResult.includes('✅') ? 'text-green-600' : 'text-red-600'
        }`}>
          {testResult}
        </p>
      )}
      <p className="text-xs text-gray-500">
        Отправьте тестовое сообщение для проверки настроек
      </p>
    </div>
  )
}

type Settings = {
  id: number
  workDays: string
  workStartTime: string
  workEndTime: string
  sessionDuration: number
  breakStartTime: string | null
  breakEndTime: string | null
  officeAddress: string | null
  sessionPrice: number | null
  whatsappEnabled: boolean
  whatsappApiId: string | null
  whatsappApiToken: string | null
  whatsappPhoneNumber: string | null
  confirmationMessageTemplate: string | null
  reminderMessageTemplate: string | null
}

const dayNames = [
  { value: 0, label: 'Воскресенье' },
  { value: 1, label: 'Понедельник' },
  { value: 2, label: 'Вторник' },
  { value: 3, label: 'Среда' },
  { value: 4, label: 'Четверг' },
  { value: 5, label: 'Пятница' },
  { value: 6, label: 'Суббота' },
]

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const [workDays, setWorkDays] = useState<number[]>([])
  const [workStartTime, setWorkStartTime] = useState('09:00')
  const [workEndTime, setWorkEndTime] = useState('19:00')
  const [sessionDuration, setSessionDuration] = useState(30)
  const [breakStartTime, setBreakStartTime] = useState('')
  const [breakEndTime, setBreakEndTime] = useState('')
  const [officeAddress, setOfficeAddress] = useState('')
  const [sessionPrice, setSessionPrice] = useState<number | null>(null)
  const [whatsappEnabled, setWhatsappEnabled] = useState(false)
  const [whatsappApiId, setWhatsappApiId] = useState('')
  const [whatsappApiToken, setWhatsappApiToken] = useState('')
  const [whatsappPhoneNumber, setWhatsappPhoneNumber] = useState('')
  const [confirmationMessageTemplate, setConfirmationMessageTemplate] = useState('')
  const [reminderMessageTemplate, setReminderMessageTemplate] = useState('')

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings')
      const data: Settings = await response.json()
      setSettings(data)
      
      // Парсим JSON строку в массив
      const days = JSON.parse(data.workDays) as number[]
      setWorkDays(days)
      setWorkStartTime(data.workStartTime)
      setWorkEndTime(data.workEndTime)
      setSessionDuration(data.sessionDuration)
      setBreakStartTime(data.breakStartTime || '')
      setBreakEndTime(data.breakEndTime || '')
      setOfficeAddress(data.officeAddress || '')
      setSessionPrice(data.sessionPrice || null)
      setWhatsappEnabled(data.whatsappEnabled || false)
      setWhatsappApiId(data.whatsappApiId || '')
      setWhatsappApiToken(data.whatsappApiToken || '')
      setWhatsappPhoneNumber(data.whatsappPhoneNumber || '')
      setConfirmationMessageTemplate(data.confirmationMessageTemplate || '')
      setReminderMessageTemplate(data.reminderMessageTemplate || '')
    } catch (error) {
      console.error('Ошибка при загрузке настроек:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDayToggle = (dayValue: number) => {
    setWorkDays(prev => {
      if (prev.includes(dayValue)) {
        return prev.filter(d => d !== dayValue)
      } else {
        return [...prev, dayValue].sort()
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    if (workDays.length === 0) {
      setMessage('Выберите хотя бы один рабочий день')
      setSaving(false)
      return
    }

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workDays: JSON.stringify(workDays),
          workStartTime: workStartTime.trim(),
          workEndTime: workEndTime.trim(),
          sessionDuration: parseInt(String(sessionDuration)) || 30,
          breakStartTime: breakStartTime && breakStartTime.trim() !== '' ? breakStartTime.trim() : null,
          breakEndTime: breakEndTime && breakEndTime.trim() !== '' ? breakEndTime.trim() : null,
          officeAddress: officeAddress && officeAddress.trim() !== '' ? officeAddress.trim() : null,
          sessionPrice: sessionPrice || null,
          whatsappEnabled,
          whatsappApiId: whatsappApiId && whatsappApiId.trim() !== '' ? whatsappApiId.trim() : null,
          whatsappApiToken: whatsappApiToken && whatsappApiToken.trim() !== '' ? whatsappApiToken.trim() : null,
          whatsappPhoneNumber: whatsappPhoneNumber && whatsappPhoneNumber.trim() !== '' ? whatsappPhoneNumber.trim() : null,
          confirmationMessageTemplate: confirmationMessageTemplate && confirmationMessageTemplate.trim() !== '' ? confirmationMessageTemplate.trim() : null,
          reminderMessageTemplate: reminderMessageTemplate && reminderMessageTemplate.trim() !== '' ? reminderMessageTemplate.trim() : null,
        }),
      })

      if (response.ok) {
        setMessage('Настройки успешно сохранены!')
        fetchSettings()
      } else {
        const data = await response.json()
        setMessage(data.error || 'Ошибка при сохранении настроек')
      }
    } catch (error) {
      console.error('Ошибка при сохранении:', error)
      setMessage('Ошибка при сохранении настроек. Проверьте подключение к серверу.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Загрузка...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">
            Настройки рабочего времени
          </h1>
          <Link
            href="/admin"
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Назад к записям
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Рабочие дни */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Рабочие дни *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {dayNames.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => handleDayToggle(day.value)}
                    className={`
                      py-3 px-4 rounded-lg font-medium transition-all text-left
                      ${workDays.includes(day.value)
                        ? 'bg-primary-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                    `}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Выбрано дней: {workDays.length}
              </p>
            </div>

            {/* Время работы */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="workStartTime" className="block text-sm font-medium text-gray-700 mb-1">
                  Время начала работы *
                </label>
                <input
                  type="time"
                  id="workStartTime"
                  value={workStartTime}
                  onChange={(e) => setWorkStartTime(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="workEndTime" className="block text-sm font-medium text-gray-700 mb-1">
                  Время окончания работы *
                </label>
                <input
                  type="time"
                  id="workEndTime"
                  value={workEndTime}
                  onChange={(e) => setWorkEndTime(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Длительность сеанса */}
            <div>
              <label htmlFor="sessionDuration" className="block text-sm font-medium text-gray-700 mb-1">
                Длительность сеанса (минуты) *
              </label>
              <input
                type="number"
                id="sessionDuration"
                value={sessionDuration}
                onChange={(e) => setSessionDuration(parseInt(e.target.value) || 30)}
                min="15"
                max="120"
                step="15"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="mt-1 text-sm text-gray-500">
                Рекомендуется: 15, 30, 45, 60 минут
              </p>
            </div>

            {/* Перерыв (опционально) */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Обеденный перерыв (необязательно)
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="breakStartTime" className="block text-sm font-medium text-gray-700 mb-1">
                    Начало перерыва
                  </label>
                  <input
                    type="time"
                    id="breakStartTime"
                    value={breakStartTime}
                    onChange={(e) => setBreakStartTime(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="breakEndTime" className="block text-sm font-medium text-gray-700 mb-1">
                    Конец перерыва
                  </label>
                  <input
                    type="time"
                    id="breakEndTime"
                    value={breakEndTime}
                    onChange={(e) => setBreakEndTime(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Оставьте пустым, если перерыва нет
              </p>
            </div>

            {/* Адрес кабинета */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Адрес кабинета
              </h3>
              <div>
                <label htmlFor="officeAddress" className="block text-sm font-medium text-gray-700 mb-1">
                  Адрес кабинета (необязательно)
                </label>
                <input
                  type="text"
                  id="officeAddress"
                  value={officeAddress}
                  onChange={(e) => setOfficeAddress(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Dr.Nuri, Улица Маншук Маметовой, 103"
                />
                <p className="mt-2 text-sm text-gray-500">
                  Адрес будет отображаться на главной странице для клиентов
                </p>
              </div>
            </div>

            {/* Стоимость сеанса */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Стоимость сеанса
              </h3>
              <div>
                <label htmlFor="sessionPrice" className="block text-sm font-medium text-gray-700 mb-1">
                  Стоимость сеанса в тенге (необязательно)
                </label>
                <input
                  type="number"
                  id="sessionPrice"
                  value={sessionPrice || ''}
                  onChange={(e) => setSessionPrice(e.target.value ? parseInt(e.target.value) : null)}
                  min="0"
                  step="100"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="10000"
                />
                <p className="mt-2 text-sm text-gray-500">
                  Стоимость будет указана в напоминаниях клиентам
                </p>
              </div>
            </div>

            {/* Настройки WhatsApp */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Уведомления в WhatsApp
              </h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="whatsappEnabled"
                    checked={whatsappEnabled}
                    onChange={(e) => setWhatsappEnabled(e.target.checked)}
                    className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="whatsappEnabled" className="text-sm font-medium text-gray-700">
                    Включить отправку уведомлений в WhatsApp
                  </label>
                </div>

                {whatsappEnabled && (
                  <div className="space-y-4 pl-8 border-l-2 border-primary-200">
                    <div>
                      <label htmlFor="whatsappApiId" className="block text-sm font-medium text-gray-700 mb-1">
                        ID API (Green API) *
                      </label>
                      <input
                        type="text"
                        id="whatsappApiId"
                        value={whatsappApiId}
                        onChange={(e) => setWhatsappApiId(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="1234567890"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Получите на <a href="https://green-api.com" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">green-api.com</a>
                      </p>
                    </div>

                    <div>
                      <label htmlFor="whatsappApiToken" className="block text-sm font-medium text-gray-700 mb-1">
                        Токен API *
                      </label>
                      <input
                        type="password"
                        id="whatsappApiToken"
                        value={whatsappApiToken}
                        onChange={(e) => setWhatsappApiToken(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Ваш токен API"
                      />
                    </div>

                    <div>
                      <label htmlFor="whatsappPhoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                        Номер телефона для WhatsApp *
                      </label>
                      <input
                        type="tel"
                        id="whatsappPhoneNumber"
                        value={whatsappPhoneNumber}
                        onChange={(e) => setWhatsappPhoneNumber(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="77012345678"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Формат: 77012345678 (без + и пробелов)
                      </p>
                    </div>

                    {/* Кнопка тестирования */}
                    <div className="pt-2">
                      <TestWhatsAppButton 
                        apiId={whatsappApiId}
                        apiToken={whatsappApiToken}
                      />
                    </div>

                    {/* Информация о webhook */}
                    <div className="pt-4 border-t border-gray-200">
                      <h4 className="font-semibold text-gray-800 mb-2">Отмена записей через WhatsApp</h4>
                      <p className="text-sm text-gray-600 mb-2">
                        Для работы отмены записей через WhatsApp необходимо настроить webhook в личном кабинете Green API:
                      </p>
                      <div className="bg-gray-50 p-3 rounded-lg mb-2">
                        <code className="text-xs break-all">
                          {typeof window !== 'undefined' ? `${window.location.origin}/api/whatsapp/webhook` : 'https://ваш-домен.com/api/whatsapp/webhook'}
                        </code>
                      </div>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-2">
                        <p className="text-xs text-yellow-800">
                          <strong>Инструкция:</strong> Перейдите в личный кабинет Green API → Настройки → Webhook URL → Вставьте URL выше и сохраните.
                        </p>
                      </div>
                      <p className="text-xs text-gray-500">
                        Клиенты могут отменить запись, отправив: <strong>"2"</strong>, <strong>"отмена"</strong> или <strong>"отменить"</strong>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Шаблоны уведомлений */}
            {whatsappEnabled && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Шаблоны уведомлений
                </h3>
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">Доступные переменные:</h4>
                    <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                      <li><code className="bg-blue-100 px-1 rounded">{"{clientName}"}</code> - Полное имя клиента</li>
                      <li><code className="bg-blue-100 px-1 rounded">{"{firstName}"}</code> - Первое имя клиента</li>
                      <li><code className="bg-blue-100 px-1 rounded">{"{date}"}</code> - Дата в формате YYYY-MM-DD</li>
                      <li><code className="bg-blue-100 px-1 rounded">{"{time}"}</code> - Время записи</li>
                      <li><code className="bg-blue-100 px-1 rounded">{"{price}"}</code> - Стоимость сеанса (если указана)</li>
                      <li><code className="bg-blue-100 px-1 rounded">{"{address}"}</code> - Адрес кабинета (если указан)</li>
                    </ul>
                    <p className="text-sm text-blue-800 mt-2">
                      <strong>Для шаблона напоминания:</strong> также доступна переменная <code className="bg-blue-100 px-1 rounded">{"{hoursBefore}"}</code> - время до записи (24 часа или 3 часа)
                    </p>
                  </div>

                  <div>
                    <label htmlFor="confirmationMessageTemplate" className="block text-sm font-medium text-gray-700 mb-1">
                      Шаблон сообщения подтверждения записи
                    </label>
                    <textarea
                      id="confirmationMessageTemplate"
                      value={confirmationMessageTemplate}
                      onChange={(e) => setConfirmationMessageTemplate(e.target.value)}
                      rows={12}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
                      placeholder={`✅ *ПОДТВЕРЖДЕНИЕ ЗАПИСИ*

👤 *Уважаемый(ая) {firstName}!*

📅 *ДЕТАЛИ ЗАПИСИ*

━━━━━━━━━━━━━━━━

📅 Дата: {date}

⏰ Время: {time}

💰 Стоимость: {price} тенге

📍 {address}

❗️ *ВАЖНО*

━━━━━━━━━━━━━━━━

• Запись успешно создана

• За 3 часа до записи вы получите напоминание

• Если у вас изменились планы, сообщите нам заранее

Жду вас на приёме!`}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Оставьте пустым, чтобы использовать стандартный шаблон
                    </p>
                  </div>

                  <div>
                    <label htmlFor="reminderMessageTemplate" className="block text-sm font-medium text-gray-700 mb-1">
                      Шаблон сообщения напоминания (используется для напоминаний за 24 часа и за 3 часа)
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      Используйте переменную <code className="bg-gray-100 px-1 rounded">{"{hoursBefore}"}</code> для указания времени до записи (автоматически подставится "24 часа" или "3 часа")
                    </p>
                    <textarea
                      id="reminderMessageTemplate"
                      value={reminderMessageTemplate}
                      onChange={(e) => setReminderMessageTemplate(e.target.value)}
                      rows={12}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
                      placeholder={`⏰ *Напоминание: до вашей записи осталось {hoursBefore}!*

👤 *Уважаемый(ая) {firstName}!*

📝 *ДЕТАЛИ ЗАПИСИ*

━━━━━━━━━━━━━━━━

📅 Дата: {date}

⏰ Время: {time}

💰 Стоимость: {price} тенге

📍 {address}

❗️ *ВАЖНО*

━━━━━━━━━━━━━━━━

• Пожалуйста, приходите вовремя

• Если у вас изменились планы, сообщите нам заранее

• Для отмены записи отправьте "2"

Жду вас на приёме!`}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Оставьте пустым, чтобы использовать стандартный шаблон
                    </p>
                  </div>
                </div>
              </div>
            )}

            {message && (
              <div className={`p-4 rounded-lg ${
                message.includes('успешно')
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-primary-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {saving ? 'Сохранение...' : 'Сохранить настройки'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

