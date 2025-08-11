import TextareaAutosize, {
  type TextareaAutosizeProps,
} from 'react-textarea-autosize'
import { cn } from '@/utils/classnames'

export interface TextareaProps extends TextareaAutosizeProps {}

const Textarea = ({ className, ...props }: TextareaProps) => {
  return (
    <TextareaAutosize
      className={cn('input-base focus min-h-[80px]', className)}
      {...props}
    />
  )
}
Textarea.displayName = 'Textarea'

export { Textarea }
