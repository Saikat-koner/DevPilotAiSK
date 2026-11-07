'use client';
import { apiFetch } from '@/lib/supabase/api-fetch';
import { useCallback, useMemo, useState } from 'react';
import { ReactFlow, Background, Controls, MarkerType, type Edge, type Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { DebugReport } from '@/lib/debugger/analyze';

const example = `function calculateDiscount(price, discount) {\n  return price - (price * discount);\n}\n\nconsole.log(calculateDiscount(100, 20));`;
export function VisualDebugger() {
  const [code, setCode] = useState(example);
  const [language, setLanguage] = useState<'javascript' | 'typescript'>('javascript');
  const [report, setReport] = useState<DebugReport | null>(null);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const analyze = useCallback(async () => {
    setLoading(true); setError(''); setReport(null); setActive(0);
    try {
      const response = await apiFetch('/api/debug/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, language }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Analysis failed');
      setReport(data as DebugReport);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Analysis failed'); }
    finally { setLoading(false); }
  }, [code, language]);
  const { nodes, edges } = useMemo(() => {
    const steps = report?.steps || [];
    const nodes: Node[] = steps.map((s, i) => ({ id: s.id, position: { x: 40 + (i % 2) * 320, y: Math.floor(i / 2) * 135 }, data: { label: `${s.kind.toUpperCase()} · L${s.line}\n${s.label}` }, style: { whiteSpace: 'pre-line', width: 255, borderRadius: 12, padding: 12, color: '#fafafa', background: i === active ? '#7f1d1d' : '#18181b', border: `1px solid ${i === active ? '#f87171' : '#52525b'}`, fontSize: 12 } }));
    const edges: Edge[] = steps.slice(1).map((s, i) => ({ id: `edge-${i}`, source: steps[i].id, target: s.id, animated: i + 1 === active, markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#a1a1aa' } }));
    return { nodes, edges };
  }, [report, active]);
  const selected = report?.steps[active];
  return <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
    <section className="glass min-w-0 rounded-2xl p-5"><div className="mb-4 flex items-center justify-between gap-2"><h2 className="font-bold text-white">Source Code</h2><select aria-label="Language" value={language} onChange={e => setLanguage(e.target.value as 'javascript' | 'typescript')} className="rounded-lg border border-white/10 bg-zinc-900 p-2 text-xs text-white"><option value="javascript">JavaScript</option><option value="typescript">TypeScript</option></select></div>
      <textarea aria-label="Source code" spellCheck={false} value={code} onChange={e => setCode(e.target.value)} className="h-80 w-full resize-y rounded-xl border border-white/10 bg-[#09090b] p-4 font-mono text-xs leading-6 text-zinc-200 outline-none focus:border-red-500" />
      <button disabled={loading || !code.trim()} onClick={analyze} className="mt-4 rounded-xl bg-red-600 px-5 py-3 text-xs font-bold text-white disabled:opacity-50">{loading ? 'Analyzing…' : 'Analyze Code'}</button>
      {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
      {report && <div className="mt-5"><h3 className="mb-2 font-semibold text-white">Source inspection</h3><div className="overflow-auto rounded-lg border border-white/10 bg-black/30 font-mono text-xs">{code.split(/\r?\n/).map((line, i) => <div key={i} className={`flex px-3 py-1 ${selected?.line === i + 1 ? 'bg-red-900/40' : ''}`}><span className="mr-4 w-7 shrink-0 text-right text-zinc-600">{i + 1}</span><span className="whitespace-pre text-zinc-300">{line || ' '}</span></div>)}</div></div>}
    </section>
    <section className="glass min-w-0 rounded-2xl p-5"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold text-white">Visual Source Flow</h2><span className="rounded-full border border-amber-400/30 px-3 py-1 text-[10px] text-amber-200">STATIC · NOT EXECUTED</span></div>
      {report ? <><div className="mt-4 h-[380px] overflow-hidden rounded-xl border border-white/10 bg-[#0b0b0d]"><ReactFlow nodes={nodes} edges={edges} onNodeClick={(_event: React.MouseEvent, node: Node) => setActive(Math.max(0, report.steps.findIndex(s => s.id === node.id)))} fitView nodesDraggable={false} nodesConnectable={false} proOptions={{ hideAttribution: true }}><Background color="#333" /><Controls /></ReactFlow></div>
      <div className="mt-4 flex items-center justify-between gap-3"><button className="rounded-lg border border-white/20 px-3 py-2 text-xs disabled:opacity-30" disabled={active === 0} onClick={() => setActive(v => Math.max(0, v - 1))}>← Previous</button><span className="text-xs text-zinc-400">Construct {report.steps.length ? active + 1 : 0} / {report.steps.length}</span><button className="rounded-lg border border-white/20 px-3 py-2 text-xs disabled:opacity-30" disabled={active >= report.steps.length - 1} onClick={() => setActive(v => Math.min(report.steps.length - 1, v + 1))}>Next →</button></div>
      {selected && <div className="mt-3 rounded-xl bg-white/5 p-4 text-xs"><p className="font-semibold text-white">Line {selected.line} · {selected.label}</p><p className="mt-2 break-all font-mono text-zinc-400">{selected.detail}</p>{selected.branch && <p className="mt-2 text-amber-300">{selected.branch}</p>}</div>}
      <p className="mt-3 text-xs text-zinc-500">{report.summary} Arrows indicate source-order navigation, not confirmed runtime control flow.</p>
      <h3 className="mt-5 font-bold text-white">Debugging Findings</h3><div className="mt-3 space-y-3">{report.findings.map((f, i) => <article key={i} className="rounded-xl border border-white/10 bg-white/[.03] p-4 text-xs"><div className="flex flex-wrap items-center gap-2"><span className={f.severity === 'error' ? 'text-red-400' : f.severity === 'warning' ? 'text-amber-300' : 'text-sky-300'}>{f.severity.toUpperCase()}</span><strong className="text-white">{f.title}</strong><span className="text-zinc-500">Line {f.line} · {f.confidence}</span></div><p className="mt-2 text-zinc-300">{f.explanation}</p><p className="mt-2 text-emerald-300">Next step: {f.recommendation}</p></article>)}</div></> : <div className="mt-4 flex h-[380px] items-center justify-center rounded-xl border border-dashed border-white/10 text-center text-sm text-zinc-500">Click Analyze Code to generate a source-flow map and debugging suggestions.</div>}
    </section>
  </div>;
}
