import {
  ListBulletsIcon,
  RowsIcon,
  SquaresFourIcon,
} from '@phosphor-icons/react'
import type { FeedView } from '@/hooks/useFeedView'

const VIEWS = [
  { Icon: RowsIcon, label: 'List', value: 'list' },
  { Icon: ListBulletsIcon, label: 'Compact', value: 'compact' },
  { Icon: SquaresFourIcon, label: 'Cards', value: 'cards' },
] as const

interface FeedViewSwitchProps {
  view: FeedView
  onChange: (view: FeedView) => void
}

export const FeedViewSwitch = ({ view, onChange }: FeedViewSwitchProps) => (
  <fieldset className="feed-view-switch" aria-label="Feed view">
    {VIEWS.map(({ Icon, label, value }) => (
      <button
        key={value}
        type="button"
        aria-pressed={view === value}
        title={`${label} view`}
        onClick={() => onChange(value)}
      >
        <Icon size={16} weight="duotone" aria-hidden />
        <span>{label}</span>
      </button>
    ))}
  </fieldset>
)
