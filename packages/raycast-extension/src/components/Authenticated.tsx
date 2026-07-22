import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  openExtensionPreferences,
} from '@raycast/api'
import type { ReactNode } from 'react'
import { useAuth } from '../use-auth'

export const Authenticated = ({ children }: { children: ReactNode }) => {
  const { isLoading, error } = useAuth()

  if (isLoading) {
    return <Detail isLoading />
  }

  if (error) {
    const markdown = `### Error: Authentication failed\n\n${error.message}`
    return (
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action
              title="Open Extension Preferences"
              icon={Icon.Gear}
              onAction={openExtensionPreferences}
            />
          </ActionPanel>
        }
      />
    )
  }

  return children
}
