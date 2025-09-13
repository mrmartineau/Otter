import { useSuspenseQuery } from '@tanstack/react-query'
import type { ComponentProps } from 'react'
import { useForm } from 'react-hook-form'
import { useDebounceValue } from 'usehooks-ts'
import { Button } from '@/components/Button'
import { Combobox } from '@/components/Combobox'
import { Flex } from '@/components/Flex'
import { FormGroup } from '@/components/FormGroup'
import { Input } from '@/components/Input'
import type { MediaInsert, MediaStatus } from '@/types/db'
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
  platforms?: string[] | null
): readonly ComboOption[] => {
  if (!platforms) {
    return []
  }
  return platforms.map((item) => ({
    label: item,
    value: item,
  }))
}

interface MediaFormProps extends Omit<ComponentProps<'div'>, 'id'> {
  type: 'new' | 'edit'
  initialValues?: Partial<MediaInsert>
  onFormSubmit?: (data: MediaInsert) => void
  id?: number
  platforms?: string[]
}

export const MediaForm = ({
  className,
  type,
  initialValues,
  onFormSubmit,
  id,
  platforms = [],
  ...rest
}: MediaFormProps) => {
  const isNew = type === 'new'

  const { register, handleSubmit, setValue, watch } = useForm<MediaInsert>({
    defaultValues: {
      name: '',
      status: 'wishlist',
      type: 'tv',
      ...initialValues,
    },
  })

  const watchPlatform = watch('platform')
  const watchType = watch('type')
  const watchName = watch('name')
  const [debouncedName] = useDebounceValue(watchName, 1000)
  const { data: mediaSearch } = useSuspenseQuery(
    getMediaSearchOptions({
      query: debouncedName,
      type: watchType,
    })
  )

  const limitedMediaSearch = mediaSearch?.data?.slice(0, 3)

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
      <h2 className="mb-s">{isNew ? 'New Media Item' : 'Edit Media Item'}</h2>
      <form
        onSubmit={handleSubmit(handleSubmitForm)}
        className="flex flex-col gap-s"
      >
        <input type="hidden" {...register('sort_order')} value={0} />
        <input type="hidden" {...register('image')} />
        <input type="hidden" {...register('media_id')} />
        {/* TYPE */}
        <FormGroup label="Type" name="type">
          <Flex gap="xs" wrap="wrap" justify="start">
            {(
              [
                'tv',
                'film',
                'game',
                'book',
                'podcast',
                'music',
                'other',
              ] as const
            ).map((type) => (
              <IconControl
                key={type}
                type="radio"
                value={type}
                label={type}
                {...register('type')}
              >
                <MediaTypeToIcon type={type} />
              </IconControl>
            ))}
          </Flex>
        </FormGroup>
        <div className="media-form-columns">
          <div>
            <img
              src={watch('image') ?? ''}
              alt={watch('name')}
              width={100}
              className="rounded-xs"
            />
          </div>

          <div className="flex flex-col gap-s">
            {/* NAME */}
            <FormGroup label="Name" name="name">
              <Input
                id="name"
                placeholder="Enter media name"
                {...register('name', { required: true })}
                autoFocus
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
                    (option as ComboOption[])[0]?.value || ''
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

            {/* STATUS */}
            <FormGroup label="Status" name="status">
              <Select
                {...register('status')}
                onValueChange={(value) => {
                  setValue('status', value as MediaStatus)
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select a status" />
                </SelectTrigger>
                <SelectContent>
                  {(['wishlist', 'now', 'done'] as const).map((statusValue) => (
                    <SelectItem key={statusValue} value={statusValue}>
                      {statusValue.charAt(0).toUpperCase() +
                        statusValue.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormGroup>

            {/* RATING */}
            <FormGroup label="Rating" name="rating">
              <Flex gap="xs" wrap="wrap" justify="start">
                {(
                  [
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
                ).map((ratingValue) => (
                  <label key={ratingValue} className="flex items-center gap-2">
                    <input
                      type="radio"
                      value={ratingValue}
                      {...register('rating')}
                      className="radio"
                    />
                    <span>{ratingValue}</span>
                  </label>
                ))}
              </Flex>
            </FormGroup>
          </div>

          <div className="flex flex-col gap-s">
            {limitedMediaSearch?.length ? (
              limitedMediaSearch?.map((item) => {
                return (
                  <Button
                    variant="outline"
                    key={item.id}
                    className="px-s justify-start"
                    onClick={() => {
                      setValue('name', item.title)
                      setValue('media_id', item.id)
                      setValue('image', item.image)
                    }}
                    type="button"
                  >
                    <img
                      src={item.image}
                      alt={item.title}
                      width={50}
                      className="rounded-xs shrink-0"
                    />
                    <div className="flex flex-col gap-xs text-sm text-left">
                      <div>{item.title}</div>
                      {item?.maker ? <div>{item.maker}</div> : null}
                    </div>
                  </Button>
                )
              })
            ) : (
              <div>No results found</div>
            )}
          </div>
        </div>

        <div>
          <Button size="m" type="submit">
            {isNew ? 'Create' : 'Update'}
          </Button>
        </div>
      </form>
    </div>
  )
}
