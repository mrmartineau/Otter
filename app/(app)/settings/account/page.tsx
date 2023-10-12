import { UpdateInfoForm } from '@/src/components/UpdateInfoForm';
import { Database } from '@/src/types/supabase';
import { createServerComponentClient } from '@/src/utils/createServerComponentClient';
import { cookies } from 'next/headers';

export default async function AccountPage() {
  const supabaseClient = createServerComponentClient();
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
