import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const mode = process.env.ANALYSIS_MODE || 'mock';
    const hasApiKey = !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== '';

    const engineIsLive = mode === 'live' && hasApiKey;
    let healthy = false;
    let error: string | undefined;

    if (engineIsLive) {
      try {
        const { default: OpenAI } = await import('openai');
        const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const res = await client.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Responda apenas "OK"' }],
          max_tokens: 5,
          temperature: 0,
        });
        healthy = (res.choices?.[0]?.message?.content || '').trim().toUpperCase() === 'OK';
      } catch (e: any) {
        error = e?.message || 'OpenAI call failed';
      }
    }

    // Mask API key for safety
    const maskedKey = hasApiKey
      ? (process.env.OPENAI_API_KEY as string).slice(0, 7) + '...' + (process.env.OPENAI_API_KEY as string).slice(-4)
      : undefined;

    return NextResponse.json({
      mode,
      engine: engineIsLive ? 'live' : 'mock',
      hasApiKey,
      apiKeyPreview: maskedKey,
      healthy,
      error,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'health failed' }, { status: 500 });
  }
}

