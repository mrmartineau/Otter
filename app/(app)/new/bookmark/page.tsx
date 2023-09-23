import { BookmarkForm } from '@/src/components/BookmarkForm';
// import { Button } from '@/components/ui/button';
import { Database } from '@/src/types/supabase';
import { getDbMetadata } from '@/src/utils/fetching/meta';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export default async function NewPage() {
  const supabaseClient = createServerComponentClient<Database>({ cookies });
  const data = await getDbMetadata(supabaseClient);

  return <BookmarkForm type="new" tags={data.tags} />;
}

// export default async function Page() {
//   async function create(formData: FormData) {
//     'use server';

//     // mutate data
//     // revalidate cache
//   }

//   return (
//     <form action={create}>
//       <input name="title" placeholder="title" value="Zander" />
//       <input name="url" placeholder="url" value="https://zander.wtf" />
//       <button type="submit">Save</button>
//     </form>
//   );
// }
