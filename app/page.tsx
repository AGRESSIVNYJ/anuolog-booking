'use client'

import { useState, useEffect } from 'react'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import './page.css'
import ReviewsSection from '@/app/components/ReviewsSection'
import ShareWidget from '@/app/components/ShareWidget'

type Appointment = {
  id: number
  clientName: string
  phone: string
  email?: string
  date: string
  time: string
  notes?: string
  status: string
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
}

export default function Home() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [clientName, setClientName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [bookedSlots, setBookedSlots] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')
  const [successData, setSuccessData] = useState<{date: string, time: string, name: string} | null>(null)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [timeSlots, setTimeSlots] = useState<string[]>([])
  const [blockedDates, setBlockedDates] = useState<string[]>([])

  useEffect(() => {
    fetchSettings()
    fetchBlockedDates()
  }, [])

  useEffect(() => {
    if (settings) {
      generateTimeSlots()
      fetchBookedSlots()
    }
  }, [settings, selectedDate])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings')
      const data: Settings = await response.json()
      setSettings(data)
    } catch (error) {
      console.error('Ошибка при загрузке настроек:', error)
    }
  }

  const fetchBlockedDates = async () => {
    try {
      const response = await fetch('/api/blocked-dates')
      const data = await response.json()
      // Сохраняем только даты в формате YYYY-MM-DD для быстрой проверки
      const dates = data.map((bd: { date: string }) => 
        new Date(bd.date).toISOString().split('T')[0]
      )
      setBlockedDates(dates)
    } catch (error) {
      console.error('Ошибка при загрузке заблокированных дат:', error)
    }
  }

  const generateTimeSlots = () => {
    if (!settings || !settings.workStartTime || !settings.workEndTime || !settings.sessionDuration) {
      return
    }

    const slots: string[] = []
    
    try {
      const [startHour, startMin] = settings.workStartTime.split(':').map(Number)
      const [endHour, endMin] = settings.workEndTime.split(':').map(Number)
      
      if (isNaN(startHour) || isNaN(startMin) || isNaN(endHour) || isNaN(endMin)) {
        console.error('Некорректное время работы')
        return
      }
      
      const startMinutes = startHour * 60 + startMin
      const endMinutes = endHour * 60 + endMin
      const duration = settings.sessionDuration || 30

      if (startMinutes >= endMinutes) {
        console.error('Время начала должно быть меньше времени окончания')
        return
      }

      let breakStartMinutes: number | null = null
      let breakEndMinutes: number | null = null

      if (settings.breakStartTime && settings.breakEndTime) {
        const [breakStartHour, breakStartMin] = settings.breakStartTime.split(':').map(Number)
        const [breakEndHour, breakEndMin] = settings.breakEndTime.split(':').map(Number)
        
        if (!isNaN(breakStartHour) && !isNaN(breakStartMin) && 
            !isNaN(breakEndHour) && !isNaN(breakEndMin)) {
          breakStartMinutes = breakStartHour * 60 + breakStartMin
          breakEndMinutes = breakEndHour * 60 + breakEndMin
        }
      }

      for (let minutes = startMinutes; minutes + duration <= endMinutes; minutes += duration) {
        const slotEnd = minutes + duration
        
        // Пропускаем слоты, которые попадают в перерыв
        if (breakStartMinutes !== null && breakEndMinutes !== null) {
          if ((minutes >= breakStartMinutes && minutes < breakEndMinutes) ||
              (slotEnd > breakStartMinutes && slotEnd <= breakEndMinutes) ||
              (minutes < breakStartMinutes && slotEnd > breakEndMinutes)) {
            continue
          }
        }

        const hours = Math.floor(minutes / 60)
        const mins = minutes % 60
        const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
        slots.push(timeStr)
      }

      setTimeSlots(slots)
    } catch (error) {
      console.error('Ошибка при генерации временных слотов:', error)
    }
  }

  const fetchBookedSlots = async () => {
    try {
      const dateStr = selectedDate.toISOString().split('T')[0]
      const response = await fetch('/api/appointments')
      const appointments: Appointment[] = await response.json()
      
      const booked = appointments
        .filter(apt => {
          const aptDate = new Date(apt.date).toISOString().split('T')[0]
          return aptDate === dateStr && apt.status !== 'cancelled'
        })
        .map(apt => apt.time)
      
      setBookedSlots(booked)
    } catch (error) {
      console.error('Ошибка при загрузке занятых слотов:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedTime) {
      setSubmitMessage('Пожалуйста, выберите время')
      return
    }

    setIsSubmitting(true)
    setSubmitMessage('')

    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientName,
          phone,
          email,
          date: selectedDate.toISOString(),
          time: selectedTime,
          notes,
        }),
      })

      if (response.ok) {
        const appointmentData = await response.json()
        const dateStr = new Date(selectedDate).toLocaleDateString('ru-RU', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
          weekday: 'long',
        })
        
        setSuccessData({
          date: dateStr,
          time: selectedTime,
          name: clientName,
        })
        setSubmitMessage('')
        setClientName('')
        setPhone('')
        setEmail('')
        setNotes('')
        setSelectedTime('')
        fetchBookedSlots()
        
        // Автоматически скрыть сообщение через 10 секунд
        setTimeout(() => {
          setSuccessData(null)
        }, 10000)
      } else {
        const data = await response.json()
        setSubmitMessage(data.error || 'Ошибка при создании записи')
        setSuccessData(null)
      }
    } catch (error) {
      setSubmitMessage('Ошибка при отправке формы. Попробуйте еще раз.')
      setSuccessData(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isDateDisabled = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Блокируем прошедшие даты
    if (date < today) {
      return true
    }

    // Блокируем заблокированные даты
    const dateStr = date.toISOString().split('T')[0]
    if (blockedDates.includes(dateStr)) {
      return true
    }

    // Блокируем выходные дни, если настройки загружены
    if (settings && settings.workDays) {
      try {
        const dayOfWeek = date.getDay() // 0 = воскресенье, 1 = понедельник, ..., 6 = суббота
        const workDays = JSON.parse(settings.workDays) as number[]
        if (Array.isArray(workDays) && workDays.length > 0) {
          return !workDays.includes(dayOfWeek)
        }
      } catch (error) {
        console.error('Ошибка при парсинге workDays:', error)
      }
    }

    return false
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Запись на сеанс мануальной терапии
          </h1>
          <p className="text-gray-600 mb-3">
            Выберите удобную дату и время для записи
          </p>
          {settings && settings.officeAddress && (
            <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-md">
              <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-gray-700 font-medium">{settings.officeAddress}</span>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Календарь */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
              Выберите дату
            </h2>
            <div className="flex justify-center">
              <Calendar
                onChange={(value) => {
                  if (value instanceof Date) {
                    setSelectedDate(value)
                    setSelectedTime('')
                  }
                }}
                value={selectedDate}
                minDate={new Date()}
                tileDisabled={({ date }) => isDateDisabled(date)}
                className="w-full"
              />
            </div>
          </div>

          {/* Выбор времени */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
              Выберите время
            </h2>
            {(() => {
              // Проверяем, является ли выбранная дата выходным днем
              if (settings && settings.workDays) {
                try {
                  const dayOfWeek = selectedDate.getDay()
                  const workDays = JSON.parse(settings.workDays) as number[]
                  if (Array.isArray(workDays) && workDays.length > 0) {
                    const isWeekend = !workDays.includes(dayOfWeek)
                    
                    if (isWeekend) {
                      return (
                        <div className="text-center py-8 text-gray-500">
                          <p className="text-lg">Выбранный день является выходным</p>
                          <p className="text-sm mt-2">Выберите рабочий день для записи</p>
                        </div>
                      )
                    }
                  }
                } catch (error) {
                  console.error('Ошибка при парсинге workDays:', error)
                }
              }
              
              if (timeSlots.length === 0) {
                return (
                  <div className="text-center py-8 text-gray-500">
                    <p>Загрузка доступных временных слотов...</p>
                  </div>
                )
              }
              
              return (
                <div className="grid grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                  {timeSlots.map((time) => {
                    const isBooked = bookedSlots.includes(time)
                    const isSelected = selectedTime === time
                    
                    return (
                      <button
                        key={time}
                        type="button"
                        onClick={() => !isBooked && setSelectedTime(time)}
                        disabled={isBooked}
                        className={`
                          py-3 px-4 rounded-lg font-medium transition-all
                          ${isSelected
                            ? 'bg-primary-600 text-white shadow-md'
                            : isBooked
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                          }
                        `}
                      >
                        {time}
                      </button>
                    )
                  })}
                </div>
              )
            })()}
          </div>
        </div>

        {/* Форма записи */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">
            Ваши контактные данные
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="clientName" className="block text-sm font-medium text-gray-700 mb-1">
                Имя и фамилия *
              </label>
              <input
                type="text"
                id="clientName"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Иван Иванов"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Телефон *
              </label>
              <input
                type="tel"
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="+7 (701) 777-77-77"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email (необязательно)
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="ivan@example.com"
              />
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Дополнительная информация (необязательно)
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Укажите, если есть особые пожелания или противопоказания"
              />
            </div>

            {/* Красивое сообщение об успешной записи */}
            {successData && (
              <div className="relative overflow-hidden bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6 shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                      <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">
                      Запись успешно создана! ✅
                    </h3>
                    <p className="text-gray-700 mb-4">
                      Спасибо, <span className="font-semibold text-gray-900">{successData.name}</span>! Ваша запись подтверждена.
                    </p>
                    <div className="bg-white rounded-lg p-4 space-y-3 border border-green-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Дата</p>
                          <p className="font-semibold text-gray-900 capitalize">{successData.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Время</p>
                          <p className="font-semibold text-gray-900">{successData.time}</p>
                        </div>
                      </div>
                      {settings && settings.officeAddress && (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Адрес</p>
                            <p className="font-semibold text-gray-900">{settings.officeAddress}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Мы свяжемся с вами для подтверждения записи
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSuccessData(null)}
                    className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Сообщение об ошибке */}
            {submitMessage && !successData && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-red-800 font-medium">{submitMessage}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !selectedTime}
              className="w-full bg-primary-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Отправка...' : 'Записаться на сеанс'}
            </button>
          </form>
        </div>

        {/* Виджет "Поделиться" */}
        <ShareWidget />

        {/* Секция отзывов */}
        <ReviewsSection />
      </div>
    </div>
  )
}

