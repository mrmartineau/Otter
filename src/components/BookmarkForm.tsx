'use client';

import { Button } from '@/src/components/Button';
import { Input } from '@/src/components/Input';
import { Textarea } from '@/src/components/Textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/src/components/Tooltip';
import { useToast } from '@/src/hooks/use-toast';
import { MagicWand } from '@phosphor-icons/react/dist/ssr';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { clsx } from 'clsx';
import { useRouter } from 'next/navigation';
import {
  ChangeEvent,
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
import { MetadataResponse } from '../types/api';
import { type Bookmark, type BookmarkFormValues } from '../types/db';
import { MetaTag, getDbMetadata } from '../utils/fetching/meta';
import { getScrapeData } from '../utils/fetching/scrape';
import { getErrorMessage } from '../utils/get-error-message';
import { MatchTagsProps, matchTags } from '../utils/matchTags';
import { Combobox } from './Combobox';
import { FieldValueSuggestion } from './FieldValueSuggestion';
import { Flex } from './Flex';
import { FormGroup } from './FormGroup';
import { PossibleMatchingItems } from './PossibleMatchingItems';
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
}

export const BookmarkForm = ({
  className,
  type,
  initialValues,
  onSubmit,
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
  const [formSubmitting, , setFormSubmitting] = useToggle(false);
  const [bookmarkTags, setBookmarkTags] = useState<MetaTag[]>([]);
  const [formError, setFormError] = useState<string>('');
  const [possibleMatchingItems, setPossibleMatchingItems] = useState<
    Bookmark[] | null
  >(null);
  const [possibleMatchingTags, setPossibleMatchingTags] = useState<string[]>(
    [],
  );
  const [isScraping, , setIsScraping] = useToggle(false);
  const [scrapeResponse, setScrapeResponse] = useState<MetadataResponse>();

  useEffect(() => {
    const getMetaData = async () => {
      const { tags } = await getDbMetadata(supabaseClient);
      setBookmarkTags(tags);
    };

    getMetaData();
  }, []);

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
    return bookmarkTags?.map((item) => ({
      label: item.tag,
      value: item.tag,
    }));
  }, [bookmarkTags]);

  const handleMatchTags = useCallback(
    (data: MatchTagsProps) => {
      setPossibleMatchingTags(matchTags(data, bookmarkTags));
    },
    [bookmarkTags],
  );

  const handleScrape = useCallback(
    async (value: string) => {
      setIsScraping(true);
      try {
        const url = new URL(value);
        const data = await getScrapeData(url.toString());

        const values = getValues();
        if (!values.title) {
          setValue('title', data.title);
        }
        if (!values.description) {
          setValue('description', data?.description);
        }
        if (data.url !== data.image) {
          setValue('image', data.image as string);
        }
        if (data.url !== value) {
          setValue('url', data.url);
        }
        setValue('type', data.urlType);
        setScrapeResponse(data);
        handleMatchTags({
          title: data?.title ?? '',
          description: data.description as string,
        });
      } catch (error: unknown) {
        const errorMessage = getErrorMessage(error);
        console.error(errorMessage);
      } finally {
        setIsScraping(false);
      }
    },
    [getValues, handleMatchTags, setIsScraping, setValue],
  );

  useEffect(() => {
    const urlQueryParam = initialValues?.url;
    if (urlQueryParam && isNew) {
      setValue('url', urlQueryParam);
      handleScrape(urlQueryParam);
      // checkMatchingItems(urlQueryParam);
    }
  }, [handleScrape, isNew, setValue, initialValues]);

  const handleUrlBlur = async (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (value && isNew) {
      await checkMatchingItems(value);
    } else {
      setPossibleMatchingItems(null);
    }
  };

  const checkMatchingItems = async (link: string): Promise<void> => {
    try {
      const url = new URL(link);
      const { data } = await supabaseClient.rpc('check_url', {
        url_input: url.hostname,
      });
      setPossibleMatchingItems(data);
    } catch (err) {
      setPossibleMatchingItems(null);
    }
  };

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
          <Flex gapX="s" align="center">
            <Input
              id="url"
              placeholder={DEFAULT_BOOKMARK_FORM_URL_PLACEHOLDER}
              {...register('url')}
              onBlur={handleUrlBlur}
              autoFocus
            />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="icon"
                    size="s"
                    type="button"
                    disabled={!watchUrl || isScraping}
                    onClick={() => {
                      if (watchUrl) {
                        handleScrape(watchUrl);
                      }
                    }}
                  >
                    <MagicWand weight="duotone" size="18" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{CONTENT.scrapeThisUrl}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Flex>
          <PossibleMatchingItems items={possibleMatchingItems} />
        </FormGroup>

        {/* TITLE */}
        <FormGroup label="Title" name="title">
          <Input id="title" placeholder="Title" {...register('title')} />
          {watchTitle !== scrapeResponse?.title ? (
            <FieldValueSuggestion
              id="title"
              setValue={setValue}
              suggestion={scrapeResponse?.title as string}
            />
          ) : null}
        </FormGroup>

        {/* DESCRIPTION */}
        <FormGroup label="Description" name="description">
          <Textarea id="description" {...register('description')}></Textarea>
          {watchDescription !== scrapeResponse?.description ? (
            <FieldValueSuggestion
              id="description"
              setValue={setValue}
              suggestion={scrapeResponse?.description as string}
            />
          ) : null}
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
                    size="s"
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
