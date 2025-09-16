import { NextRequest, NextResponse } from 'next/server';
import { getAnalysisProcessor } from '@/lib/analysis/processor';
import { requireRole } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Require admin role for manual processing triggers
    await requireRole(['admin']);
    
    const processor = getAnalysisProcessor();
    
    // Check if we're processing a specific transcript or all pending
    const body = await request.json().catch(() => ({}));
    const { transcriptId } = body;

    let result;
    
    if (transcriptId) {
      // Process specific transcript
      const success = await processor.processTranscript(transcriptId);
      result = {
        success,
        message: success ? 'Transcript processed successfully' : 'Failed to process transcript',
        processed_count: success ? 1 : 0,
      };
    } else {
      // Process all pending transcripts
      const processedCount = await processor.processPendingTranscripts();
      result = {
        success: true,
        message: `Processed ${processedCount} transcripts`,
        processed_count: processedCount,
      };
    }

    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Analysis processing API error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Get processing statistics (available to all authenticated users)
    const processor = getAnalysisProcessor();
    const stats = await processor.getStats();
    const isHealthy = await processor.healthCheck();

    return NextResponse.json({
      ...stats,
      engine_healthy: isHealthy,
      status: isHealthy ? 'operational' : 'degraded',
    });
    
  } catch (error) {
    console.error('Analysis stats API error:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'error'
      },
      { status: 500 }
    );
  }
}