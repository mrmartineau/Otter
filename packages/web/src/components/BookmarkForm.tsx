import buy01Sfx from '@mrmartineau/kit/sounds/buy-01.mp3'
import buy02Sfx from '@mrmartineau/kit/sounds/buy-02.mp3'
import useSound from '@mrmartineau/use-sound'
import { CircleIcon, DownloadIcon, SparkleIcon } from '@phosphor-icons/react'
import { useForm, useStore } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  type ComponentProps,
  type DispatchWithoutAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { components as selectComponents } from 'react-select'
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
import { useClassifyMutation } from '@/hooks/useClassifyMutation'
import { useIsBookmarklet } from '@/hooks/useIsBookmarklet'
import { useIsMobile } from '@/hooks/useMobile'
import { useScrapeMutation } from '@/hooks/useScrapeMutation'
import {
  rewriteDescriptionOptions,
  rewriteTitleOptions,
} from '@/utils/fetching/ai'
import {
  CONTENT,
  DEFAULT_BOOKMARK_FORM_URL_PLACEHOLDER,
  ROUTE_NEW_BOOKMARK_CONFIRMATION,
} from '../constants'
import type { Bookmark, BookmarkFormValues } from '../types/db'
import type { MetaTag } from '../utils/fetching/meta'
import { fullPath } from '../utils/fullPath'
import { supabase } from '../utils/supabase/client'
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
  tags?: string[] | null,
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

const normalizeUrl = (value: string) => {
  try {
    return new URL(value).toString()
  } catch {
    return value.trim()
  }
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
  const [possibleMatchingItems, setPossibleMatchingItems] = useState<
    Bookmark[] | null
  >(null)
  const [newTagNames, setNewTagNames] = useState<Set<string>>(new Set())
  const [showNote, setShowNote] = useState(() => !!initialValues?.note)
  const hasAutoClassified = useRef(false)
  const lastScrapedUrl = useRef<string | null>(null)
  const queryClient = useQueryClient()
  const [playAdd] = useSound(buy01Sfx, { volume: 0.2 })
  const [playEdit] = useSound(buy02Sfx, { volume: 0.2 })

  const form = useForm({
    defaultValues: {
      type: 'link',
      ...initialValues,
    } as BookmarkFormValues,
    onSubmit: async ({ value }) => {
      await handleSubmitForm(value)
    },
  })

  const watchUrl = useStore(form.store, (s) => s.values.url)
  const watchTitle = useStore(form.store, (s) => s.values.title)
  const watchDescription = useStore(form.store, (s) => s.values.description)
  const watchTags = useStore(form.store, (s) => s.values.tags)
  const watchImage = useStore(form.store, (s) => s.values.image)
  const isSubmitting = useStore(form.store, (s) => s.isSubmitting)

  const setFieldValue = useCallback(
    (field: keyof BookmarkFormValues, value: unknown) => {
      form.setFieldValue(field, value as never)
    },
    [form],
  )

  // AI title rewrite
  const { mutate: handleAiTitleMutate, isPending: isTitleAiLoading } =
    useMutation({
      ...rewriteTitleOptions(watchTitle),
      onSuccess: (data) => {
        setFieldValue('title', data.response)
      },
    })

  // AI description rewrite
  const {
    mutate: handleAiDescriptionMutate,
    isPending: isDescriptionAiLoading,
  } = useMutation({
    // @ts-expect-error - TODO: fix this
    ...rewriteDescriptionOptions(watchDescription, watchTitle),
    onSuccess: (data) => {
      setFieldValue('description', data.response)
    },
  })

  const existingTagNames = useMemo(
    () =>
      tags
        ?.filter(
          (item) => item.tag !== 'Untagged' && !item.tag?.startsWith('like:'),
        )
        .map((item) => item.tag as string) ?? [],
    [tags],
  )

  // Classifying
  const classifyMutation = useClassifyMutation()

  const triggerClassify = useCallback(() => {
    const values = form.state.values
    classifyMutation.mutate(
      {
        currentType: values.type ?? 'link',
        description: (values.description as string) ?? '',
        tags: existingTagNames,
        title: values.title ?? '',
        url: values.url ?? '',
      },
      {
        onSuccess: (data) => {
          const existingTags = form.state.values.tags ?? []
          const newNames = new Set(
            data.tags.filter((t) => t.isNew).map((t) => t.name),
          )
          const suggestedNames = data.tags.map((t) => t.name)
          const merged = [
            ...existingTags,
            ...suggestedNames.filter((name) => !existingTags.includes(name)),
          ]
          setFieldValue('tags', merged)
          setNewTagNames(newNames)
          if (data.type) {
            setFieldValue('type', data.type)
          }
        },
      },
    )
  }, [classifyMutation, existingTagNames, form, setFieldValue])

  // Scraping
  const scrapeMutation = useScrapeMutation()

  const handleScrape = useCallback(
    (url: string) => {
      scrapeMutation.mutate(url, {
        onError: (error) => {
          console.error(error)
        },
        onSuccess: (data) => {
          lastScrapedUrl.current = normalizeUrl(data.url ?? url)
          setFieldValue('title', data.title)
          setFieldValue('description', data.description)
          if (data.url !== data.image) {
            setFieldValue('image', data.image)
          }
          if (data.url !== url) {
            setFieldValue('url', data.url)
          }
          setFieldValue('feed', data.feeds?.length ? data.feeds[0] : null)
          setFieldValue('type', data.urlType)

          if (!hasAutoClassified.current) {
            hasAutoClassified.current = true
            triggerClassify()
          }
        },
      })
    },
    [scrapeMutation, setFieldValue, triggerClassify],
  )

  const handleSubmitForm = async (formData: BookmarkFormValues) => {
    try {
      if (isNew) {
        const { data: insertedBookmark, error } = await supabase
          .from('bookmarks')
          .insert([{ ...formData }], {
            defaultToNull: true,
          })
          .select('id')
          .single()
        if (error) {
          throw error
        }
        playAdd()
        if (isBookmarklet && insertedBookmark?.id) {
          navigate({
            search: {
              bookmarklet: isBookmarklet ? 'true' : undefined,
              id: insertedBookmark.id,
            },
            to: ROUTE_NEW_BOOKMARK_CONFIRMATION,
          })
        } else {
          toast.success('Item added')
          navigate({ to: '/feed' })
        }
      } else {
        await supabase
          .from('bookmarks')
          // @ts-expect-error - TODO: fix this
          .update({ ...formData, modified_at: new Date() })
          .match({ id })
        playEdit()
        toast.success('Item edited')
      }
      await queryClient.invalidateQueries({ queryKey: ['bookmarks'] })
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: I only want this run once on load
  useEffect(() => {
    const urlQueryParam = initialValues?.url
    if (urlQueryParam && isNew) {
      setFieldValue('url', urlQueryParam)
      handleScrape(urlQueryParam)
    }
  }, [])

  const checkMatchingItems = useCallback(
    async (link: string): Promise<void> => {
      try {
        const url = new URL(link)
        const { data } = await supabase.rpc('check_url', {
          url_input: url.hostname,
        })
        setPossibleMatchingItems(data as Bookmark[])
      } catch {
        setPossibleMatchingItems(null)
      }
    },
    [],
  )

  const handleCheckExistingItem = useCallback(
    async (value?: string) => {
      if (value && isNew) {
        await checkMatchingItems(value)
      } else {
        setPossibleMatchingItems(null)
      }
    },
    [checkMatchingItems, isNew],
  )

  useEffect(() => {
    if (watchUrl && watchUrl.length > 4) {
      handleCheckExistingItem(watchUrl)
    }
  }, [handleCheckExistingItem, watchUrl])

  const isBookmarklet = useIsBookmarklet()
  const isMobile = useIsMobile()

  return (
    <div {...rest}>
      {isBookmarklet && !isMobile ? (
        <h2 className="mb-s">{isNew ? CONTENT.newTitle : CONTENT.editTitle}</h2>
      ) : null}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          form.handleSubmit()
        }}
        className="bookmark-form"
      >
        <div className="bookmark-form-grid">
          <form.Field name="feed">
            {(field) => (
              <input
                type="hidden"
                name={field.name}
                value={field.state.value ?? ''}
              />
            )}
          </form.Field>

          <div className="bookmark-form-col">
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
                        disabled={!watchUrl || scrapeMutation.isPending}
                        onClick={() => {
                          if (watchUrl) {
                            handleScrape(watchUrl)
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
              <form.Field name="url">
                {(field) => (
                  <Input
                    id="url"
                    name={field.name}
                    placeholder={DEFAULT_BOOKMARK_FORM_URL_PLACEHOLDER}
                    value={field.state.value ?? ''}
                    onBlur={(e) => {
                      field.handleBlur()
                      const url = e.target.value.trim()
                      if (
                        url &&
                        isNew &&
                        !scrapeMutation.isPending &&
                        normalizeUrl(url) !== lastScrapedUrl.current
                      ) {
                        handleScrape(url)
                      }
                    }}
                    onChange={(e) => field.handleChange(e.target.value)}
                    autoFocus
                  />
                )}
              </form.Field>
              <PossibleMatchingItems items={possibleMatchingItems} />
            </FormGroup>

            {/* TITLE */}
            <FormGroup
              label="Title"
              name="title"
              suggestion={
                watchTitle !== scrapeMutation.data?.title
                  ? (scrapeMutation.data?.title ?? undefined)
                  : undefined
              }
              onUseSuggestion={() =>
                setFieldValue('title', scrapeMutation.data?.title)
              }
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
              <form.Field name="title">
                {(field) => (
                  <Input
                    id="title"
                    name={field.name}
                    value={field.state.value ?? ''}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                )}
              </form.Field>
            </FormGroup>
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
              <form.Field name="description">
                {(field) => (
                  <Textarea
                    id="description"
                    name={field.name}
                    value={field.state.value ?? ''}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                )}
              </form.Field>
              {watchDescription !== scrapeMutation.data?.description ? (
                <FieldValueSuggestion
                  fieldId="description"
                  setFieldValue={setFieldValue}
                  suggestion={scrapeMutation.data?.description as string}
                  type="original"
                />
              ) : null}
            </FormGroup>

            {/* TAGS */}
            <FormGroup
              label="Tags"
              name="tags"
              labelSuffix={
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <IconButton
                        type="button"
                        size="s"
                        disabled={
                          (!watchUrl && !watchTitle) ||
                          classifyMutation.isPending
                        }
                        onClick={() => triggerClassify()}
                      >
                        <SparkleIcon weight="duotone" size="18" />
                      </IconButton>
                    </TooltipTrigger>
                    {classifyMutation.isPending ? (
                      <div className="text-xs text-muted-foreground">
                        Finding tags…
                      </div>
                    ) : null}
                    <TooltipContent>{CONTENT.findMatchingTags}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              }
            >
              <Combobox
                inputId="tags"
                options={transformedTagsForCombobox}
                onChange={(option) => {
                  setFieldValue(
                    'tags',
                    (option as ComboOption[]).map((item) => item.value),
                  )
                }}
                value={setComboboxValue(watchTags)}
                maxMenuHeight={100}
                components={{
                  MultiValue: (props) => {
                    const tagName = (props.data as ComboOption).value
                    const isNewTag = newTagNames.has(tagName ?? '')
                    return (
                      <div style={{ position: 'relative' }}>
                        <selectComponents.MultiValue {...props} />
                        {isNewTag ? (
                          <CircleIcon
                            weight="fill"
                            size="9"
                            className="absolute top-1 left-1 text-purple-500"
                          />
                        ) : null}
                      </div>
                    )
                  },
                }}
              />
            </FormGroup>

            {/* NOTE */}
            {showNote ? (
              <FormGroup label="Note" name="note">
                <form.Field name="note">
                  {(field) => (
                    <Textarea
                      id="note"
                      name={field.name}
                      value={field.state.value ?? ''}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  )}
                </form.Field>
              </FormGroup>
            ) : (
              <div>
                <Button
                  type="button"
                  variant="ghost"
                  size="2xs"
                  onClick={() => setShowNote(true)}
                >
                  Add note
                </Button>
              </div>
            )}
          </div>

          <div className="bookmark-form-col">
            {/* IMAGE */}
            {watchUrl && watchImage ? (
              <FormGroup label="Image" name="image">
                <img
                  src={fullPath(watchUrl, watchImage)}
                  alt=""
                  className="bookmark-form-image"
                />
                <form.Field name="image">
                  {(field) => (
                    <Input
                      id="image"
                      name={field.name}
                      value={field.state.value ?? ''}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  )}
                </form.Field>
              </FormGroup>
            ) : null}
            {/* TYPE */}
            <FormGroup label="Type" name="type">
              <form.Field name="type">
                {(field) => (
                  <div className="type-radio-wrapper">
                    {(
                      [
                        'link',
                        'article',
                        'video',
                        'audio',
                        'recipe',
                        'image',
                        'document',
                        'product',
                        'game',
                        'note',
                        'event',
                        'place',
                      ] as const
                    ).map((typeValue) => (
                      <TypeRadio
                        key={typeValue}
                        value={typeValue}
                        name={field.name}
                        checked={field.state.value === typeValue}
                        onChange={() => field.handleChange(typeValue)}
                      />
                    ))}
                  </div>
                )}
              </form.Field>
            </FormGroup>
          </div>
        </div>

        <Flex gap="xs">
          <Button type="submit" disabled={isSubmitting}>
            Save
          </Button>
          <Button
            variant="ghost"
            type="button"
            onClick={() => {
              form.reset()
              setNewTagNames(new Set())
              setPossibleMatchingItems(null)
              hasAutoClassified.current = false
              lastScrapedUrl.current = null
              scrapeMutation.reset()
              classifyMutation.reset()
            }}
          >
            Reset
          </Button>
        </Flex>
      </form>
    </div>
  )
}
