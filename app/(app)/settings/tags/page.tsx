import { Button } from '@/src/components/Button';
import { FormGroup } from '@/src/components/FormGroup';
import { Input } from '@/src/components/Input';
import { getDbMetadata } from '@/src/utils/fetching/meta';
import { createServerClient } from '@/src/utils/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function TagsManagementPage() {
  const cookieStore = cookies();
  const supabaseClient = createServerClient(cookieStore);
  const { tags } = await getDbMetadata(supabaseClient);
  const {
    data: { user },
  } = await supabaseClient.auth.getUser();

  const handleRenameTag = async (formData: FormData) => {
    'use server';

    const old_tag = formData.get('old_tag') as string;
    const new_tag = formData.get('new_tag') as string;
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);

    const { error } = await supabase.rpc('update_bookmark_tags', {
      old_tag,
      new_tag,
      user_id: user?.id as string,
    });

    if (error) {
      return redirect(
        `/settings/tags?message=Could not rename ${old_tag} to ${new_tag}`,
      );
    }

    return redirect('/settings/tags');
  };

  return (
    <>
      <h2>All tags</h2>
      <ul className="flex flex-col gap-xs">
        {tags.map(({ tag }) => {
          if (!tag) {
            return null;
          }

          return (
            <li key={tag}>
              <form action={handleRenameTag} className="flex items-end gap-xs">
                <FormGroup label="Existing tag" name={`old_tag-${tag}`}>
                  <Input
                    id={`old_tag-${tag}`}
                    name="old_tag"
                    readOnly
                    value={tag}
                  />
                </FormGroup>
                <FormGroup label="New Tag" name={`new_tag-${tag}`}>
                  <Input
                    id={`new_tag-${tag}`}
                    name="new_tag"
                    placeholder={tag}
                  />
                </FormGroup>
                <div>
                  <Button type="submit" variant="outline" size="xs">
                    Rename
                  </Button>
                </div>
              </form>
            </li>
          );
        })}
      </ul>
    </>
  );
}
