'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { clsx } from 'clsx';
import { useRouter } from 'next/navigation';
import {
  ComponentPropsWithoutRef,
  DispatchWithoutAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useForm } from 'react-hook-form';

import { CONTENT, DEFAULT_BOOKMARK_FORM_URL_PLACEHOLDER } from '../constants';
import { useToggle } from '../hooks/useToggle';
import { Bookmark, BookmarkFormValues } from '../types/db';
import { MetaTag } from '../utils/fetching/meta';
import { MatchTagsProps, matchTags } from '../utils/matchTags';
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

interface BookmarkFormProps extends ComponentPropsWithoutRef<'div'> {
  type: 'new' | 'edit';
  initialValues?: Partial<BookmarkFormValues>;
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
  id,
  ...rest
}: BookmarkFormProps) => {
  const isNew = type === 'new';
  const router = useRouter();
  const bookmarkformClass = clsx(
    className,
    'bookmark-form flex flex-col gap-s',
  );
  const supabaseClient = createClientComponentClient();
  const [formTags, setFormTags] = useState<string[]>();
  const [formError, setFormError] = useState<string>('');
  const [formSubmitting, , setFormSubmitting] = useToggle(false);
  const [possibleMatchingItems, setPossibleMatchingItems] = useState<
    Bookmark[] | null
  >(null);
  const [possibleMatchingTags, setPossibleMatchingTags] = useState<string[]>(
    [],
  );
  // const [isScraping, , setIsScraping] = useToggle(false);
  // const [scrapeResponse, setScrapeResponse] = useState<MetadataResponse>();
  console.log(`🚀 ~ initialValues:`, initialValues);

  const {
    getValues,
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    watch,
  } = useForm<BookmarkFormValues>({
    defaultValues: {
      type: 'link',
      ...initialValues,
    },
  });
  const watchUrl = watch('url');
  const watchTitle = watch('title');
  const watchDescription = watch('description');
  const watchNote = watch('note');
  const watchTags = watch('tags');
  const { toast } = useToast();

  const handleSubmitForm = async (formData: BookmarkFormValues) => {
    setFormSubmitting(true);
    setFormError('');

    try {
      if (isNew) {
        await supabaseClient.from('bookmarks').insert([{ ...formData }], {
          defaultToNull: true,
        });
        toast({
          title: 'Bookmark added',
        });
        router.push('/feed');
      } else {
        await supabaseClient
          .from('bookmarks')
          .update({ ...formData, modified_at: new Date() })
          .match({ id });
        toast({
          title: 'Bookmark edited',
        });
        router.push(`/bookmark/${id}`);
      }
      onSubmit?.(); // TODO: toast?
    } catch (err) {
      console.error(err);
      toast({
        title: 'Uh oh! Something went wrong.',
        description: 'There was a problem with your request. Please try again.',
      });
    }
  };

  const transformedTagsForCombobox = useMemo(() => {
    return tags.map((item) => ({
      label: item.tag,
      value: item.tag,
    }));
  }, [tags]);

  const handleMatchTags = useCallback(
    (data: MatchTagsProps) => {
      setPossibleMatchingTags(matchTags(data, tags));
    },
    [tags],
  );

  // check for matching tags when content changes
  useEffect(() => {
    if (watchTitle || watchDescription || watchNote) {
      const matchTagsData: MatchTagsProps = {};
      if (watchTitle) {
        matchTagsData.title = watchTitle;
      }
      if (watchDescription) {
        matchTagsData.description = watchDescription;
      }
      if (watchNote) {
        matchTagsData.note = watchNote;
      }
      handleMatchTags(matchTagsData);
    }
  }, [watchTitle, watchDescription, watchNote, handleMatchTags]);

  return (
    <div className="bookmark-form" {...rest}>
      <h2 className="mb-s">{isNew ? CONTENT.newTitle : CONTENT.editTitle}</h2>
      <form
        onSubmit={handleSubmit(handleSubmitForm)}
        className={bookmarkformClass}
      >
        <input type="hidden" {...register('image')} />

        {/* URL */}
        <FormGroup label="URL" name="url">
          <Input
            id="url"
            placeholder={DEFAULT_BOOKMARK_FORM_URL_PLACEHOLDER}
            // defaultValue={initialValues?.url || ''}
            {...register('url')}
            autoFocus
          />
        </FormGroup>

        {/* TITLE */}
        <FormGroup label="Title" name="title">
          <Input
            id="title"
            placeholder="Title"
            // defaultValue={initialValues?.title || ''}
            {...register('title')}
          />
        </FormGroup>

        {/* DESCRIPTION */}
        <FormGroup label="Description" name="description">
          <Textarea id="description" {...register('description')}></Textarea>
        </FormGroup>

        {/* NOTE */}
        <FormGroup label="Note" name="note">
          <Textarea id="note" {...register('note')}></Textarea>
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
                setValue(
                  'tags',
                  (option as ComboOption[]).map((item) => item.value),
                );
              }}
              value={transformTagsForCombobox(watchTags)}
              maxMenuHeight={100}
            />
            {possibleMatchingTags.length ? (
              <Flex
                className="mt-2 text-sm"
                gapX="xs"
                align="center"
                wrap="wrap"
              >
                Suggested tags:
                {possibleMatchingTags.map((tag, index) => (
                  <Button
                    key={`possibleTagMatch-${tag}`}
                    variant="ghost"
                    size="sm"
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
            ) : null}
          </FormGroup>
        ) : null}

        {/* TYPE */}
        <FormGroup
          label="Type"
          name="type"
          // error={errors.type?.message as string}
        >
          <Flex gap="xs" wrap="wrap" justify="start">
            <TypeRadio value="link" {...register('type')} />
            <TypeRadio value="article" {...register('type')} />
            <TypeRadio value="video" {...register('type')} />
            <TypeRadio value="audio" {...register('type')} />
            <TypeRadio value="recipe" {...register('type')} />
            <TypeRadio value="image" {...register('type')} />
            <TypeRadio value="document" {...register('type')} />
            <TypeRadio value="product" {...register('type')} />
            <TypeRadio value="game" {...register('type')} />
            <TypeRadio value="note" {...register('type')} />
            <TypeRadio value="event" {...register('type')} />
          </Flex>
        </FormGroup>

        {formError && <div className="my-m">Error: {formError}</div>}

        <Flex gap="s">
          <Button type="submit">Save</Button>
        </Flex>
      </form>
    </div>
  );
};
