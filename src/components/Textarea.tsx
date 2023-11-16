import { cn } from '@/src/utils/classnames';
import * as React from 'react';
import TextareaAutosize, {
  TextareaAutosizeProps,
} from 'react-textarea-autosize';

export interface TextareaProps extends TextareaAutosizeProps {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <TextareaAutosize
        className={cn('input-base focus min-h-[80px]', className)}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = 'Textarea';

export { Textarea };
