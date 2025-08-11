import { useNavigate } from '@tanstack/react-router'
import clsx from 'clsx'
import { Command } from 'cmdk'
import { type ComponentProps, type ReactNode, useContext } from 'react'
import type { Bookmark } from '@/types/db'
import { Flex } from '../Flex'
import { CmdKContext } from './CmdK'

export interface AccessoryModel {
  Icon?: ReactNode
  text?: string
  tooltip?: string
  showOnMobile?: boolean
}

export type ItemProps = ComponentProps<typeof Command.Item> &
  Partial<Pick<Bookmark, 'url'>> & {
    to?: string
    children: ReactNode
    onSelect?: (value: string) => void
    accessories?: AccessoryModel[]
    image?: ReactNode
    primaryNav?: string
    secondaryNav?: string
    action?: () => void
  }

export const Item = ({
  to,
  accessories,
  children,
  image,
  action,
  ...rest
}: ItemProps) => {
  const { toggleOpen } = useContext(CmdKContext)
  const navigate = useNavigate()
  const handleNavigate = (to: string): void => {
    if (to.startsWith('/')) {
      navigate({ to })
    } else {
      window.location.href = to
    }
    toggleOpen()
  }

  const Contents = () => (
    <>
      <Flex gap="2xs" align="center" className="truncate leading-snug">
        {image}
        {children}
      </Flex>
      <Flex gap="2xs" align="center" className="text-right text-sm text-theme9">
        {accessories?.length
          ? accessories.map(({ Icon, tooltip, text, showOnMobile }, index) => {
              return (
                <Flex
                  align="center"
                  key={`${to}-${index}`}
                  title={tooltip}
                  className={clsx('cmdk-item-accessory', {
                    hideOnMobile: !showOnMobile,
                    showOnMobile,
                  })}
                >
                  {Icon || text || null}
                </Flex>
              )
            })
          : null}
      </Flex>
    </>
  )

  return (
    <Command.Item
      className="cmdk-item"
      onSelect={() => {
        if (to) {
          handleNavigate(to)
        }
        if (action) {
          action()
        }
      }}
      {...rest}
    >
      <Contents />
    </Command.Item>
  )
}

Item.displayName = 'CmdK.Item'
