import {
  CollapsibleContentProps,
  CollapsibleProps,
  Collapsible as CollapsibleRoot,
  CollapsibleTrigger,
  CollapsibleContent as Content,
} from '@radix-ui/react-collapsible';
import { forwardRef } from 'react';

import { useUpdateUISettings } from '../hooks/useUpdateUISettings';

interface CollapsibleProps1 extends CollapsibleProps {
  stateKey: 'tags' | 'types';
}

export const Collapsible = forwardRef<HTMLDivElement, CollapsibleProps1>(
  ({ children, stateKey, ...props }, ref) => {
    const [settings, handleUpdateUISettings] = useUpdateUISettings();
    const handleOpenChange = () => {
      console.log(`🚀 ~ handleOpenChange ~ stateKey:`, stateKey);
      if (stateKey) {
        handleUpdateUISettings({ type: stateKey });
      }
    };

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

export { CollapsibleTrigger };
