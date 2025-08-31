import { PlusCircleIcon } from '@phosphor-icons/react'
import { useLocation } from '@tanstack/react-router'
import { cn } from '@/utils/classnames'
import { ROUTE_NEW_BOOKMARK } from '../constants'
import { Link } from './Link'
import { Tooltip, TooltipContent, TooltipTrigger } from './Tooltip'

export const FabAdd = () => {
  const location = useLocation()

  const disableFab =
    location.pathname === `/new/bookmark` || location.pathname.includes('edit')

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={ROUTE_NEW_BOOKMARK}
          variant="fab"
          aria-label="Add new bookmark"
          onClick={(event) => {
            if (disableFab) {
              event.preventDefault()
            }
          }}
          className={cn(disableFab && 'pointer-events-none opacity-30')}
        >
          <PlusCircleIcon size="24" weight="duotone" color="currentColor" />
        </Link>
      </TooltipTrigger>
      <TooltipContent>Add new bookmark</TooltipContent>
    </Tooltip>
  )
}
