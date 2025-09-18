import { NextRequest, NextResponse } from 'next/server';
import { getMeetingDetails } from '@/lib/meeting-details-data';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For reps, only show their own meetings
    const userId = user.role === 'rep' ? user.id : undefined;
    
    const { id } = await params;
    const meeting = await getMeetingDetails(id, userId);
    
    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }
    
    return NextResponse.json(meeting);
    
  } catch (error) {
    console.error('Meeting details API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}