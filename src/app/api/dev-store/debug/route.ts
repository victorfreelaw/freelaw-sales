import { NextResponse } from 'next/server';
import { getDevStoreStats } from '@/lib/dev-store';

export async function GET() {
  if (process.env.DEV_STORE_ENABLED !== 'true') {
    return NextResponse.json({ error: 'Dev store not enabled' }, { status: 404 });
  }

  const stats = getDevStoreStats();
  
  return NextResponse.json({
    enabled: true,
    stats,
    timestamp: Date.now(),
    nodeEnv: process.env.NODE_ENV,
  });
}