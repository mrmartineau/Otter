import { SignOutIcon } from '@phosphor-icons/react'
import { useNavigate } from '@tanstack/react-router'
import { CONTENT } from '../constants'
import { supabase } from '../utils/supabase/client'
export default function LogoutButton() {
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate({ search: { message: 'Signed out' }, to: '/signin' })
  }

  return (
    <button
      className="link-base focus link-sidebar w-full justify-start! !gap-3xs"
      type="submit"
      onClick={handleLogout}
    >
      <SignOutIcon aria-label="Sign out" size={18} weight="duotone" />
      {CONTENT.signOutNav}
    </button>
  )
}
