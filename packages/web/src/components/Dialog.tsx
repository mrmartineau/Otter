import { XIcon } from '@phosphor-icons/react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Dialog as DialogPrimitive } from 'radix-ui'
import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/utils/classnames'
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
      <div className="fixed top-2 right-2">
        <DialogPrimitive.Close asChild>
          <IconButton size="m" shape="circle" variant="default">
            <XIcon size="18" weight="bold" />
          </IconButton>
        </DialogPrimitive.Close>
      </div>
      {title ? (
        <div className="zui-dialog-header">
          <DialogPrimitive.Title className="zui-dialog-title">
            {title}
          </DialogPrimitive.Title>
          {description ? (
            <DialogPrimitive.Description className="zui-dialog-description">
              {description}
            </DialogPrimitive.Description>
          ) : null}
        </div>
      ) : null}
      <div className="zui-dialog-body">
        {children}
      </div>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
)

DialogContent.displayName = 'DialogContent'
