import { NextResponse } from 'next/server';
import { listGenerations } from '@/lib/db/database';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  const userId = request.headers.get('x-devpilot-user-id');
  return NextResponse.json({ generations: listGenerations(30, userId).map(({ id, prompt, stack, summary, fileCount, createdAt }) => ({ id, prompt, stack, summary, fileCount, createdAt })) }, { headers: { 'Cache-Control': 'no-store' } });
}
