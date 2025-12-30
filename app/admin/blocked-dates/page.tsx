'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import '../settings/page.css'

type BlockedDate = {
  id: number
  date: string
  reason: string | null
  createdAt: string
}

export default function BlockedDatesPage() {
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [reason, setReason] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchBlockedDates()
  }, [])

  const fetchBlockedDates = async () => {
    try {
      const response = await fetch('/api/blocked-dates')
      const data = await response.json()
      setBlockedDates(data)
    } catch (error) {
      console.error('Ошибка при загрузке заблокированных дат:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddBlockedDate = async () => {
    if (!selectedDate) {
      setMessage('Выберите дату для блокировки')
      return
    }

    setIsAdding(true)
    setMessage('')

    try {
      const response = await fetch('/api/blocked-dates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: selectedDate.toISOString(),
          reason: reason.trim() || null,
        }),
      })

      if (response.ok) {
        setMessage('Дата успешно заблокирована!')
        setSelectedDate(null)
        setReason('')
        fetchBlockedDates()
      } else {
        const data = await response.json()
        setMessage(data.error || 'Ошибка при блокировке даты')
      }
    } catch (error) {
      setMessage('Ошибка при блокировке даты')
    } finally {
      setIsAdding(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Вы уверены, что хотите разблокировать эту дату?')) {
      return
    }

    try {
      const response = await fetch(`/api/blocked-dates/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchBlockedDates()
      } else {
        alert('Ошибка при разблокировке даты')
      }
    } catch (error) {
      console.error('Ошибка при удалении:', error)
      alert('Ошибка при разблокировке даты')
    }
  }

  const isDateBlocked = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return blockedDates.some(
      (bd) => new Date(bd.date).toISOString().split('T')[0] === dateStr
    )
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
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">
            Управление заблокированными датами
          </h1>
          <Link
            href="/admin"
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Назад к записям
          </Link>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Добавление новой заблокированной даты */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
              Заблокировать дату
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Выберите дату
                </label>
                <div className="flex justify-center">
                  <Calendar
                    onChange={(value) => {
                      if (value instanceof Date) {
                        setSelectedDate(value)
                      }
                    }}
                    value={selectedDate}
                    minDate={new Date()}
                    tileDisabled={({ date }) => isDateBlocked(date)}
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
                  Причина блокировки (необязательно)
                </label>
                <input
                  type="text"
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Например: Отпуск, Праздник"
                />
              </div>

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
                onClick={handleAddBlockedDate}
                disabled={isAdding || !selectedDate}
                className="w-full bg-primary-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isAdding ? 'Блокировка...' : 'Заблокировать дату'}
              </button>
            </div>
          </div>

          {/* Список заблокированных дат */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
              Заблокированные даты
            </h2>
            {blockedDates.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Нет заблокированных дат</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {blockedDates.map((blockedDate) => {
                  const date = new Date(blockedDate.date)
                  const dateStr = date.toLocaleDateString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    weekday: 'long',
                  })

                  return (
                    <div
                      key={blockedDate.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div>
                        <div className="font-medium text-gray-900">
                          {dateStr}
                        </div>
                        {blockedDate.reason && (
                          <div className="text-sm text-gray-500 mt-1">
                            {blockedDate.reason}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(blockedDate.id)}
                        className="text-red-600 hover:text-red-800 font-medium text-sm px-3 py-1 rounded hover:bg-red-50 transition-colors"
                      >
                        Разблокировать
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}




