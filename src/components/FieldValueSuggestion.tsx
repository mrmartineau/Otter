import { Button } from '@/src/components/Button';
import { UseFormSetValue } from 'react-hook-form';

import { BookmarkFormValues } from '../types/db';
import { Flex } from './Flex';

interface FieldValueSuggestionProps {
  id: keyof BookmarkFormValues;
  suggestion?: string;
  setValue: UseFormSetValue<BookmarkFormValues>;
  type?: 'ai' | 'default';
}

export const FieldValueSuggestion = ({
  id,
  suggestion,
  setValue,
  type = 'default',
}: FieldValueSuggestionProps) => {
  const handleClick = () => {
    setValue(id, suggestion);
  };
  if (!suggestion) {
    return null;
  }
  return (
    <Flex direction="column" gap="2xs" className="mt-2xs px-2xs text-step--2">
      <div>
        <b>{type === 'ai' ? 'AI ' : null}Suggestion:</b>
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
