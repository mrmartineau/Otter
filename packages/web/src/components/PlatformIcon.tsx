import {
  ButterflyIcon,
  GithubLogoIcon,
  type IconProps,
  PlugsConnectedIcon,
  YoutubeLogoIcon,
} from '@phosphor-icons/react'
import type { PlatformId } from '@/platforms/catalog'

const icons: Record<PlatformId, React.ComponentType<IconProps>> = {
  bluesky: ButterflyIcon,
  github: GithubLogoIcon,
  youtube: YoutubeLogoIcon,
}

interface PlatformIconProps extends IconProps {
  platform: string
}

export const PlatformIcon = ({ platform, ...rest }: PlatformIconProps) => {
  const Icon = icons[platform as PlatformId] ?? PlugsConnectedIcon
  return <Icon weight="duotone" {...rest} />
}
