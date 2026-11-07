'use client';
import { useEffect, useState } from 'react';
import { Database, Wifi, WifiOff } from 'lucide-react';

type Status = { configured: boolean; connected: boolean; schemaReady?: boolean; message: string };
export function SupabaseStatus() {
  const [status, setStatus] = useState<Status | null>(null);
  useEffect(() => { let active = true; fetch('/api/supabase/status').then((r) => r.json()).then((data) => { if (active) setStatus(data); }).catch(() => { if (active) setStatus({ configured: false, connected: false, message: 'Backend status unavailable.' }); }); return () => { active = false; }; }, []);
  const ready = Boolean(status?.connected && status?.schemaReady !== false);
  return <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 py-2 text-[10px] uppercase tracking-[.15em] text-zinc-400" title={status?.message ?? 'Checking cloud connection'}>
    <Database size={13} className={ready ? 'text-emerald-400' : 'text-amber-400'} />
    {status ? (ready ? <><Wifi size={12} className="text-emerald-400" /> Supabase online</> : <><WifiOff size={12} className="text-amber-400" /> {status.configured ? 'Run DB migration' : 'Local backend'}</>) : 'Checking backend'}
  </div>;
}
