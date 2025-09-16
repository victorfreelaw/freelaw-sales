// Background processor for analyzing transcripts
import { db } from '@/db/connection';
import { transcripts, analyses, meetings } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { FreelawAnalysisEngine } from './engine';
import { MockAnalysisEngine } from './mock-engine';
import { Telemetry } from '@/lib/telemetry';

export class AnalysisProcessor {
  private engine: FreelawAnalysisEngine;
  private isProcessing = false;

  constructor() {
    const mode = process.env.ANALYSIS_MODE || 'live';
    if (mode === 'mock') {
      this.engine = new MockAnalysisEngine() as any;
    } else {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is required for analysis processing');
      }
      this.engine = new FreelawAnalysisEngine(process.env.OPENAI_API_KEY);
    }
  }

  // Process a specific transcript by ID
  async processTranscript(transcriptId: string): Promise<boolean> {
    try {
      // Get transcript with meeting info
      const transcript = await db
        .select({
          id: transcripts.id,
          meetingId: transcripts.meetingId,
          rawText: transcripts.rawText,
          language: transcripts.language,
          meetingTitle: meetings.title,
          segments: transcripts.segments,
        })
        .from(transcripts)
        .innerJoin(meetings, eq(transcripts.meetingId, meetings.id))
        .where(eq(transcripts.id, transcriptId))
        .limit(1);

      if (!transcript.length || !transcript[0].rawText) {
        console.error(`No valid transcript found for ID: ${transcriptId}`);
        return false;
      }

      const { id, meetingId, rawText, meetingTitle, segments } = transcript[0];

      // Check if analysis already exists
      const existingAnalysis = await db
        .select()
        .from(analyses)
        .where(eq(analyses.meetingId, meetingId))
        .limit(1);

      if (existingAnalysis.length > 0) {
        console.log(`Analysis already exists for meeting ${meetingId}`);
        return true;
      }

      // Run analysis
      console.log(`Starting analysis for transcript ${id} (meeting: ${meetingId})`);
      const parsedSegments = Array.isArray(segments)
        ? (segments as Array<{ speaker?: string; text?: string; start?: number; end?: number }>)
        : [];

      const result = await (this.engine as any).analyzeTranscript(rawText, meetingId, parsedSegments);

      // Store results in database
      await db.insert(analyses).values({
        meetingId,
        scriptScore: result.scriptScore,
        icpFit: result.icpFit,
        objections: result.report.analise_objecoes.lista.map((obj) => ({
          type: obj.categoria,
          text: obj.cliente_citacao_ampliada,
          timestamp: 0, // TODO: extrair timestamp numérico
          handled: obj.avaliacao_resposta.nota >= 7,
        })),
        highlights: [],
        summary: result.summary,
        nextAction: result.nextAction,
        fullReport: result.report,
        processingDurationMs: result.processingTimeMs,
      });

      // Mark transcript as processed
      await db
        .update(transcripts)
        .set({ 
          processed: true, 
          updatedAt: new Date() 
        })
        .where(eq(transcripts.id, id));

      // Update meeting status
      await db
        .update(meetings)
        .set({ 
          status: 'completed',
          updatedAt: new Date() 
        })
        .where(eq(meetings.id, meetingId));

      console.log(`Successfully processed transcript ${id}`);
      return true;

    } catch (error) {
      console.error(`Error processing transcript ${transcriptId}:`, error);
      
      // Mark transcript with error
      await db
        .update(transcripts)
        .set({ 
          processingError: error instanceof Error ? error.message : 'Unknown error',
          updatedAt: new Date()
        })
        .where(eq(transcripts.id, transcriptId));

      Telemetry.emit('analysis.failed', {
        transcriptId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return false;
    }
  }

  // Process all pending transcripts
  async processPendingTranscripts(): Promise<number> {
    if (this.isProcessing) {
      console.log('Analysis processing already in progress');
      return 0;
    }

    this.isProcessing = true;
    let processedCount = 0;

    try {
      // Find unprocessed transcripts
      const pendingTranscripts = await db
        .select({
          id: transcripts.id,
          meetingId: transcripts.meetingId,
          rawText: transcripts.rawText,
        })
        .from(transcripts)
        .leftJoin(analyses, eq(transcripts.meetingId, analyses.meetingId))
        .where(
          and(
            eq(transcripts.processed, false),
            isNull(transcripts.processingError),
            isNull(analyses.id), // No existing analysis
            isNull(transcripts.rawText) // Has transcript text
          )
        )
        .limit(10); // Process in batches to avoid overwhelming the system

      console.log(`Found ${pendingTranscripts.length} pending transcripts to process`);

      for (const transcript of pendingTranscripts) {
        const success = await this.processTranscript(transcript.id);
        if (success) {
          processedCount++;
        }

        // Add delay between processing to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log(`Processed ${processedCount} transcripts`);

    } catch (error) {
      console.error('Error in batch processing:', error);
    } finally {
      this.isProcessing = false;
    }

    return processedCount;
  }

  // Health check for the analysis engine
  async healthCheck(): Promise<boolean> {
    try {
      if (this.engine instanceof (FreelawAnalysisEngine as any)) {
        return await (this.engine as any).healthCheck();
      }
      // Mock engine: always healthy
      return true;
    } catch (error) {
      console.error('Analysis engine health check failed:', error);
      return false;
    }
  }

  // Get processing statistics
  async getStats(): Promise<{
    total_transcripts: number;
    processed_transcripts: number;
    pending_transcripts: number;
    failed_transcripts: number;
  }> {
    const [total, processed, failed] = await Promise.all([
      db.select({ count: db.count() }).from(transcripts),
      db.select({ count: db.count() }).from(transcripts).where(eq(transcripts.processed, true)),
      db.select({ count: db.count() }).from(transcripts).where(isNull(transcripts.processingError)),
    ]);

    const totalCount = total[0]?.count || 0;
    const processedCount = processed[0]?.count || 0;
    const failedCount = failed[0]?.count || 0;

    return {
      total_transcripts: totalCount,
      processed_transcripts: processedCount,
      pending_transcripts: totalCount - processedCount - failedCount,
      failed_transcripts: failedCount,
    };
  }
}

// Singleton instance for the processor
let processorInstance: AnalysisProcessor | null = null;

export function getAnalysisProcessor(): AnalysisProcessor {
  if (!processorInstance) {
    processorInstance = new AnalysisProcessor();
  }
  return processorInstance;
}
