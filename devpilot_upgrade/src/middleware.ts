import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const PUBLIC_API_PATHS = new Set(['/api/supabase/status']);
export async function middleware(request: NextRequest) {
  if (PUBLIC_API_PATHS.has(request.nextUrl.pathname)) return NextResponse.next();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    // Local-first development remains usable. Production deployments fail closed.
    if (process.env.NODE_ENV !== 'production' && process.env.DEVPILOT_LOCAL_MODE === 'true') return NextResponse.next();
    return NextResponse.json({ error: 'Authentication is not configured. Configure Supabase Auth before enabling API access.' }, { status: 503 });
  }
  const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return NextResponse.json({ error: 'Authentication required. Sign in and retry.' }, { status: 401 });
  const supabase = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return NextResponse.json({ error: 'Your session is invalid or expired.' }, { status: 401 });
  const response = NextResponse.next();
  response.headers.set('x-devpilot-user-id', data.user.id);
  return response;
}
export const config = { matcher: ['/api/:path*'] };
