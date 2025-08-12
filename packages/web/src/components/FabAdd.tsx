import { PlusCircleIcon } from '@phosphor-icons/react'
import { useLocation } from '@tanstack/react-router'
import { ROUTE_NEW_BOOKMARK } from '../constants'
import { Link } from './Link'

export const FabAdd = () => {
  const location = useLocation()

  const hideFab =
    location.pathname === `/new/bookmark` || location.pathname.includes('edit')

  if (hideFab) {
    return null
  }

  return (
    <Link href={ROUTE_NEW_BOOKMARK} variant="fab" aria-label="Add new bookmark">
      <PlusCircleIcon size="24" weight="duotone" color="currentColor" />
    </Link>
  )
}
