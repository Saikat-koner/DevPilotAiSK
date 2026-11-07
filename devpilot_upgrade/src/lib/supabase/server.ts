import 'server-only';
import { createClient } from '@supabase/supabase-js';

/** Creates a request-scoped Supabase client. The caller's JWT is forwarded so RLS remains authoritative. */
export function createSupabaseServerClient(accessToken?: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined
  });
}

export function getBearerToken(request: Request) {
  const header = request.headers.get('authorization');
  return header?.match(/^Bearer\s+(.+)$/i)?.[1];
}
