import { StarHalfIcon, StarIcon } from '@phosphor-icons/react'
import type { ComponentProps } from 'react'
import { cn } from '@/utils/classnames'

const getRatingDisplay = (rating: string | null, size: number = 16) => {
  if (!rating) {
    return null
  }

  const numericRating = parseFloat(rating)
  const fullStars = Math.floor(numericRating)
  const hasHalfStar = numericRating % 1 >= 0.5

  const stars = []

  // Add full stars
  for (let i = 0; i < fullStars; i++) {
    stars.push(<StarIcon key={`full-${i}`} weight="fill" size={size} />)
  }

  // Add half star if needed
  if (hasHalfStar) {
    stars.push(<StarHalfIcon key="half" weight="fill" size={size} />)
  }

  return stars
}

interface RatingProps extends ComponentProps<'div'> {
  rating: string | null
  size?: number
}

export const Rating = ({ rating, className, size = 16 }: RatingProps) => {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {getRatingDisplay(rating, size)}
    </div>
  )
}
