import { simpleUrl } from '@/utils/simpleUrl'

interface FaviconProps {
  url: string
  size?: number
}

export const Favicon = ({ url, size = 20 }: FaviconProps) => {
  const urlDomain = simpleUrl(url)
  const favicon = `https://icons.duckduckgo.com/ip3/${urlDomain}.ico`
  // let favicon = `https://www.fastmailcdn.com/avatar/${urlDomain}`
  // console.log(`🚀 ~ Favicon ~ favicon:`, favicon)
  // let favicon = `https://s2.googleusercontent.com/s2/favicons?domain=${urlDomain}&sz=128`
  // let favicon = `https://logo.clearbit.com/${urlDomain}`
  return (
    <img
      src={favicon}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      className="block shrink-0 overflow-hidden rounded-full"
      onError={(event) => {
        event.currentTarget.onerror = null // prevents looping
        event.currentTarget.src = '/otter-logo.svg'
      }}
    />
  )
}
