import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { db } from '@/db/connection';
import { meetings, transcripts } from '@/db/schema';
import { verifyFathomWebhook, FathomWebhookSchema, FathomAPI } from '@/lib/fathom';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    // Get request body
    const payload = await request.text();
    
    // Get headers
    const headersList = await headers();
    const signature = headersList.get('fathom-signature') || headersList.get('x-fathom-signature');
    
    // Verify webhook signature
    const webhookSecret = process.env.FATHOM_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('FATHOM_WEBHOOK_SECRET not configured');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    if (!signature || !verifyFathomWebhook(payload, signature, webhookSecret)) {
      console.error('Invalid Fathom webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse and validate payload
    const data = JSON.parse(payload);
    const validatedData = FathomWebhookSchema.parse(data);
    
    // Only process recording_finished events
    if (validatedData.event !== 'recording_finished') {
      return NextResponse.json({ message: 'Event ignored' }, { status: 200 });
    }

    const meetingData = validatedData.data;

    // Check if meeting already exists
    const existingMeeting = await db
      .select()
      .from(meetings)
      .where(eq(meetings.sourceId, meetingData.meeting_id))
      .limit(1);

    let meeting;
    
    if (existingMeeting.length > 0) {
      // Update existing meeting
      meeting = await db
        .update(meetings)
        .set({
          title: meetingData.title,
          startedAt: new Date(meetingData.started_at),
          durationSeconds: meetingData.duration_seconds,
          urlFathom: meetingData.recording_url,
          participantCount: meetingData.participants.length,
          status: 'completed',
          updatedAt: new Date(),
        })
        .where(eq(meetings.sourceId, meetingData.meeting_id))
        .returning();
    } else {
      // Create new meeting - we'll need to determine the seller later
      // For now, we'll create it without a seller and mark it as pending
      meeting = await db
        .insert(meetings)
        .values({
          sourceId: meetingData.meeting_id,
          title: meetingData.title,
          startedAt: new Date(meetingData.started_at),
          durationSeconds: meetingData.duration_seconds,
          urlFathom: meetingData.recording_url,
          participantCount: meetingData.participants.length,
          status: 'pending', // Will be updated once we assign a seller
          sellerId: '00000000-0000-0000-0000-000000000000', // Placeholder - needs to be assigned
        })
        .returning();
    }

    const meetingId = meeting[0].id;

    // Process transcript if available
    if (meetingData.transcript.available && meetingData.transcript.text) {
      // Check if transcript already exists
      const existingTranscript = await db
        .select()
        .from(transcripts)
        .where(eq(transcripts.meetingId, meetingId))
        .limit(1);

      if (existingTranscript.length === 0) {
        // Create new transcript
        await db.insert(transcripts).values({
          meetingId,
          language: meetingData.transcript.language || 'pt-BR',
          rawText: meetingData.transcript.text,
          speakers: meetingData.participants.map(p => ({
            id: p.id,
            name: p.name,
            email: p.email,
          })),
          processed: false,
        });
      }
    } else if (!meetingData.transcript.available) {
      // Transcript not available in webhook, try to fetch it via API
      const fathomAPI = new FathomAPI(process.env.FATHOM_API_KEY!);
      
      // Schedule transcript fetch (this could be done in a background job)
      setTimeout(async () => {
        const transcript = await fathomAPI.getTranscript(meetingData.meeting_id);
        
        if (transcript) {
          const existingTranscript = await db
            .select()
            .from(transcripts)
            .where(eq(transcripts.meetingId, meetingId))
            .limit(1);

          if (existingTranscript.length === 0) {
            await db.insert(transcripts).values({
              meetingId,
              language: transcript.language || 'pt-BR',
              rawText: transcript.text,
              segments: transcript.segments,
              speakers: meetingData.participants.map(p => ({
                id: p.id,
                name: p.name,
                email: p.email,
              })),
              processed: false,
            });
          }
        }
      }, 5000); // Wait 5 seconds before trying to fetch transcript
    }

    // Emit telemetry event
    const { Telemetry } = await import('@/lib/telemetry');
    Telemetry.meetingIngested({
      meetingId: meetingId,
      sourceId: meetingData.meeting_id,
      participants: meetingData.participants.length,
      duration: meetingData.duration_seconds,
      hasTranscript: meetingData.transcript.available,
    });

    return NextResponse.json({ 
      success: true, 
      meetingId: meetingId,
      message: 'Meeting processed successfully' 
    });

  } catch (error) {
    console.error('Fathom webhook processing error:', error);
    
    // Emit error telemetry
    const { Telemetry } = await import('@/lib/telemetry');
    Telemetry.webhookFailed({
      service: 'fathom',
      errorCode: error instanceof Error ? error.name : 'UnknownError',
    });

    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}