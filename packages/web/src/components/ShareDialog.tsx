import {
  ArrowsClockwiseIcon,
  CheckIcon,
  CopyIcon,
  ShareNetworkIcon,
  TrashIcon,
} from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from './Button'
import { Dialog, DialogContent, DialogTrigger } from './Dialog'
import { Flex } from './Flex'
import { Input } from './Input'
import {
  type Share,
  type ShareKind,
  getSharesOptions,
  useDisableShareMutation,
  useEnableShareMutation,
} from '@/utils/fetching/shares'

interface ShareDialogProps {
  kind: ShareKind
  name: string
}

const buildShareUrl = (token: string) => {
  if (typeof window === 'undefined') return ''
  return `${window.location.origin}/share/${token}`
}

export const ShareDialog = ({ kind, name }: ShareDialogProps) => {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const enable = useEnableShareMutation()
  const disable = useDisableShareMutation()
  const { data: shares } = useQuery(getSharesOptions())

  const existing = useMemo<Share | undefined>(
    () =>
      shares?.find((share) => share.kind === kind && share.name === name),
    [shares, kind, name],
  )
  const shareUrl = existing ? buildShareUrl(existing.token) : null

  const handleEnable = async () => {
    await enable.mutateAsync({ kind, name })
    toast.success('Share link created')
  }

  const handleRotate = async () => {
    await enable.mutateAsync({ kind, name, rotate: true })
    toast.success('Share link rotated — old link no longer works')
  }

  const handleDisable = async () => {
    await disable.mutateAsync({ kind, name })
    toast.success('Sharing disabled')
  }

  const handleCopy = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error('Could not copy link')
    }
  }

  const label = kind === 'collection' ? 'collection' : 'tag'

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="xs" variant="ghost" aria-label={`Share ${label}`}>
          <ShareNetworkIcon size={16} weight="duotone" /> Share
        </Button>
      </DialogTrigger>
      <DialogContent
        title={`Share ${label}`}
        description={`Anyone with the link can view bookmarks in this ${label}. They cannot edit anything.`}
      >
        {shareUrl ? (
          <Flex direction="column" gap="s">
            <Flex gap="2xs" align="center">
              <Input
                readOnly
                value={shareUrl}
                onFocus={(event) => event.currentTarget.select()}
              />
              <Button
                size="s"
                variant="secondary"
                onClick={handleCopy}
                aria-label="Copy link"
              >
                {copied ? (
                  <CheckIcon size={16} weight="bold" />
                ) : (
                  <CopyIcon size={16} weight="duotone" />
                )}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </Flex>
            <Flex gap="2xs" justify="end">
              <Button
                size="s"
                variant="ghost"
                onClick={handleRotate}
                disabled={enable.isPending}
              >
                <ArrowsClockwiseIcon size={16} weight="duotone" /> Rotate link
              </Button>
              <Button
                size="s"
                variant="destructive"
                onClick={handleDisable}
                disabled={disable.isPending}
              >
                <TrashIcon size={16} weight="duotone" /> Stop sharing
              </Button>
            </Flex>
          </Flex>
        ) : (
          <Flex justify="end">
            <Button onClick={handleEnable} disabled={enable.isPending}>
              {enable.isPending ? 'Creating…' : 'Create share link'}
            </Button>
          </Flex>
        )}
      </DialogContent>
    </Dialog>
  )
}
