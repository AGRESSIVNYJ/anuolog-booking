'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type Review = {
  id: number
  clientName: string
  rating: number
  comment: string | null
  instagramUsername: string | null
  status: string
  createdAt: string
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    fetchReviews()
  }, [filter])

  const fetchReviews = async () => {
    try {
      const url = filter === 'all' ? '/api/reviews' : `/api/reviews?status=${filter}`
      const response = await fetch(url)
      const data = await response.json()
      setReviews(data)
    } catch (error) {
      console.error('Ошибка при загрузке отзывов:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (id: number, newStatus: string) => {
    try {
      const response = await fetch(`/api/reviews/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        fetchReviews()
      }
    } catch (error) {
      console.error('Ошибка при обновлении статуса:', error)
    }
  }

  const deleteReview = async (id: number) => {
    if (!confirm('Вы уверены, что хотите удалить этот отзыв?')) {
      return
    }

    try {
      const response = await fetch(`/api/reviews/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchReviews()
      }
    } catch (error) {
      console.error('Ошибка при удалении отзыва:', error)
    }
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-5 h-5 ${
              star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
            viewBox="0 0 20 20"
          >
            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
          </svg>
        ))}
      </div>
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
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">
            Управление отзывами
          </h1>
          <Link
            href="/admin"
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Назад к записям
          </Link>
        </div>

        {/* Фильтры */}
        <div className="mb-6 flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Все ({reviews.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'pending'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            На модерации ({reviews.filter((r) => r.status === 'pending').length})
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'approved'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Одобренные ({reviews.filter((r) => r.status === 'approved').length})
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'rejected'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Отклоненные ({reviews.filter((r) => r.status === 'rejected').length})
          </button>
        </div>

        {/* Список отзывов */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {reviews.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Нет отзывов
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {reviews.map((review) => {
                const date = new Date(review.createdAt)
                const dateStr = date.toLocaleDateString('ru-RU', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })

                return (
                  <div key={review.id} className="p-6 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">
                              {review.clientName}
                            </h3>
                            {review.instagramUsername && (
                              <a
                                href={`https://www.instagram.com/${review.instagramUsername}/`}
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
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">{dateStr}</span>
                            {review.instagramUsername && (
                              <span className="text-sm text-gray-500">• @{review.instagramUsername}</span>
                            )}
                          </div>
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              review.status === 'approved'
                                ? 'bg-green-100 text-green-800'
                                : review.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {review.status === 'approved'
                              ? 'Одобрен'
                              : review.status === 'pending'
                              ? 'На модерации'
                              : 'Отклонен'}
                          </span>
                        </div>
                        {renderStars(review.rating)}
                      </div>
                    </div>

                    {review.comment && (
                      <p className="text-gray-700 mb-4">{review.comment}</p>
                    )}

                    <div className="flex gap-2">
                      <select
                        value={review.status}
                        onChange={(e) => updateStatus(review.id, e.target.value)}
                        className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="pending">На модерации</option>
                        <option value="approved">Одобрить</option>
                        <option value="rejected">Отклонить</option>
                      </select>
                      <button
                        onClick={() => deleteReview(review.id)}
                        className="text-red-600 hover:text-red-800 text-sm px-3 py-1 rounded hover:bg-red-50 transition-colors"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}




