import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient, getBearerToken } from '@/lib/supabase/server';

export const runtime = 'nodejs';
const createMatchSchema = z.object({ mode: z.enum(['quick', 'ranked', 'training']), opponent: z.string().trim().min(2).max(40).optional() });
async function authenticatedClient(request: Request) {
  const token = getBearerToken(request);
  if (!token) return { error: 'Sign in with Supabase Auth to access matches.', status: 401 as const };
  const client = createSupabaseServerClient(token);
  if (!client) return { error: 'Supabase is not configured.', status: 503 as const };
  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) return { error: 'Your session is invalid or expired.', status: 401 as const };
  return { client, user };
}
export async function GET(request: Request) {
  const auth = await authenticatedClient(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { data, error } = await auth.client.from('game_matches').select('id,mode,opponent,result,created_at,duration_seconds').order('created_at', { ascending: false }).limit(30);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ matches: data });
}
export async function POST(request: Request) {
  const auth = await authenticatedClient(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Expected a JSON request body.' }, { status: 400 }); }
  const parsed = createMatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Choose quick, ranked, or training mode.' }, { status: 400 });
  const { data, error } = await auth.client.from('game_matches').insert({ player_id: auth.user.id, mode: parsed.data.mode, opponent: parsed.data.opponent ?? 'Shadow Bot', result: 'pending' }).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ match: data }, { status: 201 });
}
