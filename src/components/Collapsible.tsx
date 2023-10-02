import { Button } from '@/components/ui/button';
import { CaretUpDown } from '@phosphor-icons/react';
import {
  CollapsibleContentProps,
  CollapsibleProps,
  Collapsible as CollapsibleRoot,
  CollapsibleTriggerProps,
  CollapsibleContent as Content,
  CollapsibleTrigger as Trigger,
} from '@radix-ui/react-collapsible';
import { forwardRef, useCallback } from 'react';

import { useUpdateUISettings } from '../hooks/useUpdateUISettings';
import { Flex } from './Flex';

interface CollapsibleProps1 extends CollapsibleProps {
  stateKey: 'tags' | 'types';
}

export const Collapsible = forwardRef<HTMLDivElement, CollapsibleProps1>(
  ({ children, stateKey, ...props }, ref) => {
    const [settings, handleUpdateUISettings] = useUpdateUISettings();
    const handleOpenChange = useCallback(() => {
      if (stateKey) {
        handleUpdateUISettings({ type: stateKey });
      }
    }, []);

    return (
      <CollapsibleRoot
        ref={ref}
        onOpenChange={handleOpenChange}
        open={settings.uiState[stateKey]}
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

// export { CollapsibleTrigger };
export const CollapsibleTrigger = ({
  children,
  ...rest
}: CollapsibleTriggerProps) => {
  return (
    <Trigger asChild {...rest}>
      <Button
        variant="collapsible"
        size="s"
        className="w-full gap-s align-middle justify-start h-7"
      >
        <CaretUpDown weight="duotone" size={18} />
        <Flex justify="between" align="center" className="grow text-step--2">
          {children}
        </Flex>
      </Button>
    </Trigger>
  );
};
