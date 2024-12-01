import { Button } from '@/src/components/Button';
import { FormGroup } from '@/src/components/FormGroup';
import { Input } from '@/src/components/Input';
import { createServerClient } from '@/src/utils/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function TagsManagementPage() {
  const cookieStore = await cookies();
  const supabaseClient = createServerClient(cookieStore);
  const dbMetaTags = await supabaseClient
    .from('tags_count')
    .select('*')
    .order('tag', { ascending: true });
  const {
    data: { user },
  } = await supabaseClient.auth.getUser();

  const handleRenameTag = async (formData: FormData) => {
    'use server';

    const old_tag = formData.get('old_tag') as string;
    const new_tag = formData.get('new_tag') as string;
    const cookieStore = await cookies();
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
        {dbMetaTags.data?.length
          ? dbMetaTags.data.map(({ tag }) => {
              if (!tag) {
                return null;
              }

              return (
                <li key={tag}>
                  <form
                    action={handleRenameTag}
                    className="flex items-end gap-xs"
                  >
                    <input type="hidden" name="old_tag" value={tag} />
                    <FormGroup label="Tag" name={`new_tag-${tag}`}>
                      <Input
                        id={`new_tag-${tag}`}
                        name="new_tag"
                        defaultValue={tag}
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
            })
          : null}
      </ul>
    </>
  );
}
