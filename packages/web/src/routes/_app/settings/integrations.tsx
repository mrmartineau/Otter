import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import urlJoin from 'proper-url-join'
import { CodeBlock } from '@/components/CodeBlock'
import { Link } from '@/components/Link'
import { CONTENT } from '@/constants'
import { getUserProfileOptions } from '@/utils/fetching/user'

export const Route = createFileRoute('/_app/settings/integrations')({
  component: RouteComponent,
  head: () => ({
    meta: [
      {
        title: 'Integrations',
      },
    ],
  }),
})

function RouteComponent() {
  const { data: apiKey } = useQuery({
    ...getUserProfileOptions(),
    select: (data) => data.data?.api_key,
  })
  const url = urlJoin(window.location.origin, 'new/bookmark', {
    query: {
      bookmarklet: 'true',
    },
  })
  const bookmarkletPopup = `javascript:(function()%7Bconst%20e%20%3D%20(screen.width%20-%20730)%20%2F%202%0Aconst%20n%20%3D%20(screen.height%20-%20800)%20%2F%202%0Awindow.open(%60${url}%26url%3D%24%7Bdocument.URL%7D%60%2C%20%22Add%20Otter%22%2C%20%22scrollbars%3Dyes%2Ctoolbar%3Dno%2Clocation%3Dno%2Cstatus%3Dno%2Cmenubar%3Dno%2Cwidth%3D500%2Cheight%3D800%2Cleft%3D%22%20%2B%20e%20%2B%20%22%2Ctop%3D%22%20%2B%20n)%7D)()%3B`
  const bookmarkletNewTab = `javascript:(function()%7Bwindow.open(%60${url}%26url%3D%24%7Bdocument.URL%7D%60)%7D)()%3B`

  return (
    <article className="flow">
      {/* <Heading variant="h4" as="h4">
          Raycast extensions
        </Heading>
        <Paragraph>Search for Otter on the Raycast store</Paragraph>
        <Heading variant="h4" as="h4">
          API info
        </Heading>
        <Paragraph>This Postman collection</Paragraph>
        <Heading variant="h4" as="h4">
          Using IFTTT to add new bookmarks
        </Heading>
        <Paragraph></Paragraph> */}
      <h3>API key</h3>
      <CodeBlock>{apiKey}</CodeBlock>
      <h3>Bookmarklet</h3>
      <h5>Open in popup window</h5>
      Drag this link to your bookmarks:{' '}
      <Link href={bookmarkletPopup} variant="accent">
        {CONTENT.addToLabel}
      </Link>
      <CodeBlock>{bookmarkletPopup}</CodeBlock>
      <h5>Open in new tab</h5>
      Drag this link to your bookmarks:{' '}
      <Link href={bookmarkletNewTab} variant="accent">
        {CONTENT.addToLabel}
      </Link>
      <CodeBlock>{bookmarkletNewTab}</CodeBlock>
    </article>
  )
}
