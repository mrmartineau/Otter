'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
// import './BookmarkForm.styles.css';
import { clsx } from 'clsx';
import {
  ComponentPropsWithoutRef,
  DispatchWithoutAction,
  useMemo,
  useState,
} from 'react';

import { BookmarkFormValues } from '../types/db';
import { MetaTag } from '../utils/fetching/meta';
import { Combobox } from './Combobox';
import { Flex } from './Flex';
import { FormGroup } from './FormGroup';
import { TypeRadio } from './TypeRadio';

export interface ComboOption {
  label: string;
  value: string;
}

export const transformTagsForCombobox = (
  tags?: string[] | null,
): readonly ComboOption[] => {
  if (!tags) {
    return [];
  }
  return tags.map((item) => ({
    label: item,
    value: item,
  }));
};

interface BookmarkFormProps extends ComponentPropsWithoutRef<'form'> {
  type: 'new' | 'edit';
  initialValues?: BookmarkFormValues;
  onSubmit?: DispatchWithoutAction;
  id?: string;
  tags: MetaTag[];
}

export const BookmarkForm = ({
  className,
  type,
  initialValues,
  onSubmit,
  tags,
  ...rest
}: BookmarkFormProps) => {
  const isNew = type === 'new';
  const bookmarkformClass = clsx(
    className,
    'bookmark-form flex flex-col gap-s',
  );
  const supabaseClient = createClientComponentClient();
  const [formTags, setFormTags] = useState<string[]>();

  const addBookmark = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.target as HTMLFormElement);
    const url = formData.get('url');
    const title = formData.get('title');
    const description = formData.get('description');
    const note = formData.get('note');
    const type = formData.get('type');

    try {
      const response = await supabaseClient
        .from('bookmarks')
        .insert([{ title, url, note, description, type }], {
          defaultToNull: true,
        });
      console.log(`🚀 ~ addBookmark ~ response:`, response);
      onSubmit?.(); // TODO: toast?
      // if (isNew) {
      //   redirect('/feed');
      // }
    } catch (err) {
      console.error(err);
    }
  };

  const transformedTagsForCombobox = useMemo(() => {
    return tags.map((item) => ({
      label: item.tag,
      value: item.tag,
    }));
  }, [tags]);

  return (
    <form onSubmit={addBookmark} className={bookmarkformClass} {...rest}>
      {/* URL */}
      <FormGroup label="URL" name="url">
        <Input name="url" id="url" placeholder="https://zander.wtf" />
      </FormGroup>

      {/* TITLE */}
      <FormGroup label="Title" name="title">
        <Input name="title" id="title" placeholder="Title" />
      </FormGroup>

      {/* DESCRIPTION */}
      <FormGroup label="Description" name="description">
        <Textarea name="description" id="description"></Textarea>
      </FormGroup>

      {/* NOTE */}
      <FormGroup label="Note" name="note">
        <Textarea name="note" id="note"></Textarea>
      </FormGroup>

      {/* TAGS */}
      {transformedTagsForCombobox?.length ? (
        <FormGroup
          label="Tags"
          name="tags"
          // error={errors.tags?.message as string}
        >
          <Combobox
            inputId="tags"
            options={transformedTagsForCombobox}
            onChange={(option) => {
              setFormTags((option as ComboOption[]).map((item) => item.value));
            }}
            value={transformTagsForCombobox(formTags)}
            maxMenuHeight={100}
          />

          {/* {possibleMatchingTags.length ? (
            <Flex
              css={{ mt: '$2', fontSize: '$2' }}
              gapX="1"
              align="center"
              wrap="wrap"
            >
              Suggested tags:
              {possibleMatchingTags.map((tag, index) => (
                <Button
                  key={`possibleTagMatch-${tag}`}
                  variant="ghost"
                  size="small"
                  onClick={() => {
                    const existingTags = watchTags?.length ? watchTags : [];
                    setValue('tags', [...existingTags, tag]);
                    possibleMatchingTags[index];
                    setPossibleMatchingTags(
                      possibleMatchingTags.filter((item) => item !== tag),
                    );
                  }}
                  type="button"
                >
                  #{tag}
                </Button>
              ))}
            </Flex>
          ) : null} */}
        </FormGroup>
      ) : null}

      {/* TYPE */}
      <FormGroup
        label="Type"
        name="type"
        // error={errors.type?.message as string}
      >
        <Flex gap="xs" wrap="wrap" justify="start">
          <TypeRadio value="link" name="type" />
          <TypeRadio value="article" name="type" />
          <TypeRadio value="video" name="type" />
          <TypeRadio value="audio" name="type" />
          <TypeRadio value="recipe" name="type" />
          <TypeRadio value="image" name="type" />
          <TypeRadio value="document" name="type" />
          <TypeRadio value="product" name="type" />
          <TypeRadio value="game" name="type" />
          <TypeRadio value="note" name="type" />
          <TypeRadio value="event" name="type" />
        </Flex>
      </FormGroup>

      <Flex gap="s">
        <Button type="submit">Save</Button>
      </Flex>
    </form>
  );
};
