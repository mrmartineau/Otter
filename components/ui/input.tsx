import { cn } from '@/lib/utils';
import * as React from 'react';

export const sharedInputStyles =
  'w-full rounded-sm border border-input bg-background px-3 py-2 text-step-0 text-theme10 ring-offset-background placeholder:text-theme7 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-12 file:border-0 file:bg-transparent file:text-sm file:font-medium',
          sharedInputStyles,
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
