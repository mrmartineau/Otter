import { Button } from '@/components/Button'

import type { BookmarkFormValues } from '../types/db'
import { Flex } from './Flex'

interface FieldValueSuggestionProps {
  fieldId: keyof BookmarkFormValues
  suggestion?: string
  setFieldValue: (
    field: keyof BookmarkFormValues,
    value: string | undefined,
  ) => void
  type?: 'ai' | 'default' | 'original'
}

export const FieldValueSuggestion = ({
  fieldId,
  suggestion,
  setFieldValue,
  type = 'default',
}: FieldValueSuggestionProps) => {
  const handleClick = () => {
    setFieldValue(fieldId, suggestion)
  }
  if (!suggestion) {
    return null
  }
  let title = 'Suggestion'
  switch (type) {
    case 'ai':
      title = 'AI suggestion'
      break
    case 'original':
      title = 'Original'
      break
    default:
      title = 'Suggestion'
      break
  }
  return (
    <Flex
      direction="column"
      gap="2xs"
      className="input-base mt-2xs px-2xs pb-m text-step--3"
    >
      <div>
        <b>{title}</b>
        <div>{suggestion}</div>
      </div>
      <div>
        <Button
          variant="outline"
          size="2xs"
          onClick={handleClick}
          type="button"
        >
          Use {title}
        </Button>
      </div>
    </Flex>
  )
}
