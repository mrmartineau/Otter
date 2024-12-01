import { Container } from '@/src/components/Container';
import { FabAdd } from '@/src/components/FabAdd';
import { Sidebar } from '@/src/components/Sidebar';
import { TopBar } from '@/src/components/TopBar';
import { UserProvider } from '@/src/components/UserProvider';
import { UserProfile } from '@/src/types/db';
import { getDbMetadata } from '@/src/utils/fetching/meta';
import { createServerClient } from '@/src/utils/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ReactNode } from 'react';
import { Toaster } from 'sonner';

import pkg from '../../package.json';
import './layout.css';

interface LayoutProps {
  children?: ReactNode;
}

export default async function AppLayout({ children }: LayoutProps) {
  const cookieStore = await cookies();
  const supabaseClient = createServerClient(cookieStore);
  const dbMeta = await getDbMetadata(supabaseClient);
  const {
    data: { user },
  } = await supabaseClient.auth.getUser();
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  if (!session) {
    redirect('/');
  }

  const userProfile = await supabaseClient
    .from('profiles')
    .select('*')
    .match({ id: user?.id })
    .single();

  return (
    <UserProvider profile={userProfile?.data as UserProfile} id={user?.id}>
      <div className="otter-app-container">
        <TopBar serverDbMeta={dbMeta} />
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <div className="otter-primary-pane">
          <Sidebar serverDbMeta={dbMeta} version={pkg.version} />
          <div className="otter-sidebar-pane-overlay" />
          <main id="main" className="otter-content-pane">
            <div className="otter-content-pane-inner">
              <Container>{children}</Container>
            </div>
          </main>
        </div>
        <FabAdd />
        <Toaster position="bottom-center" richColors />
      </div>
    </UserProvider>
  );
}
