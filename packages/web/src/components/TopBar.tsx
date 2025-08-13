import { ListIcon } from '@phosphor-icons/react'
import type { ComponentProps, ReactNode } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { cn } from '@/utils/classnames'
import { ROUTE_HOME } from '../constants'
import { useSidebar } from '../hooks/useSidebar'
import { CmdK } from './CmdK'
import { Flex } from './Flex'
import { IconButton } from './IconButton'
import { Link } from './Link'
import './TopBar.css'
import { useRouterState } from '@tanstack/react-router'
import { Spinner } from './Spinner'
import { FabAdd } from './FabAdd'

interface TopBarProps extends ComponentProps<'header'> {
  children?: ReactNode
}

export const TopBar = ({ className, children, ...rest }: TopBarProps) => {
  const { handleToggleSidebar } = useSidebar()
  const isLoading = useRouterState({ select: (s) => s.status === 'pending' })

  return (
    <header className={cn(className, 'otter-top-bar')} {...rest}>
      <Flex align="center" gap="s" className="top-bar-buttons">
        <IconButton
          aria-label="View navigation"
          data-testid="navButton"
          onClick={handleToggleSidebar}
        >
          <ListIcon weight="duotone" size={30} />
        </IconButton>

        <Link href={ROUTE_HOME} variant="logo">
          <img src="/otter-logo.svg" width="33" height="33" alt="Otter logo" />
          <span>Otter</span>
        </Link>
        <Spinner show={isLoading} />
      </Flex>
      <div className="top-bar-search-container">
        <ErrorBoundary fallback={<div>Something went wrong</div>}>
          <CmdK />
        </ErrorBoundary>
        <FabAdd />
      </div>
    </header>
  )
}
