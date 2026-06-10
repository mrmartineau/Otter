import { ArrowsClockwiseIcon } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/Button'
import { FormGroup } from '@/components/FormGroup'
import { Input } from '@/components/Input'
import { Link } from '@/components/Link'
import { PlatformIcon } from '@/components/PlatformIcon'
import { Text } from '@/components/Text'
import {
  PLATFORM_IDS,
  PLATFORMS,
  type PlatformDefinition,
  type PlatformId,
} from '@/platforms/catalog'
import type { PlatformConnection } from '@/types/db'
import {
  getPlatformConnectionsOptions,
  useDeletePlatformMutation,
  useSyncPlatformMutation,
  useTogglePlatformMutation,
  useUpsertPlatformMutation,
} from '@/utils/fetching/platforms'

export const PlatformConnections = () => {
  const { data: connections, isLoading } = useQuery(
    getPlatformConnectionsOptions(),
  )

  if (isLoading) {
    return <Text>Loading…</Text>
  }

  return (
    <div className="flex flex-col gap-l">
      <Text>
        Connect a platform to automatically pull the things you save there —
        Bluesky bookmarks, GitHub stars, liked YouTube videos — into their own
        feed in Otter. Synced items can be turned into bookmarks with one click.
      </Text>
      {PLATFORM_IDS.map((platform) => (
        <PlatformConnectionForm
          connection={connections?.find((item) => item.platform === platform)}
          definition={PLATFORMS[platform]}
          key={platform}
          platform={platform}
        />
      ))}
    </div>
  )
}

interface PlatformConnectionFormProps {
  connection?: PlatformConnection
  definition: PlatformDefinition
  platform: PlatformId
}

const PlatformConnectionForm = ({
  connection,
  definition,
  platform,
}: PlatformConnectionFormProps) => {
  const upsertMutation = useUpsertPlatformMutation()
  const toggleMutation = useTogglePlatformMutation()
  const deleteMutation = useDeletePlatformMutation()
  const syncMutation = useSyncPlatformMutation()
  const [editingFields, setEditingFields] = useState<string[]>([])

  const isConfigured = Boolean(connection)
  const isEnabled = Boolean(connection?.enabled)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Record<string, string>>({
    defaultValues: Object.fromEntries(
      definition.credentialFields.map((field) => [field.key, '']),
    ),
  })

  const handleSave = (values: Record<string, string>) => {
    upsertMutation.mutate(
      { credentials: values, enabled: true, platform },
      {
        onSuccess: () => {
          reset()
          setEditingFields([])
        },
      },
    )
  }

  const handleRemove = () => {
    if (
      window.confirm(
        `Remove the ${definition.name} connection and its synced items? Bookmarks you created from them are kept.`,
      )
    ) {
      deleteMutation.mutate({ platform })
    }
  }

  return (
    <div className="flex flex-col gap-s">
      <h4 className="flex items-center gap-2xs">
        <PlatformIcon platform={platform} size={20} />
        {definition.name}
        <span className="text-step--2">
          {isConfigured ? (isEnabled ? '· connected' : '· paused') : ''}
        </span>
      </h4>
      <Text>
        {definition.description}{' '}
        {definition.helpUrl ? (
          <Link href={definition.helpUrl} variant="accent">
            Learn more
          </Link>
        ) : null}
      </Text>

      {connection?.last_error ? (
        <div className="rounded bg-destructive/10 p-s text-step--1 text-destructive">
          {connection.last_error}
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit(handleSave)}
        noValidate
        className="flex flex-col gap-s"
      >
        {definition.credentialFields.map((field) => {
          const isSet = connection?.configured_fields.includes(field.key)
          const isEditing = editingFields.includes(field.key)

          if (isSet && !isEditing) {
            return (
              <FormGroup
                key={field.key}
                label={field.label}
                name={`${platform}-${field.key}`}
                note="Saved. Enter a new value to change it."
              >
                <div className="flex items-center gap-s">
                  <Input
                    id={`${platform}-${field.key}`}
                    type={field.type}
                    value={field.type === 'password' ? '••••••••••••' : 'Saved'}
                    disabled
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="s"
                    onClick={() =>
                      setEditingFields((prev) => [...prev, field.key])
                    }
                  >
                    Change
                  </Button>
                </div>
              </FormGroup>
            )
          }

          return (
            <FormGroup
              key={field.key}
              label={field.label}
              name={`${platform}-${field.key}`}
              error={errors[field.key]?.message}
              note={field.note}
            >
              <Input
                id={`${platform}-${field.key}`}
                type={field.type}
                placeholder={field.placeholder}
                autoComplete="off"
                {...register(field.key, {
                  required: isSet ? false : `${field.label} is required`,
                })}
              />
            </FormGroup>
          )
        })}

        <div className="flex flex-wrap items-center gap-s">
          <Button type="submit" disabled={upsertMutation.isPending}>
            {isConfigured ? 'Save' : 'Connect'}
          </Button>
          {isConfigured ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => syncMutation.mutate({ platform })}
                disabled={syncMutation.isPending || !isEnabled}
              >
                <ArrowsClockwiseIcon size={16} weight="duotone" />
                {syncMutation.isPending ? 'Syncing…' : 'Sync now'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  toggleMutation.mutate({ enabled: !isEnabled, platform })
                }
                disabled={toggleMutation.isPending}
              >
                {isEnabled ? 'Pause' : 'Resume'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleRemove}
                disabled={deleteMutation.isPending}
              >
                Remove
              </Button>
            </>
          ) : null}
        </div>
      </form>

      {connection?.last_synced_at ? (
        <Text className="text-step--2">
          Last synced {new Date(connection.last_synced_at).toLocaleString()}
        </Text>
      ) : null}
    </div>
  )
}
