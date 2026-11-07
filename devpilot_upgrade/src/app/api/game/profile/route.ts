import { NextResponse } from 'next/server';
import { createSupabaseServerClient, getBearerToken } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export async function GET(request: Request) {
  const token = getBearerToken(request);
  if (!token) return NextResponse.json({ error: 'Sign in with Supabase Auth to access your fighter profile.' }, { status: 401 });
  const supabase = createSupabaseServerClient(token);
  if (!supabase) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 });
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Your session is invalid or expired.' }, { status: 401 });
  const { data, error } = await supabase.from('game_profiles').upsert({ id: user.id, username: user.user_metadata?.user_name ?? user.email?.split('@')[0] ?? 'Fighter' }, { onConflict: 'id', ignoreDuplicates: true }).select('*').maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (data) return NextResponse.json({ profile: data });
  const result = await supabase.from('game_profiles').select('*').eq('id', user.id).single();
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  return NextResponse.json({ profile: result.data });
}
