import { XIcon } from '@phosphor-icons/react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Dialog as DialogPrimitive } from 'radix-ui'
import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/utils/classnames'

import './Dialog.css'
import { IconButton } from './IconButton'

export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

export const Dialog = ({ children, ...props }: DialogPrimitive.DialogProps) => (
  <DialogPrimitive.Root {...props}>
    <DialogPrimitive.Overlay />
    {children}
  </DialogPrimitive.Root>
)

interface DialogContentProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof dialogContentVariants> {
  title?: string
  description?: string
  children: ReactNode
}

const dialogContentVariants = cva('DialogContent', {
  defaultVariants: {
    placement: 'center',
    width: 'm',
  },
  variants: {
    placement: {
      center: 'DialogContent--center',
      left: 'DialogContent--left',
      right: 'DialogContent--right',
    },

    width: {
      l: 'DialogContent--large',
      m: 'DialogContent--medium',
      s: 'DialogContent--small',
    },
  },
})

export const DialogContent = ({
  children,
  title,
  description,
  placement,
  width,
  className,
  ...props
}: DialogContentProps) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="DialogOverlay" />
    <DialogPrimitive.Content
      className={cn(dialogContentVariants({ className, placement, width }))}
      {...props}
    >
      <div className="sticky top-0">
        <DialogPrimitive.Close asChild>
          <IconButton className="z-3 absolute right-0 top-0">
            <XIcon size="18" />
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
)

DialogContent.displayName = 'DialogContent'
