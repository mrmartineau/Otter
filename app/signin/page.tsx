import { Button } from '@/src/components/Button';
import { Container } from '@/src/components/Container';
import { Flex } from '@/src/components/Flex';
import { FormGroup } from '@/src/components/FormGroup';
import { Input } from '@/src/components/Input';
import { ALLOW_SIGNUP, ROUTE_HOME } from '@/src/constants';
import { createServerClient } from '@/src/utils/supabase/server';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

import Messages from './messages';

export default async function Login() {
  const cookieStore = await cookies();
  const supabaseClient = createServerClient(cookieStore);
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  if (session) {
    redirect(ROUTE_HOME);
  }

  const signIn = async (formData: FormData) => {
    'use server';

    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return redirect('/signin?message=Could not authenticate user');
    }

    return redirect(ROUTE_HOME);
  };

  const signUp = async (formData: FormData) => {
    'use server';

    const origin = (await headers()).get('origin');
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
      },
    });

    if (error) {
      return redirect('/signin?message=Could not authenticate user');
    }

    return redirect('/signin?message=Check email to continue sign in process');
  };

  return (
    <Container variant="auth">
      <img
        src="/otter-logo.svg"
        width="90"
        height="90"
        className="mx-auto mt-l"
      />
      <h2 className="mt-s text-center">Sign in</h2>

      <form action={signIn}>
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
            {ALLOW_SIGNUP ? (
              <Button formAction={signUp} variant="secondary">
                Sign Up
              </Button>
            ) : null}
            <Button>Sign In</Button>
          </Flex>
          <Messages />
        </Flex>
      </form>
    </Container>
  );
}
