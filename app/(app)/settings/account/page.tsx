import { CodeBlock } from '@/src/components/CodeBlock';
import { UpdateInfoForm } from '@/src/components/UpdateInfoForm';
import { createServerClient } from '@/src/utils/supabase/server';
import { cookies } from 'next/headers';

export default async function AccountPage() {
  const cookieStore = cookies();
  const supabaseClient = createServerClient(cookieStore);
  const {
    data: { user },
  } = await supabaseClient.auth.getUser();

  return (
    <article>
      <h3>User info</h3>
      Account ID: <CodeBlock>{user?.id}</CodeBlock>
      <hr />
      <h3>Update account</h3>
      <UpdateInfoForm user={user} />
    </article>
  );
}
