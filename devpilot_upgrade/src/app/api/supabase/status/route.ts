import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export async function GET() {
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!configured) return NextResponse.json({ configured: false, connected: false, provider: 'local-sqlite', message: 'Add your Supabase project URL and anon key to enable cloud services.' });
  const supabase = createSupabaseServerClient();
  const { error } = await supabase!.from('game_profiles').select('id', { head: true, count: 'exact' });
  // A missing table is a migration/setup issue, not a network failure.
  if (error?.code === '42P01' || error?.code === 'PGRST205') return NextResponse.json({ configured: true, connected: true, schemaReady: false, message: 'Supabase is reachable. Run the SQL migration to create the game tables.' });
  return NextResponse.json({ configured: true, connected: !error, schemaReady: !error, message: error?.message ?? 'Supabase is connected.' }, { status: error ? 503 : 200 });
}
