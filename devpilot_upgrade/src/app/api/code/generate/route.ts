import { NextResponse } from 'next/server';
import { activeProvider, generateJson } from '@/lib/services/llm';
import { buildCodeGenerationPrompt, codeGenerationSchema } from '@/lib/services/code-generation';
import { randomUUID } from 'node:crypto';
import { saveGeneration } from '@/lib/db/database';
import { createSupabaseServerClient, getBearerToken } from '@/lib/supabase/server';

// Single-process fallback limiter. Use a shared Redis/API-gateway limiter for multi-instance deployments.
const requestWindows = new Map<string, number[]>();
const RATE_WINDOW_MS = 60_000;
function rateLimited(key: string) {
  const now = Date.now();
  const recent = (requestWindows.get(key) || []).filter((time) => now - time < RATE_WINDOW_MS);
  const configuredLimit = Number.parseInt(process.env.DEVPILOT_LLM_REQUESTS_PER_MINUTE || '10', 10);
  const limit = Number.isFinite(configuredLimit) ? Math.max(1, Math.min(configuredLimit, 120)) : 10;
  if (recent.length >= limit) { requestWindows.set(key, recent); return true; }
  recent.push(now); requestWindows.set(key, recent);
  // Bound memory use under high-cardinality client traffic.
  if (requestWindows.size > 5000) {
    for (const [client, timestamps] of requestWindows) {
      if (!timestamps.some((time) => now - time < RATE_WINDOW_MS)) requestWindows.delete(client);
      if (requestWindows.size <= 4000) break;
    }
  }
  return false;
}

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request: Request) {
  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (declaredLength > 16_384) return NextResponse.json({ error: 'Request body is too large.' }, { status: 413 });
  const ip = request.headers.get('x-devpilot-user-id') || request.headers.get('x-real-ip') || 'local';
  if (rateLimited(ip)) return NextResponse.json({ error: 'Rate limit reached. Try again in one minute.' }, { status: 429, headers: { 'Retry-After': '60' } });
  let input: { prompt?: unknown; stack?: unknown };
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Send a valid JSON request.' }, { status: 400 });
  }

  if (typeof input.prompt !== 'string' || input.prompt.trim().length < 8 || input.prompt.trim().length > 4000) {
    return NextResponse.json({ error: 'Describe what you want to build in 8 to 4,000 characters.' }, { status: 400 });
  }
  const stack = typeof input.stack === 'string' && input.stack.trim().length <= 80 ? input.stack.trim() : 'Auto-detect the best stack';
  const provider = activeProvider();
  if (provider === 'mock') {
    return NextResponse.json({
      error: 'AI code generation is not configured yet. Add an OpenAI, Gemini, or Groq API key to .env.local, set DEVPILOT_MODEL_PROVIDER to openai, gemini, or groq, and restart the server.'
    }, { status: 503 });
  }

  try {
    const raw = await generateJson<unknown>(buildCodeGenerationPrompt(input.prompt.trim(), stack), { maxOutputTokens: 12000 });
    if (!raw) return NextResponse.json({ error: 'The AI provider returned an empty response. Try again.' }, { status: 502 });
    const parsed = codeGenerationSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: 'The AI response was incomplete or contained an unsafe file path. Try a more specific prompt.' }, { status: 502 });
    }
    const createdAt = new Date().toISOString();
    const token = getBearerToken(request);
    let userId: string | null = null;
    if (token) { const supabase = createSupabaseServerClient(token); if (supabase) { const { data } = await supabase.auth.getUser(token); userId = data.user?.id ?? null; } }
    const generation = { id: randomUUID(), userId, prompt: input.prompt.trim(), stack, summary: parsed.data.summary, fileCount: parsed.data.files.length, createdAt, result: parsed.data };
    saveGeneration(generation);
    if (userId) {
      const supabase = createSupabaseServerClient(token!);
      await supabase?.from('studio_generations').insert({ user_id: userId, prompt: generation.prompt, stack, summary: generation.summary, file_count: generation.fileCount });
    }
    return NextResponse.json({ result: parsed.data, provider, generation: { id: generation.id, createdAt } }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    // Keep provider/internal details in server logs; never expose them to API clients.
    console.error('[code-generation] Provider request failed:', error);
    return NextResponse.json({ error: 'Code generation failed. Check server logs and provider configuration, then retry.' }, { status: 502 });
  }
}
