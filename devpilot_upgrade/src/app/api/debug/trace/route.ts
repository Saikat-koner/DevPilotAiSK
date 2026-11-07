import { NextResponse } from 'next/server';
import { instrumentCode } from '@/lib/debugger/instrument';
export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (typeof body.code !== 'string' || !body.code.trim() || body.code.length > 20000 || !['javascript', 'typescript'].includes(body.language)) return NextResponse.json({error:'Invalid source or language (max 20,000 characters).'}, {status:400});
    return NextResponse.json({ instrumented: instrumentCode(body.code, body.language) });
  } catch (error) { return NextResponse.json({error: error instanceof Error ? error.message : 'Instrumentation failed'}, {status:400}); }
}
