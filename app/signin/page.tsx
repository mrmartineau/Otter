import { Button } from '@/src/components/Button';
import { Container } from '@/src/components/Container';
import { Flex } from '@/src/components/Flex';
import { FormGroup } from '@/src/components/FormGroup';
import { Input } from '@/src/components/Input';
import { ROUTE_FEED_HOME } from '@/src/constants';
import { Database } from '@/src/types/supabase';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import Messages from './messages';

export default async function Login() {
  const supabaseClient = createServerComponentClient<Database>({ cookies });
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  if (session) {
    redirect(ROUTE_FEED_HOME);
  }

  return (
    <Container variant="auth">
      <h2 className="mt-l text-center">Sign in</h2>

      <form action="/auth/sign-in" method="post">
        <Flex direction={'column'} gap="m">
          <FormGroup label="Email" name="email">
            <Input
              id="email"
              type="email"
              name="email"
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </FormGroup>
          <FormGroup label="Password" name="password">
            <Input
              id="password"
              type="password"
              name="password"
              required
              autoComplete="email"
            />
          </FormGroup>

          <Flex gap="m" justify="between">
            <Button formAction="/auth/sign-up" variant="secondary">
              Sign Up
            </Button>
            <Button>Sign In</Button>
          </Flex>
          <Messages />
        </Flex>
      </form>
    </Container>
  );
}
