import { Button } from '@/src/components/Button';
import { Container } from '@/src/components/Container';
import { Flex } from '@/src/components/Flex';
import { FormGroup } from '@/src/components/FormGroup';
import { Input } from '@/src/components/Input';

import Messages from '../login/messages';

export default function Login() {
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
