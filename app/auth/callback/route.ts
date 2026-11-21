import type { NextRequest } from 'next/server';
import { createSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const supabase = await createSupabase();
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  let confirmed = false;

  if (supabase && code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    confirmed = !error;
  } else if (supabase && tokenHash && searchParams.get('type') === 'email') {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'email' });
    confirmed = !error;
  }

  // Keep the browser on the same origin as the new session cookie.
  return new Response(null, {
    status: 303,
    headers: { Location: confirmed ? '/' : '/?confirmation=failed', 'Cache-Control': 'private, no-store' },
  });
}
