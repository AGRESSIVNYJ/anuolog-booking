import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const approvedReviews = await prisma.review.findMany({
      where: { status: 'approved' },
    })

    if (approvedReviews.length === 0) {
      return NextResponse.json({
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      })
    }

    const totalRating = approvedReviews.reduce((sum, review) => sum + review.rating, 0)
    const averageRating = totalRating / approvedReviews.length

    const ratingDistribution = {
      5: approvedReviews.filter((r) => r.rating === 5).length,
      4: approvedReviews.filter((r) => r.rating === 4).length,
      3: approvedReviews.filter((r) => r.rating === 3).length,
      2: approvedReviews.filter((r) => r.rating === 2).length,
      1: approvedReviews.filter((r) => r.rating === 1).length,
    }

    return NextResponse.json({
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews: approvedReviews.length,
      ratingDistribution,
    })
  } catch (error) {
    console.error('Ошибка при получении статистики отзывов:', error)
    return NextResponse.json(
      { error: 'Ошибка при получении статистики' },
      { status: 500 }
    )
  }
}




