import { Container } from '@/src/components/Container';
import { Link, linkVariants } from '@/src/components/Link';
import { Sidebar } from '@/src/components/Sidebar';
import { ROUTE_FEED_HOME } from '@/src/constants';
import { Database } from '@/src/types/supabase';
import { getDbMetadata } from '@/src/utils/fetching/meta';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { ComponentPropsWithoutRef, ReactNode } from 'react';

import './layout.styles.css';

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
          <Link href={ROUTE_FEED_HOME} variant="logo">
            🦦 <span>Otter</span>
          </Link>
        </div>
      </header>
      <div className="otter-primary-pane">
        <div className="otter-sidebar-pane">
          <Sidebar dbMeta={data} />
        </div>
        <div className="otter-content-pane">
          <div className="otter-content-pane-inner">
            <Container>{children}</Container>
          </div>
        </div>
      </div>
    </div>
  );
}
