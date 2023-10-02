import { UpdateInfoForm } from '@/src/components/UpdateInfoForm';
import { Database } from '@/src/types/supabase';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export default async function AccountPage() {
  const supabaseClient = createServerComponentClient<Database>({ cookies });
  const {
    data: { user },
  } = await supabaseClient.auth.getUser();

  return (
    <div>
      Account
      <UpdateInfoForm user={user} />
    </div>
  );
}
