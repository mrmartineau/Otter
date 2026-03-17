import { type ComponentProps, type JSX, type ReactNode, useState } from 'react'
import { Label } from '@/components/Label'
import { cn } from '@/utils/classnames'

import { Button } from './Button'
import { Text } from './Text'

export interface FormGroupProps extends ComponentProps<'div'> {
  label: string
  name: string
  note?: string
  labelSuffix?: ReactNode
  children: ReactNode
  labelIsVisible?: boolean
  error?: string
  suggestion?: string | null
  onUseSuggestion?: () => void
}

export const FormGroup = ({
  label,
  name,
  note,
  labelIsVisible = true,
  error,
  children,
  className,
  labelSuffix,
  suggestion,
  onUseSuggestion,
  ...rest
}: FormGroupProps): JSX.Element => {
  const [showOriginal, setShowOriginal] = useState(false)
  const hasSuggestion = suggestion != null && suggestion !== ''

  return (
    <div className={cn('form-group', className)} {...rest}>
      <Label
        htmlFor={name}
        className={cn({ hidden: !labelIsVisible, 'mb-1': true })}
      >
        {label} {labelSuffix}
        {hasSuggestion ? (
          <Button
            type="button"
            variant="ghost"
            size="2xs"
            className="ml-auto"
            onClick={() => setShowOriginal((prev) => !prev)}
            disabled={!onUseSuggestion}
            aria-pressed={showOriginal}
          >
            {showOriginal ? 'View Suggestion' : 'View Original'}
          </Button>
        ) : null}
      </Label>
      {showOriginal && hasSuggestion ? (
        <div className="input-base flex flex-col gap-2xs text-step--1">
          <div className="text-muted-foreground">{suggestion}</div>
          {onUseSuggestion ? (
            <div className="ml-auto">
              <Button
                type="button"
                // variant="outline"
                size="2xs"
                onClick={onUseSuggestion}
              >
                Use Original
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        children
      )}
      {note ? <Text>{note}</Text> : null}
      {error ? <Text>{error}</Text> : null}
    </div>
  )
}
