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
import { cn } from '@/src/utils/classnames';
import { Download, Sparkle } from '@phosphor-icons/react/dist/ssr';
import { Message, useChat } from 'ai/react';
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
import { toast } from 'sonner';

import { CONTENT, DEFAULT_BOOKMARK_FORM_URL_PLACEHOLDER } from '../constants';
import { useToggle } from '../hooks/useToggle';
import { MetadataResponse } from '../types/api';
import { type Bookmark, type BookmarkFormValues } from '../types/db';
import { MetaTag, getDbMetadata } from '../utils/fetching/meta';
import { getScrapeData } from '../utils/fetching/scrape';
import { fullPath } from '../utils/fullPath';
import { getErrorMessage } from '../utils/get-error-message';
import { MatchTagsProps, matchTags } from '../utils/matchTags';
import { createBrowserClient } from '../utils/supabase/client';
import './BookmarkForm.css';
import { Combobox } from './Combobox';
import { FieldValueSuggestion } from './FieldValueSuggestion';
import { Flex } from './Flex';
import { FormGroup } from './FormGroup';
import { IconButton } from './IconButton';
import { PossibleMatchingItems } from './PossibleMatchingItems';
import { TypeRadio } from './TypeRadio';

export interface ComboOption {
  label: string;
  value: string;
}

export const setComboboxValue = (
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
  const bookmarkformClass = cn(className, 'bookmark-form flex flex-col gap-s');
  const supabaseClient = createBrowserClient();
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
  const {
    messages: titleAiMessages,
    setInput: setTitleAiInput,
    handleSubmit: handleAiTitleSubmit,
    isLoading: isTitleAiLoading,
  } = useChat({ api: '/api/ai/title' });
  const {
    messages: descriptionAiMessages,
    setInput: setDescriptionAiInput,
    handleSubmit: handleAiDescriptionSubmit,
    isLoading: isDescriptionAiLoading,
  } = useChat({ api: '/api/ai/description' });

  useEffect(() => {
    const getMetaData = async () => {
      const { tags } = await getDbMetadata(supabaseClient);
      setBookmarkTags(tags);
    };

    getMetaData();
  }, [supabaseClient]);

  const { getValues, register, handleSubmit, setValue, watch } =
    useForm<BookmarkFormValues>({
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
  const watchImage = watch('image');

  const handleSubmitForm = async (formData: BookmarkFormValues) => {
    setFormSubmitting(true);
    setFormError('');

    try {
      if (isNew) {
        await supabaseClient.from('bookmarks').insert([{ ...formData }], {
          defaultToNull: true,
        });
        toast.success('Item added');
        router.push('/feed');
      } else {
        await supabaseClient
          .from('bookmarks')
          // @ts-ignore
          .update({ ...formData, modified_at: new Date() })
          .match({ id });
        toast.success('Item edited');
      }
      onSubmit?.();
    } catch (err) {
      console.error(err);
      toast.message('Uh oh! Something went wrong.', {
        description: 'There was a problem with your request. Please try again.',
      });
    }
  };

  const transformedTagsForCombobox = useMemo(() => {
    return bookmarkTags
      ?.filter((item) => item.tag !== 'Untagged')
      .map((item) => {
        return {
          label: item.tag,
          value: item.tag,
        };
      });
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
        setValue('feed', data.feeds?.length ? data.feeds[0] : null);
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

  const checkMatchingItems = useCallback(
    async (link: string): Promise<void> => {
      try {
        const url = new URL(link);
        const { data } = await supabaseClient.rpc('check_url', {
          url_input: url.hostname,
        });
        setPossibleMatchingItems(data as Bookmark[]);
      } catch (err) {
        setPossibleMatchingItems(null);
      }
    },
    [supabaseClient],
  );

  const handleCheckExistingItem = useCallback(
    async (value?: string) => {
      if (value && isNew) {
        await checkMatchingItems(value);
      } else {
        setPossibleMatchingItems(null);
      }
    },
    [checkMatchingItems, isNew],
  );

  // check for matching tags when content changes
  useEffect(() => {
    if (watchTitle || watchDescription || watchNote) {
      const matchTagsData: MatchTagsProps = {};
      if (watchTitle) {
        matchTagsData.title = watchTitle;
        setTitleAiInput(watchTitle);
      }
      if (watchDescription) {
        matchTagsData.description = watchDescription;
        setDescriptionAiInput(watchDescription);
      }
      if (watchNote) {
        matchTagsData.note = watchNote;
      }
      handleMatchTags(matchTagsData);
    }
  }, [
    watchTitle,
    setDescriptionAiInput,
    watchDescription,
    watchNote,
    handleMatchTags,
    setTitleAiInput,
  ]);

  //  get most recent message from AI
  const latestAiMessageItem = (messages: Message[]) => {
    return messages
      .filter((item) => {
        return item.role !== 'user';
      })
      .findLast(() => true);
  };

  const lastTitleAiMessageItem = latestAiMessageItem(titleAiMessages);
  const lastDescriptionAiMessageItem = latestAiMessageItem(
    descriptionAiMessages,
  );

  useEffect(() => {
    if (watchUrl && watchUrl.length > 4) {
      handleCheckExistingItem(watchUrl);
    }
  }, [handleCheckExistingItem, watchUrl]);
  useEffect(() => {
    if (lastTitleAiMessageItem) {
      setValue('title', lastTitleAiMessageItem.content);
    }
  }, [lastTitleAiMessageItem, setValue]);
  useEffect(() => {
    if (lastDescriptionAiMessageItem) {
      setValue('description', lastDescriptionAiMessageItem.content);
    }
  }, [lastDescriptionAiMessageItem, setValue]);

  return (
    <div className="bookmark-form" {...rest}>
      <h2 className="mb-s">{isNew ? CONTENT.newTitle : CONTENT.editTitle}</h2>
      <form onSubmit={handleAiTitleSubmit} id="titleFix">
        <input value={watchTitle || ''} readOnly type="hidden" />
      </form>
      <form onSubmit={handleAiDescriptionSubmit} id="descriptionFix">
        <input value={watchDescription || ''} readOnly type="hidden" />
      </form>
      <form
        onSubmit={handleSubmit(handleSubmitForm)}
        className={bookmarkformClass}
      >
        <input type="hidden" {...register('feed')} />

        <div className="bookmark-form-grid">
          {/* URL */}
          <FormGroup
            label="URL"
            name="url"
            labelSuffix={
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <IconButton
                      type="button"
                      size="s"
                      disabled={!watchUrl || isScraping}
                      onClick={() => {
                        if (watchUrl) {
                          handleScrape(watchUrl);
                        }
                      }}
                    >
                      <Download weight="duotone" size="18" />
                    </IconButton>
                  </TooltipTrigger>
                  <TooltipContent>{CONTENT.scrapeThisUrl}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            }
          >
            <Input
              id="url"
              placeholder={DEFAULT_BOOKMARK_FORM_URL_PLACEHOLDER}
              {...register('url')}
              autoFocus
              onBlur={() => {
                if (watchUrl) {
                  handleScrape(watchUrl);
                }
              }}
            />
            <PossibleMatchingItems items={possibleMatchingItems} />
          </FormGroup>

          {/* TITLE */}
          <FormGroup
            label="Title"
            name="title"
            labelSuffix={
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <IconButton
                      type="submit"
                      size="s"
                      form="titleFix"
                      disabled={!watchTitle || isTitleAiLoading}
                    >
                      <Sparkle weight="duotone" size="18" />
                    </IconButton>
                  </TooltipTrigger>
                  <TooltipContent>{CONTENT.fixWithAi}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            }
          >
            <Textarea
              id="title"
              {...register('title')}
              className="min-h-[41px]"
            ></Textarea>
            {watchTitle !== scrapeResponse?.title ? (
              <FieldValueSuggestion
                fieldId="title"
                setFieldValue={setValue}
                suggestion={scrapeResponse?.title as string}
                type="original"
              />
            ) : null}
          </FormGroup>
        </div>

        <div className="bookmark-form-grid">
          {/* DESCRIPTION */}
          <FormGroup
            label="Description"
            name="description"
            labelSuffix={
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <IconButton
                      type="submit"
                      size="s"
                      form="descriptionFix"
                      disabled={!watchDescription || isDescriptionAiLoading}
                    >
                      <Sparkle weight="duotone" size="18" />
                    </IconButton>
                  </TooltipTrigger>
                  <TooltipContent>{CONTENT.fixWithAi}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            }
          >
            <Textarea id="description" {...register('description')}></Textarea>
            {watchDescription !== scrapeResponse?.description ? (
              <FieldValueSuggestion
                fieldId="description"
                setFieldValue={setValue}
                suggestion={scrapeResponse?.description as string}
                type="original"
              />
            ) : null}
          </FormGroup>

          {/* NOTE */}
          <FormGroup label="Note" name="note">
            <Textarea id="note" {...register('note')}></Textarea>
          </FormGroup>
        </div>

        {/* TAGS */}
        <FormGroup label="Tags" name="tags">
          <Combobox
            inputId="tags"
            options={transformedTagsForCombobox}
            onChange={(option) => {
              setValue(
                'tags',
                (option as ComboOption[]).map((item) => item.value),
              );
            }}
            value={setComboboxValue(watchTags)}
            maxMenuHeight={100}
          />
          {possibleMatchingTags.length ? (
            <Flex
              className="mt-2 text-sm"
              gapX="2xs"
              gapY="3xs"
              align="center"
              wrap="wrap"
            >
              Suggested tags:
              {possibleMatchingTags.map((tag, index) => (
                <Button
                  key={`possibleTagMatch-${tag}`}
                  variant="ghost"
                  size="2xs"
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

        {/* TYPE */}
        <FormGroup label="Type" name="type">
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
            <TypeRadio value="place" {...register('type')} />
          </Flex>
        </FormGroup>

        {/* IMAGE */}
        <FormGroup label="Image" name="image">
          {watchUrl && watchImage ? (
            <img
              src={fullPath(watchUrl, watchImage)}
              alt=""
              className="bookmark-form-image"
            />
          ) : null}
          {type === 'edit' ? (
            <Textarea
              id="image"
              {...register('image')}
              className="min-h-[41px]"
            ></Textarea>
          ) : (
            <input type="hidden" {...register('image')} />
          )}
        </FormGroup>

        {formError && <div className="my-m">Error: {formError}</div>}

        <div>
          <Button size="m" type="submit" disabled={formSubmitting}>
            Save
          </Button>
        </div>
      </form>
    </div>
  );
};
