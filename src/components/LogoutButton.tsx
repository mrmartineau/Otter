import { SignOut } from '@phosphor-icons/react/dist/ssr';

import { CONTENT } from '../constants';
import { Flex } from './Flex';

export default function LogoutButton() {
  return (
    <form action="/auth/sign-out" method="post">
      <button className="link-base focus link-sidebar block">
        <Flex gapX="xs" align="center">
          <SignOut aria-label="Sign out" size={18} weight="duotone" />
          {CONTENT.signOutNav}
        </Flex>
      </button>
    </form>
  );
}
