'use client'

import { useState, useEffect } from 'react'

type Review = {
  id: number
  clientName: string
  rating: number
  comment: string | null
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
        }),
      })

      if (response.ok) {
        setMessage('Спасибо за ваш отзыв! Он будет опубликован после модерации.')
        setClientName('')
        setRating(0)
        setComment('')
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
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-semibold text-gray-900">{review.clientName}</h4>
                    <span className="text-sm text-gray-500">{dateStr}</span>
                  </div>
                  {renderStars(review.rating)}
                </div>
                {review.comment && (
                  <p className="text-gray-700 mt-2">{review.comment}</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}




