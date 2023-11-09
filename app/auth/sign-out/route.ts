import { ROUTE_SIGNIN } from '@/src/constants';
import { createServerClient } from '@/src/utils/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const cookieStore = cookies();
  const supabaseClient = createServerClient(cookieStore);

  await supabaseClient.auth.signOut();

  return NextResponse.redirect(`${requestUrl.origin}${ROUTE_SIGNIN}`, {
    // a 301 status is required to redirect from a POST to a GET route
    status: 301,
  });
}
