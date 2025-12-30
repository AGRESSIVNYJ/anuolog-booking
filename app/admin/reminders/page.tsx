'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function RemindersPage() {
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<string>('')
  const [lastCheck, setLastCheck] = useState<Date | null>(null)

  const handleSendReminders = async () => {
    setSending(true)
    setResult('')

    try {
      const response = await fetch('/api/reminders/send', {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok) {
        setResult(`✅ ${data.message}`)
        setLastCheck(new Date())
      } else {
        setResult(`❌ Ошибка: ${data.error || 'Неизвестная ошибка'}`)
      }
    } catch (error) {
      setResult('❌ Ошибка при отправке напоминаний')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">
            Напоминания клиентам
          </h1>
          <Link
            href="/admin"
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Назад к записям
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                Отправка напоминаний
              </h2>
              <p className="text-gray-600 mb-4">
                Система автоматически найдет все будущие записи и отправит напоминания клиентам через WhatsApp:
                за 24 часа и за 3 часа до записи. Каждое напоминание отправляется только один раз.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Как это работает
              </h3>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Система проверяет все будущие записи</li>
                <li>Отправляет напоминание за 24 часа (22-26 часов до записи)</li>
                <li>Отправляет напоминание за 3 часа (2-4 часа до записи)</li>
                <li>Каждое напоминание отправляется только один раз</li>
                <li>Требуется настроенный WhatsApp в настройках</li>
              </ul>
            </div>

            {lastCheck && (
              <div className="text-sm text-gray-500">
                Последняя проверка: {lastCheck.toLocaleString('ru-RU')}
              </div>
            )}

            {result && (
              <div className={`p-4 rounded-lg ${
                result.includes('✅')
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {result}
              </div>
            )}

            <button
              onClick={handleSendReminders}
              disabled={sending}
              className="w-full bg-primary-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {sending ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Отправка напоминаний...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  Отправить напоминания сейчас
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

