import { Button } from '@/components/ui/button';
import { UseFormSetValue } from 'react-hook-form';

import { BookmarkFormValues } from '../types/db';
import { Flex } from './Flex';

interface FieldValueSuggestionProps {
  id: keyof BookmarkFormValues;
  suggestion?: string;
  setValue: UseFormSetValue<BookmarkFormValues>;
}

export const FieldValueSuggestion = ({
  id,
  suggestion,
  setValue,
}: FieldValueSuggestionProps) => {
  const handleClick = () => {
    setValue(id, suggestion);
  };
  if (!suggestion) {
    return null;
  }
  return (
    <Flex direction="column" gap="2xs" className="text-step--2 mt-2xs px-2xs">
      <span>Suggestion:</span>
      <div>{suggestion}</div>
      <div>
        <Button
          variant="secondary"
          size="s"
          onClick={handleClick}
          type="button"
        >
          Use Suggestion
        </Button>
      </div>
    </Flex>
  );
};
