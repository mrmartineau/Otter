import type { AtlasExample } from 'vite-plugin-atlas/types'
import { Rating } from './Rating'

export const FiveStars: AtlasExample = () => <Rating rating="5" />
FiveStars.description = 'Perfect 5-star rating.'

export const HalfStar: AtlasExample = () => <Rating rating="3.5" />
HalfStar.description = 'Rating with a half star (3.5 out of 5).'

export const LowRating: AtlasExample = () => <Rating rating="1" />
LowRating.description = 'Single star rating.'

export const LargeSize: AtlasExample = () => <Rating rating="4.5" size={32} />
LargeSize.description = 'Larger star icons for prominent display.'

export const NoRating: AtlasExample = () => <Rating rating={null} />
NoRating.description = 'Null rating renders nothing — handles missing data gracefully.'
