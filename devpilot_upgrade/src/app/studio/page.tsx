import Link from 'next/link';
import { ArrowLeft, Bug, Code2, Workflow, Swords, Sparkles, ShieldCheck } from 'lucide-react';
import { CodeGenerator } from '@/components/code-generator';
import { AuthControl } from '@/components/auth-control';

export default function StudioPage() {
  return <div className="mx-auto max-w-[1500px] px-5 py-8 sm:px-10 lg:py-12">
    <section className="arena-art relative isolate mb-7 overflow-hidden rounded-[28px] border border-red-500/20 px-6 py-9 sm:px-9 sm:py-12">
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black via-black/75 to-black/20" />
      <div className="max-w-3xl">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.22em] text-red-200"><Swords size={14}/> Shadow Forge · Code dojo</div>
        <h1 className="mt-4 text-4xl font-black uppercase tracking-tight text-white sm:text-6xl">Forge your <span className="text-gradient">next build.</span></h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-300">Your AI engineering dojo. Turn a clear prompt into inspectable source files, then review every move before it leaves the arena.</p>
        <div className="mt-5 flex flex-wrap gap-2 text-[9px] font-semibold uppercase tracking-[.16em] text-zinc-300"><span className="rounded-full border border-red-300/20 bg-red-500/10 px-3 py-2">01 · Describe</span><span className="rounded-full border border-white/10 bg-black/30 px-3 py-2">02 · Generate</span><span className="rounded-full border border-white/10 bg-black/30 px-3 py-2">03 · Review</span></div>
      </div>
      <div className="pointer-events-none absolute -bottom-8 right-8 hidden text-red-500/20 md:block"><Swords size={190} strokeWidth={.7}/></div>
    </section>
    <section className="mb-6 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
      <div className="glass rounded-2xl p-4"><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.18em] text-red-200"><ShieldCheck size={14}/> Forge identity</div><p className="mt-2 text-xs leading-relaxed text-zinc-400">Sign in to connect this workspace to your Supabase identity. Account creation uses email confirmation when enabled in your Supabase Auth settings.</p></div>
      <AuthControl />
    </section>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.2em] text-red-300"><Sparkles size={13}/> AI development workspace</div><h2 className="mt-2 text-2xl font-bold tracking-tight text-white">Prompt to code<span className="text-red-400">.</span></h2><p className="mt-1 text-xs text-zinc-500">Generate complete files, inspect the output, and export your build.</p></div><Link href="/dashboard" className="inline-flex items-center gap-2 rounded-xl border border-white/[.09] bg-white/[.025] px-4 py-2.5 text-xs text-zinc-300 transition hover:bg-white/[.06]"><Workflow size={14} className="text-red-300"/> Open Mission Mode</Link></div>
    <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/5 p-4"><Link href="/debugger" className="inline-flex items-center gap-2 text-sm font-semibold text-red-200 hover:text-white"><Bug size={17}/> Open Visual Debugger →</Link><p className="mt-2 text-xs text-zinc-400">Inspect code structure and potential logic issues without changing your existing Code Studio workflow.</p></div>
    <CodeGenerator />
    <div className="mt-5 flex items-start gap-2 rounded-2xl border border-amber-300/10 bg-amber-300/[.025] p-4 text-[11px] leading-relaxed text-zinc-500"><span className="mt-0.5 text-amber-200">Dojo rule:</span><p>Generated code is displayed for review; it is not executed or written into your computer automatically. Use Mission Mode to stage and verify repository changes.</p></div>
    <Link href="/" className="mt-6 inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-white"><ArrowLeft size={13}/> Back to command center</Link>
  </div>;
}
