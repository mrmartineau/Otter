import { Button } from '@/src/components/Button';
import {
  ArrowSquareRight,
  CaretRight,
  CaretUpDown,
} from '@phosphor-icons/react';
import {
  CollapsibleContentProps,
  CollapsibleProps,
  Collapsible as CollapsibleRoot,
  CollapsibleTriggerProps,
  CollapsibleContent as Content,
  CollapsibleTrigger as Trigger,
} from '@radix-ui/react-collapsible';
import { forwardRef, useCallback } from 'react';

import { Flex } from './Flex';
import { useUser } from './UserProvider';

interface CollapsibleProps1 extends CollapsibleProps {
  stateKey: 'tags' | 'types';
}

export const Collapsible = forwardRef<HTMLDivElement, CollapsibleProps1>(
  ({ children, stateKey, ...props }, ref) => {
    const { profile, handleUpdateUISettings } = useUser();
    const handleOpenChange = useCallback((open: boolean) => {
      handleUpdateUISettings({
        type: `settings_${stateKey}_visible`,
        payload: open,
      });
    }, []);

    return (
      <CollapsibleRoot
        ref={ref}
        onOpenChange={handleOpenChange}
        open={profile ? profile[`settings_${stateKey}_visible`] : false}
        {...props}
      >
        {children}
      </CollapsibleRoot>
    );
  },
);

export const CollapsibleContent = (props: CollapsibleContentProps) => (
  <Content {...props} className="overflow-hidden pt-3xs" />
);

export const CollapsibleTrigger = ({
  children,
  ...rest
}: CollapsibleTriggerProps) => {
  return (
    <Trigger asChild {...rest}>
      <Button
        variant="collapsible"
        size="s"
        className="h-7 w-full justify-start gap-s align-middle"
      >
        <CaretRight weight="duotone" size={12} />
        <Flex justify="between" align="center" className="grow text-step--2">
          {children}
        </Flex>
      </Button>
    </Trigger>
  );
};
