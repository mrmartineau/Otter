import { Container } from '@/src/components/Container';
import { Flex } from '@/src/components/Flex';
import { Link } from '@/src/components/Link';
import { Paragraph } from '@/src/components/Paragraph';
import { SidebarLink } from '@/src/components/SidebarLink';
import { CONTENT, ROUTE_FEED_DASHBOARD, ROUTE_SIGNIN } from '@/src/constants';
import { createServerClient } from '@/src/utils/supabase/server';
import { UserCircle } from '@phosphor-icons/react/dist/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function Index() {
  const cookieStore = cookies();
  const supabaseClient = createServerClient(cookieStore);
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  if (session) {
    redirect(ROUTE_FEED_DASHBOARD);
  }

  return (
    <Container variant="auth" className="text-center">
      <img
        src="/otter-logo.svg"
        width="90"
        height="90"
        className="mx-auto mt-l"
      />
      <h2 className="mt-s">{CONTENT.appName}</h2>
      <Flex align="center" justify="center" gapX="xs" className="my-s">
        <SidebarLink href={ROUTE_SIGNIN}>
          <UserCircle weight="duotone" width="18" height="18" />
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
          <Link variant="accent" href="https://github.com/mrmartineau/Otter">
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
          <Link variant="accent" href="https://github.com/mrmartineau/Otter">
            the project home page
          </Link>
          .
        </Paragraph>
      </article>
    </Container>
  );
}
