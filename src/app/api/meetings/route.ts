import { NextRequest, NextResponse } from 'next/server';
import { getMeetings, type MeetingsFilters } from '@/lib/meetings-data';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get search parameters
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
    
    // For reps, only show their own meetings
    const userId = user.role === 'rep' ? user.id : undefined;
    
    const result = await getMeetings(filters, page, limit, userId);
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Meetings API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}