import { Button } from '@/src/components/Button';
import { UseFormSetValue } from 'react-hook-form';

import { BookmarkFormValues } from '../types/db';
import { Flex } from './Flex';

interface FieldValueSuggestionProps {
  fieldId: keyof BookmarkFormValues;
  suggestion?: string;
  setFieldValue: UseFormSetValue<BookmarkFormValues>;
  type?: 'ai' | 'default' | 'original';
}

export const FieldValueSuggestion = ({
  fieldId,
  suggestion,
  setFieldValue,
  type = 'default',
}: FieldValueSuggestionProps) => {
  const handleClick = () => {
    setFieldValue(fieldId, suggestion);
  };
  if (!suggestion) {
    return null;
  }
  let title = 'Suggestion:';
  switch (type) {
    case 'ai':
      title = 'AI suggestion:';
      break;
    case 'original':
      title = 'Original:';
      break;
    default:
      title = 'Suggestion:';
      break;
  }
  return (
    <Flex direction="column" gap="2xs" className="mt-2xs px-2xs text-step--2">
      <div>
        <b>{title}</b>
        <div>{suggestion}</div>
      </div>
      <div>
        <Button variant="outline" size="xs" onClick={handleClick} type="button">
          Use Suggestion
        </Button>
      </div>
    </Flex>
  );
};
