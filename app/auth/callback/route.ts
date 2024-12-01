import { ROUTE_HOME } from '@/src/constants';
import { createServerClient } from '@/src/utils/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // The `/auth/callback` route is required for the server-side auth flow implemented
  // by the Auth Helpers package. It exchanges an auth code for the user's session.
  // https://supabase.com/docs/guides/auth/auth-helpers/nextjs#managing-sign-in-with-code-exchange
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    console.log(`🚀 ~ GET ~ error:`, error);
  }

  // URL to redirect to after sign in process completes
  const defaultRedirect = `${requestUrl.origin}${ROUTE_HOME}`;
  // URL to redirect to after sign in process completes
  return NextResponse.redirect(defaultRedirect);
}
