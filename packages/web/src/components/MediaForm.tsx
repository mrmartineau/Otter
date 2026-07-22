import { useQuery } from '@tanstack/react-query'
import { type ComponentProps, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useDebounceValue } from 'usehooks-ts'
import { Button } from '@/components/Button'
import { Combobox } from '@/components/Combobox'
import { Flex } from '@/components/Flex'
import { FormGroup } from '@/components/FormGroup'
import { Input } from '@/components/Input'
import type { MediaInsert, MediaRating, MediaStatus } from '@/types/db'
import { getMediaSearchOptions } from '@/utils/fetching/media'
import { IconControl } from './IconControl'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './Select'
import { MediaTypeToIcon } from './TypeToIcon'

export interface ComboOption {
  label: string
  value: string
}

export const setComboboxValue = (
  platforms?: string[] | null,
): readonly ComboOption[] => {
  if (!platforms) {
    return []
  }
  return platforms.map((item) => ({
    label: item,
    value: item,
  }))
}

const mediaTypes = [
  'tv',
  'film',
  'game',
  'book',
  'podcast',
  'music',
  'other',
] as const

const statuses = [
  { label: 'Wishlist', value: 'wishlist' },
  { label: 'Now', value: 'now' },
  { label: 'Done', value: 'done' },
] as const

const ratings = [
  '0',
  '0.5',
  '1',
  '1.5',
  '2',
  '2.5',
  '3',
  '3.5',
  '4',
  '4.5',
  '5',
] as const

interface MediaFormProps extends Omit<ComponentProps<'div'>, 'id'> {
  type: 'new' | 'edit'
  initialValues?: Partial<MediaInsert>
  onFormSubmit?: (data: MediaInsert) => void
  id?: number
  platforms?: string[]
  isSubmitting?: boolean
}

export const MediaForm = ({
  className,
  type,
  initialValues,
  onFormSubmit,
  id,
  platforms = [],
  isSubmitting = false,
  ...rest
}: MediaFormProps) => {
  const isNew = type === 'new'

  const { register, handleSubmit, setValue, watch, reset } =
    useForm<MediaInsert>({
      defaultValues: {
        name: '',
        status: 'wishlist',
        type: 'tv',
        ...initialValues,
      },
    })

  const watchPlatform = watch('platform')
  const watchType = watch('type')
  const watchStatus = watch('status')
  const watchRating = watch('rating')
  const watchImage = watch('image')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch] = useDebounceValue(searchQuery.trim(), 500)
  const { data: mediaSearch, isFetching: isSearching } = useQuery(
    getMediaSearchOptions({
      query: debouncedSearch,
      type: watchType,
    }),
  )

  const limitedMediaSearch = mediaSearch?.data?.slice(0, 6)

  const transformedPlatformsForCombobox = platforms.map((platform) => ({
    label: platform,
    value: platform,
  }))

  const handleSubmitForm = async (formData: MediaInsert) => {
    try {
      onFormSubmit?.(formData)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="media-form" {...rest}>
      <h2 className="mb-s">{isNew ? 'New media item' : 'Edit media item'}</h2>
      <form
        onSubmit={handleSubmit(handleSubmitForm)}
        className="flex flex-col gap-m"
      >
        <input type="hidden" {...register('sort_order')} value={0} />
        <input type="hidden" {...register('image')} />
        <input type="hidden" {...register('media_id')} />

        {/* TYPE */}
        <FormGroup label="Type" name="type">
          <Flex gap="xs" wrap="wrap" justify="start">
            {mediaTypes.map((mediaType) => (
              <IconControl
                key={mediaType}
                type="radio"
                value={mediaType}
                label={mediaType}
                {...register('type')}
              >
                <MediaTypeToIcon type={mediaType} />
              </IconControl>
            ))}
          </Flex>
        </FormGroup>

        <div className="media-form-grid">
          {/* SEARCH */}
          <div className="media-form-col">
            <FormGroup
              label="Search"
              name="media-search"
              note="Search to autofill the name and artwork"
            >
              <Input
                id="media-search"
                type="search"
                placeholder={`Search for a ${watchType ?? 'media'} title…`}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                autoComplete="off"
                autoFocus={isNew}
              />
            </FormGroup>
            {debouncedSearch ? (
              <div
                className="media-form-results flex flex-col gap-xs"
                aria-live="polite"
              >
                {limitedMediaSearch?.length ? (
                  limitedMediaSearch.map((item) => (
                    <Button
                      variant="outline"
                      key={item.id}
                      className="px-s justify-start h-auto"
                      onClick={() => {
                        setValue('name', item.title)
                        setValue('media_id', item.id)
                        setValue('image', item.image)
                      }}
                      type="button"
                    >
                      <img
                        src={item.image}
                        alt=""
                        width={50}
                        className="rounded-xs shrink-0"
                        loading="lazy"
                      />
                      <div className="flex flex-col gap-xs text-sm text-left">
                        <div>{item.title}</div>
                        {item?.maker ? (
                          <div className="text-muted-foreground">
                            {item.maker}
                          </div>
                        ) : null}
                      </div>
                    </Button>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">
                    {isSearching ? 'Searching…' : 'No results found'}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* DETAILS */}
          <div className="media-form-col">
            {/* NAME */}
            <FormGroup label="Name" name="name">
              <Input
                id="name"
                placeholder="Enter media name"
                {...register('name', { required: true })}
                autoComplete="off"
              />
            </FormGroup>

            {/* PLATFORM */}
            <FormGroup label="Platform" name="platform">
              <Combobox
                inputId="platform"
                options={transformedPlatformsForCombobox}
                onChange={(option) => {
                  setValue(
                    'platform',
                    (option as ComboOption[])[0]?.value || '',
                  )
                }}
                value={
                  watchPlatform
                    ? [{ label: watchPlatform, value: watchPlatform }]
                    : []
                }
                maxMenuHeight={100}
                placeholder="Select or enter platform"
              />
            </FormGroup>

            <div className="media-form-row">
              {/* STATUS */}
              <FormGroup label="Status" name="status">
                <Select
                  value={watchStatus ?? undefined}
                  onValueChange={(value) => {
                    setValue('status', value as MediaStatus)
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormGroup>

              {/* RATING */}
              <FormGroup label="Rating" name="rating">
                <Select
                  value={watchRating ?? undefined}
                  onValueChange={(value) => {
                    setValue('rating', value as MediaRating)
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="No rating" />
                  </SelectTrigger>
                  <SelectContent>
                    {ratings.map((ratingValue) => (
                      <SelectItem key={ratingValue} value={ratingValue}>
                        {ratingValue} ★
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormGroup>
            </div>

            {/* IMAGE */}
            {watchImage ? (
              <FormGroup label="Artwork" name="image">
                <img
                  src={watchImage}
                  alt={watch('name') ?? ''}
                  width={100}
                  className="rounded-xs"
                />
              </FormGroup>
            ) : null}
          </div>
        </div>

        <div className="media-form-footer">
          <Flex gap="xs" direction="column">
            <Button type="submit" disabled={isSubmitting}>
              {isNew ? 'Create' : 'Update'}
            </Button>
            <Button
              variant="ghost"
              type="button"
              onClick={() => {
                reset()
                setSearchQuery('')
              }}
            >
              Reset
            </Button>
          </Flex>
        </div>
      </form>
    </div>
  )
}
