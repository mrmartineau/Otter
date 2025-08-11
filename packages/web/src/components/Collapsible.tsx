import { CaretUpDownIcon } from '@phosphor-icons/react'
import { Collapsible as CollapsiblePrimitive } from 'radix-ui'
import { type ComponentProps, useCallback } from 'react'
import { Button } from '@/components/Button'

import { Flex } from './Flex'
import { useUser } from './UserProvider'

interface CollapsibleProps1
  extends ComponentProps<typeof CollapsiblePrimitive.Root> {
  stateKey: 'tags' | 'types' | 'collections'
}

export const Collapsible = ({
  children,
  stateKey,
  ...props
}: CollapsibleProps1) => {
  const { profile, handleUpdateUISettings } = useUser()
  const handleOpenChange = useCallback(
    (open: boolean) => {
      handleUpdateUISettings({
        payload: open,
        type: `settings_${stateKey}_visible`,
      })
    },
    [handleUpdateUISettings, stateKey],
  )

  return (
    <CollapsiblePrimitive.Root
      onOpenChange={handleOpenChange}
      open={profile ? profile[`settings_${stateKey}_visible`] : false}
      {...props}
    >
      {children}
    </CollapsiblePrimitive.Root>
  )
}

Collapsible.displayName = 'Collapsible'

export const CollapsibleContent = (
  props: ComponentProps<typeof CollapsiblePrimitive.Content>,
) => (
  <CollapsiblePrimitive.Content {...props} className="overflow-hidden pt-3xs" />
)

export const CollapsibleTrigger = ({
  children,
  ...rest
}: ComponentProps<typeof CollapsiblePrimitive.Trigger>) => {
  return (
    <CollapsiblePrimitive.Trigger asChild {...rest}>
      <Button
        variant="collapsible"
        size="s"
        className="h-7 w-full justify-start !gap-2xs"
      >
        <div className="rounded bg-theme3 p-1">
          <CaretUpDownIcon weight="duotone" size={14} />
        </div>
        <Flex justify="between" align="center" className="grow text-step--2">
          {children}
        </Flex>
      </Button>
    </CollapsiblePrimitive.Trigger>
  )
}
