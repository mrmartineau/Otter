import { UserCircleIcon } from '@phosphor-icons/react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { Container } from '@/components/Container'
import { Flex } from '@/components/Flex'
import { Link } from '@/components/Link'
import { Paragraph } from '@/components/Paragraph'
import { SidebarLink } from '@/components/SidebarLink'
import { useSession } from '../../components/AuthProvider'
import { CONTENT, ROUTE_HOME, ROUTE_SIGNIN } from '../../constants'

export const Route = createFileRoute('/_public/')({
  component: Index,
  loader: async ({ context }) => {
    if (context.session !== null) {
      throw redirect({ to: ROUTE_HOME })
    }
  },
})

function Index() {
  const navigate = useNavigate()
  const session = useSession()

  if (session) {
    navigate({ to: ROUTE_HOME })
  }

  return (
    <Container variant="auth" className="text-center">
      <img
        src="/otter-logo.svg"
        width="90"
        height="90"
        className="mx-auto mt-l"
        alt="Otter logo"
      />
      <h2 className="mt-s">{CONTENT.appName}</h2>
      <Flex align="center" justify="center" gapX="xs" className="my-s">
        <SidebarLink href={ROUTE_SIGNIN}>
          <UserCircleIcon weight="duotone" width="18" height="18" />
          {CONTENT.signInTitle}
        </SidebarLink>
        {/* <NextLink href={ROUTE_SIGNUP} passHref>
              <SidebarLink>
                <PlusCircledIcon />
                {CONTENT.signUpTitle}
              </SidebarLink>
            </NextLink> */}
      </Flex>

      <article>
        <Paragraph className="mt-m">
          This is an instance of{' '}
          <Link variant="accent" href="https://github.com/mrmartineau/Otter-3">
            Otter
          </Link>{' '}
          by{' '}
          <Link variant="accent" href="https://zander.wtf">
            Zander Martineau
          </Link>
          . It is an open-source, private bookmarking app built on{' '}
          <Link variant="accent" href="https://nextjs.org">
            next.js
          </Link>{' '}
          and{' '}
          <Link variant="accent" href="https://supabase.com">
            Supabase
          </Link>
          .
        </Paragraph>
        <Paragraph>
          If you want to create your own instance, find out more at{' '}
          <Link variant="accent" href="https://github.com/mrmartineau/Otter-3">
            the project home page
          </Link>
          .
        </Paragraph>
      </article>
    </Container>
  )
}
