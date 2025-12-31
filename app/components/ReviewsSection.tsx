'use client'

import { useState, useEffect } from 'react'

type Review = {
  id: number
  clientName: string
  rating: number
  comment: string | null
  instagramUsername: string | null
  createdAt: string
}

type ReviewStats = {
  averageRating: number
  totalReviews: number
  ratingDistribution: {
    5: number
    4: number
    3: number
    2: number
    1: number
  }
}

export default function ReviewsSection() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [stats, setStats] = useState<ReviewStats | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [clientName, setClientName] = useState('')
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [instagramUsername, setInstagramUsername] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchReviews()
    fetchStats()
  }, [])

  const fetchReviews = async () => {
    try {
      const response = await fetch('/api/reviews?status=approved')
      const data = await response.json()
      // Показываем только последние 5 отзывов
      setReviews(data.slice(0, 5))
    } catch (error) {
      console.error('Ошибка при загрузке отзывов:', error)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/reviews/stats')
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Ошибка при загрузке статистики:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!clientName || rating === 0) {
      setMessage('Заполните все обязательные поля')
      return
    }

    setIsSubmitting(true)
    setMessage('')

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientName,
          rating,
          comment: comment.trim() || null,
          instagramUsername: instagramUsername.trim() || null,
        }),
      })

      if (response.ok) {
        setMessage('Спасибо за ваш отзыв! Он будет опубликован после модерации.')
        setClientName('')
        setRating(0)
        setComment('')
        setInstagramUsername('')
        setShowForm(false)
        fetchStats()
      } else {
        const data = await response.json()
        setMessage(data.error || 'Ошибка при отправке отзыва')
      }
    } catch (error) {
      setMessage('Ошибка при отправке отзыва')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getInstagramProfileImage = (username: string | null): string => {
    if (!username) return ''
    // Используем несколько вариантов для получения фото профиля Instagram
    // Вариант 1: Через публичный API (может не работать из-за CORS)
    // Вариант 2: Используем сервис для получения фото
    // Для надежности используем fallback на placeholder
    return `https://www.instagram.com/${username}/media/?size=l`
  }

  const getInstagramProfileUrl = (username: string | null): string => {
    if (!username) return '#'
    return `https://www.instagram.com/${username}/`
  }

  const renderStars = (rating: number, interactive = false, onStarClick?: (rating: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type={interactive ? 'button' : undefined}
            onClick={interactive && onStarClick ? () => onStarClick(star) : undefined}
            className={`${
              interactive ? 'cursor-pointer hover:scale-110 transition-transform' : ''
            }`}
          >
            <svg
              className={`w-6 h-6 ${
                star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
              }`}
              viewBox="0 0 20 20"
            >
              <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
            </svg>
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="mt-12 bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Отзывы клиентов</h2>
          {stats && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold text-gray-800">
                  {stats.averageRating.toFixed(1)}
                </span>
                {renderStars(Math.round(stats.averageRating))}
              </div>
              <span className="text-gray-600">
                {stats.totalReviews} {stats.totalReviews === 1 ? 'отзыв' : 'отзывов'}
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          {showForm ? 'Отмена' : 'Оставить отзыв'}
        </button>
      </div>

      {/* Форма отзыва */}
      {showForm && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ваше имя *
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Иван Иванов"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Оценка *
              </label>
              {renderStars(rating, true, setRating)}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ваш отзыв (необязательно)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Поделитесь своими впечатлениями..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Instagram (необязательно)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">@</span>
                <input
                  type="text"
                  value={instagramUsername}
                  onChange={(e) => setInstagramUsername(e.target.value.replace('@', ''))}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="username"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Укажите ваш Instagram, чтобы мы могли использовать ваше фото из профиля
              </p>
            </div>

            {message && (
              <div className={`p-3 rounded-lg ${
                message.includes('Спасибо')
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors disabled:bg-gray-400"
            >
              {isSubmitting ? 'Отправка...' : 'Отправить отзыв'}
            </button>
          </form>
        </div>
      )}

      {/* Список отзывов */}
      {reviews.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>Пока нет отзывов. Будьте первым!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => {
            const date = new Date(review.createdAt)
            const dateStr = date.toLocaleDateString('ru-RU', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })

            return (
              <div key={review.id} className="border-b border-gray-200 pb-4 last:border-0">
                <div className="flex gap-4">
                  {/* Фото из Instagram */}
                  {review.instagramUsername ? (
                    <a
                      href={getInstagramProfileUrl(review.instagramUsername)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0"
                    >
                      <img
                        src={`https://www.instagram.com/${review.instagramUsername}/media/?size=l`}
                        alt={review.clientName}
                        className="w-16 h-16 rounded-full object-cover border-2 border-pink-200 hover:border-pink-400 transition-colors"
                        onError={(e) => {
                          // Если фото не загрузилось, используем placeholder с инициалами
                          const target = e.target as HTMLImageElement
                          // Пробуем альтернативный способ
                          const altUrl = `https://instagram.com/${review.instagramUsername}/?__a=1`
                          if (target.src !== altUrl) {
                            target.src = altUrl
                          } else {
                            // Если и это не сработало, используем placeholder
                            target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(review.clientName)}&size=64&background=e91e63&color=fff&bold=true`
                          }
                        }}
                      />
                    </a>
                  ) : (
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-semibold text-xl">
                        {review.clientName.charAt(0).toUpperCase()}
                      </div>
                    </div>
                  )}

                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-900">{review.clientName}</h4>
                          {review.instagramUsername && (
                            <a
                              href={getInstagramProfileUrl(review.instagramUsername)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-pink-600 hover:text-pink-700"
                              title={`Instagram: @${review.instagramUsername}`}
                            >
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                              </svg>
                            </a>
                          )}
                        </div>
                        <span className="text-sm text-gray-500">{dateStr}</span>
                      </div>
                      {renderStars(review.rating)}
                    </div>
                    {review.comment && (
                      <p className="text-gray-700 mt-2">{review.comment}</p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}




