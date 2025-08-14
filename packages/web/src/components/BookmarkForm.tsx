import { DownloadIcon, SparkleIcon } from '@phosphor-icons/react'
import {
  type ComponentProps,
  type DispatchWithoutAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Textarea } from '@/components/Textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/Tooltip'
import { cn } from '@/utils/classnames'

import { CONTENT, DEFAULT_BOOKMARK_FORM_URL_PLACEHOLDER } from '../constants'
import { useToggle } from '../hooks/useToggle'
import type { MetadataResponse } from '../types/api'
import type { Bookmark, BookmarkFormValues } from '../types/db'
import type { MetaTag } from '../utils/fetching/meta'
import { getScrapeData } from '../utils/fetching/scrape'
import { fullPath } from '../utils/fullPath'
import { getErrorMessage } from '../utils/get-error-message'
import { type MatchTagsProps, matchTags } from '../utils/matchTags'
import { supabase } from '../utils/supabase/client'
import './BookmarkForm.css'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  rewriteDescriptionOptions,
  rewriteTitleOptions,
} from '@/utils/fetching/ai'
import { Combobox } from './Combobox'
import { FieldValueSuggestion } from './FieldValueSuggestion'
import { Flex } from './Flex'
import { FormGroup } from './FormGroup'
import { IconButton } from './IconButton'
import { PossibleMatchingItems } from './PossibleMatchingItems'
import { TypeRadio } from './TypeRadio'

export interface ComboOption {
  label: string
  value: string
}

export const setComboboxValue = (
  tags?: string[] | null
): readonly ComboOption[] => {
  if (!tags) {
    return []
  }
  return tags.map((item) => ({
    label: item,
    value: item,
  }))
}

interface BookmarkFormProps extends ComponentProps<'div'> {
  type: 'new' | 'edit'
  initialValues?: Partial<BookmarkFormValues>
  onSubmit?: DispatchWithoutAction
  id?: string
  tags?: MetaTag[]
}

export const BookmarkForm = ({
  className,
  type,
  initialValues,
  onSubmit,
  id,
  tags,
  ...rest
}: BookmarkFormProps) => {
  const isNew = type === 'new'
  const navigate = useNavigate()
  const bookmarkformClass = cn(className, 'bookmark-form flex flex-col gap-s')
  const [formSubmitting, , setFormSubmitting] = useToggle(false)
  const [formError, setFormError] = useState<string>('')
  const [possibleMatchingItems, setPossibleMatchingItems] = useState<
    Bookmark[] | null
  >(null)
  const [possibleMatchingTags, setPossibleMatchingTags] = useState<string[]>([])
  const [isScraping, , setIsScraping] = useToggle(false)
  const [scrapeResponse, setScrapeResponse] = useState<MetadataResponse>()
  const queryClient = useQueryClient()
  const { getValues, register, handleSubmit, setValue, watch } =
    useForm<BookmarkFormValues>({
      defaultValues: {
        type: 'link',
        ...initialValues,
      },
    })
  const watchUrl = watch('url')
  const watchTitle = watch('title')
  const watchDescription = watch('description')
  const watchNote = watch('note')
  const watchTags = watch('tags')
  const watchImage = watch('image')

  const { mutate: handleAiTitleMutate, isPending: isTitleAiLoading } =
    useMutation({
      ...rewriteTitleOptions(watchTitle),
      onSuccess: (data) => {
        setValue('title', data.response)
      },
    })
  const {
    mutate: handleAiDescriptionMutate,
    isPending: isDescriptionAiLoading,
  } = useMutation({
    // @ts-expect-error - TODO: fix this
    ...rewriteDescriptionOptions(watchDescription, watchTitle),
    onSuccess: (data) => {
      setValue('description', data.response)
    },
  })

  const handleSubmitForm = async (formData: BookmarkFormValues) => {
    setFormSubmitting(true)
    setFormError('')

    try {
      if (isNew) {
        await supabase.from('bookmarks').insert([{ ...formData }], {
          defaultToNull: true,
        })
        toast.success('Item added')
        navigate({ to: '/feed' })
      } else {
        await supabase
          .from('bookmarks')
          // @ts-ignore
          .update({ ...formData, modified_at: new Date() })
          .match({ id })
        toast.success('Item edited')
      }
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] })
      onSubmit?.()
    } catch (err) {
      console.error(err)
      toast.message('Uh oh! Something went wrong.', {
        description: 'There was a problem with your request. Please try again.',
      })
    }
  }

  const transformedTagsForCombobox = useMemo(() => {
    return tags
      ?.filter((item) => item.tag !== 'Untagged')
      .map((item) => {
        return {
          label: item.tag,
          value: item.tag,
        }
      })
  }, [tags])

  const handleMatchTags = useCallback(
    (data: MatchTagsProps) => {
      setPossibleMatchingTags(matchTags(data, tags))
    },
    [tags]
  )

  const handleScrape = useCallback(
    async (value: string) => {
      setIsScraping(true)
      try {
        const url = new URL(value)
        const data = await getScrapeData(url.toString())

        const values = getValues()
        if (!values.title) {
          setValue('title', data.title)
        }
        if (!values.description) {
          setValue('description', data?.description)
        }
        if (data.url !== data.image) {
          setValue('image', data.image as string)
        }
        if (data.url !== value) {
          setValue('url', data.url)
        }
        setValue('feed', data.feeds?.length ? data.feeds[0] : null)
        setValue('type', data.urlType)
        setScrapeResponse(data)
        handleMatchTags({
          description: data.description as string,
          title: data?.title ?? '',
        })
      } catch (error: unknown) {
        const errorMessage = getErrorMessage(error)
        console.error(errorMessage)
      } finally {
        setIsScraping(false)
      }
    },
    [getValues, handleMatchTags, setIsScraping, setValue]
  )

  useEffect(() => {
    const urlQueryParam = initialValues?.url
    if (urlQueryParam && isNew) {
      setValue('url', urlQueryParam)
      handleScrape(urlQueryParam)
      // checkMatchingItems(urlQueryParam);
    }
  }, [handleScrape, isNew, setValue, initialValues])

  const checkMatchingItems = useCallback(
    async (link: string): Promise<void> => {
      try {
        const url = new URL(link)
        const { data } = await supabase.rpc('check_url', {
          url_input: url.hostname,
        })
        setPossibleMatchingItems(data as Bookmark[])
      } catch (err) {
        setPossibleMatchingItems(null)
      }
    },
    []
  )

  const handleCheckExistingItem = useCallback(
    async (value?: string) => {
      if (value && isNew) {
        await checkMatchingItems(value)
      } else {
        setPossibleMatchingItems(null)
      }
    },
    [checkMatchingItems, isNew]
  )

  // check for matching tags when content changes
  useEffect(() => {
    if (watchTitle || watchDescription || watchNote) {
      const matchTagsData: MatchTagsProps = {}
      if (watchTitle) {
        matchTagsData.title = watchTitle
      }
      if (watchDescription) {
        matchTagsData.description = watchDescription
      }
      if (watchNote) {
        matchTagsData.note = watchNote
      }
      handleMatchTags(matchTagsData)
    }
  }, [watchTitle, watchDescription, watchNote, handleMatchTags])

  useEffect(() => {
    if (watchUrl && watchUrl.length > 4) {
      handleCheckExistingItem(watchUrl)
    }
  }, [handleCheckExistingItem, watchUrl])

  return (
    <div className="bookmark-form" {...rest}>
      <h2 className="mb-s">{isNew ? CONTENT.newTitle : CONTENT.editTitle}</h2>
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
                          // handleScrape(watchUrl)
                        }
                      }}
                    >
                      <DownloadIcon weight="duotone" size="18" />
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
                  handleScrape(watchUrl)
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
                      type="button"
                      size="s"
                      disabled={!watchTitle || isTitleAiLoading}
                      onClick={() => {
                        handleAiTitleMutate()
                      }}
                    >
                      <SparkleIcon weight="duotone" size="18" />
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
                      type="button"
                      size="s"
                      disabled={!watchDescription || isDescriptionAiLoading}
                      onClick={() => {
                        handleAiDescriptionMutate()
                      }}
                    >
                      <SparkleIcon weight="duotone" size="18" />
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
                (option as ComboOption[]).map((item) => item.value)
              )
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
                    const existingTags = watchTags?.length ? watchTags : []
                    setValue('tags', [...existingTags, tag])
                    possibleMatchingTags[index]
                    setPossibleMatchingTags(
                      possibleMatchingTags.filter((item) => item !== tag)
                    )
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
          <Textarea
            id="image"
            {...register('image')}
            className="min-h-[41px]"
          ></Textarea>
        </FormGroup>

        {formError && <div className="my-m">Error: {formError}</div>}

        <div>
          <Button size="m" type="submit" disabled={formSubmitting}>
            Save
          </Button>
        </div>
      </form>
    </div>
  )
}
