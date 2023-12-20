import { SignOut } from '@phosphor-icons/react/dist/ssr';

import { CONTENT } from '../constants';

export default function LogoutButton() {
  return (
    <form action="/auth/sign-out" method="post">
      <button className="link-base focus link-sidebar w-full !justify-start !gap-3xs">
        <SignOut aria-label="Sign out" size={18} weight="duotone" />
        {CONTENT.signOutNav}
      </button>
    </form>
  );
}
