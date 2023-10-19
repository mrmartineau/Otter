import { Button } from '@/src/components/Button';
import { cn } from '@/src/utils/classnames';
import { X } from '@phosphor-icons/react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { VariantProps, cva } from 'class-variance-authority';
import React, { HTMLAttributes, ReactNode } from 'react';

import './Dialog.css';
import { IconButton } from './IconButton';

export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export const Dialog = ({ children, ...props }: DialogPrimitive.DialogProps) => (
  <DialogPrimitive.Root {...props}>
    <DialogPrimitive.Overlay />
    {children}
  </DialogPrimitive.Root>
);

interface DialogContentProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof dialogContentVariants> {
  title?: string;
  description?: string;
  children: ReactNode;
}

const dialogContentVariants = cva('DialogContent', {
  variants: {
    placement: {
      center: 'DialogContent--center',
      left: 'DialogContent--left',
      right: 'DialogContent--right',
    },

    width: {
      s: 'DialogContent--small',
      m: 'DialogContent--medium',
      l: 'DialogContent--large',
    },
  },
  defaultVariants: {
    placement: 'center',
    width: 'm',
  },
});

export const DialogContent = React.forwardRef<
  HTMLDivElement,
  DialogContentProps
>(
  (
    { children, title, description, placement, width, className, ...props },
    forwardedRef,
  ) => (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="DialogOverlay" />
      <DialogPrimitive.Content
        className={cn(dialogContentVariants({ placement, width, className }))}
        {...props}
        ref={forwardedRef}
      >
        <div className="sticky top-0">
          <DialogPrimitive.Close asChild>
            <IconButton className="z-3 absolute right-0 top-0">
              <X size="18" />
            </IconButton>
          </DialogPrimitive.Close>
        </div>
        {title ? (
          <DialogPrimitive.Title className="DialogTitle">
            {title}
          </DialogPrimitive.Title>
        ) : null}
        {description ? (
          <DialogPrimitive.Description className="DialogDescription">
            {description}
          </DialogPrimitive.Description>
        ) : null}
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  ),
);

DialogContent.displayName = 'DialogContent';
