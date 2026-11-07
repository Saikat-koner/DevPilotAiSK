import { NextResponse } from 'next/server';
import { analyzeCode } from '@/lib/debugger/analyze';

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    const input = body as Record<string, unknown>;
    if (typeof input.code !== 'string' || !input.code.trim()) return NextResponse.json({ error: 'Code is required.' }, { status: 400 });
    if (input.code.length > 50000) return NextResponse.json({ error: 'Code exceeds 50,000 characters.' }, { status: 413 });
    if (input.language !== 'javascript' && input.language !== 'typescript') return NextResponse.json({ error: 'Unsupported language.' }, { status: 400 });
    return NextResponse.json(analyzeCode(input.code, input.language));
  } catch {
    return NextResponse.json({ error: 'Unable to analyze the submitted code.' }, { status: 400 });
  }
}
