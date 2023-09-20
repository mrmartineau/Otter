import { ROUTE_FEED_HOME } from '@/src/constants';
import { Database } from '@/src/types/supabase';
import { getDbMetadata } from '@/src/utils/fetching/meta';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { ComponentPropsWithoutRef, ReactNode } from 'react';

interface LayoutProps extends ComponentPropsWithoutRef<'div'> {
  children?: ReactNode;
}

export default async function AppLayout({ children }: LayoutProps) {
  const supabaseClient = createServerComponentClient<Database>({ cookies });
  const data = await getDbMetadata(supabaseClient);

  return (
    <div className="otter-app-container">
      <header className="otter-top-bar">
        <div className="flex">
          <Link href={ROUTE_FEED_HOME} passHref>
            🦦 <span className="sr-only">Otter</span>
          </Link>
        </div>
      </header>
      <div className="otter-primary-pane">
        <div className="otter-sidebar-pane"></div>
        <div className="otter-content-pane">{children}</div>
      </div>
    </div>
  );
}
