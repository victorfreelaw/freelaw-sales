import { NextRequest, NextResponse } from 'next/server';
import { getMeetings, type MeetingsFilters } from '@/lib/meetings-data';
import { listDevMeetings } from '@/lib/dev-store';

// Public dev endpoint to read meetings without auth (for local testing only)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const filters: MeetingsFilters = {
      search: searchParams.get('search') || '',
      status: (searchParams.get('status') as any) || 'all',
      icpFit: (searchParams.get('icpFit') as any) || 'all',
      scoreRange: (searchParams.get('scoreRange') as any) || 'all',
      dateRange: (searchParams.get('dateRange') as any) || 'all',
      seller: searchParams.get('seller') || 'all',
    };

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // If dev in-memory mode enabled, serve from dev store (no DB)
    if (process.env.DEV_STORE_ENABLED === 'true') {
      const dev = listDevMeetings(page, limit);
      // Map to MeetingsResponse shape if needed
      return NextResponse.json({
        meetings: dev.meetings.map(m => ({
          id: m.id,
          title: m.title,
          startedAt: m.startedAt,
          durationSeconds: m.durationSeconds,
          status: m.status,
          seller: m.seller,
          analysis: m.analysis,
          urlFathom: m.urlFathom,
          source: m.source,
        })),
        pagination: dev.pagination,
      });
    }

    // Otherwise, read from database (requires DATABASE_URL)
    const result = await getMeetings(filters, page, limit);
    return NextResponse.json(result);

  } catch (error) {
    console.error('Public Meetings API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
