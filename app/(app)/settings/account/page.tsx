import { UpdateInfoForm } from '@/src/components/UpdateInfoForm';
import { createServerComponentClient } from '@/src/utils/createServerComponentClient';

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
