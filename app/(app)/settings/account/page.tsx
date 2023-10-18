import { Code, CodeBlock } from '@/src/components/CodeBlock';
import { UpdateInfoForm } from '@/src/components/UpdateInfoForm';
import { createServerComponentClient } from '@/src/utils/createServerComponentClient';

export default async function AccountPage() {
  const supabaseClient = createServerComponentClient();
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
