// Meeting details data fetching utilities
import { db } from '@/db/connection';
import { meetings, analyses, transcripts, users, syncEvents } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import type { FullAnalysisReport } from '@/types/analysis';

export interface MeetingDetails {
  id: string;
  title: string;
  startedAt: string;
  durationSeconds?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  urlFathom?: string;
  source: string;
  seller?: {
    id: string;
    fullName?: string;
    email: string;
    role: string;
  };
  transcript?: {
    id: string;
    rawText: string;
    language: string;
    processed: boolean;
    speakers?: Array<{
      id: string;
      name?: string;
      email?: string;
    }>;
    segments?: Array<{
      speaker: string;
      text: string;
      start: number;
      end: number;
      confidence?: number;
    }>;
  };
  analysis?: {
    id: string;
    scriptScore: number;
    icpFit: 'high' | 'medium' | 'low';
    summary: string;
    nextAction?: string;
    fullReport?: FullAnalysisReport;
    scriptAnalysis?: any;
    icpAnalysis?: any;
    objectionsAnalysis?: any;
    scriptChecklist?: {
      opening: boolean;
      agenda: boolean;
      qualification: boolean;
      pain_discovery: boolean;
      value_proposition: boolean;
      roi_discussion: boolean;
      next_steps: boolean;
    };
    icpCriteria?: {
      company_size: 'small' | 'medium' | 'large';
      revenue_range: string;
      case_volume: 'low' | 'medium' | 'high';
      pain_points: string[];
      region: string;
      acquisition_channel: string;
    };
    objections?: Array<{
      type: string;
      text: string;
      timestamp: number;
      handled: boolean;
    }>;
    highlights?: Array<{
      type: 'buying_signal' | 'objection' | 'competitor' | 'budget' | 'timeline' | 'authority';
      text: string;
      timestamp: number;
      confidence: number;
    }>;
    processingDurationMs?: number;
    createdAt: string;
  };
  syncStatus?: {
    hubspot: 'pending' | 'completed' | 'failed';
    slack: 'pending' | 'completed' | 'failed';
    lastSyncAt?: string;
  };
}

export async function getMeetingDetails(id: string, userId?: string): Promise<MeetingDetails | null> {
  try {
    // Se dev-store estiver habilitado, usar dev-store
    if (process.env.DEV_STORE_ENABLED === 'true') {
      const { getDevMeeting } = await import('@/lib/dev-store');
      const devMeeting = getDevMeeting(id);
      
      if (!devMeeting) {
        return null;
      }
      
      // Converter DevMeetingItem para MeetingDetails
      const rawFullAnalysis = devMeeting.analysis?.fullAnalysis as any;
      const fullReport: FullAnalysisReport | undefined = rawFullAnalysis?.report ?? rawFullAnalysis;

      const meetingDetails: MeetingDetails = {
        id: devMeeting.id,
        title: devMeeting.title,
        startedAt: devMeeting.startedAt,
        durationSeconds: devMeeting.durationSeconds,
        status: devMeeting.status,
        urlFathom: devMeeting.urlFathom,
        source: devMeeting.source,
        seller: devMeeting.seller ? {
          id: devMeeting.seller.id || 'dev_seller',
          fullName: devMeeting.seller.fullName,
          email: devMeeting.seller.email || 'dev@example.com',
          role: 'rep',
        } : undefined,
        transcript: devMeeting.transcript ? {
          id: devMeeting.transcript.id,
          rawText: devMeeting.transcript.rawText,
          language: devMeeting.transcript.language,
          processed: devMeeting.transcript.processed,
          speakers: devMeeting.transcript.speakers || [],
          segments: devMeeting.transcript.segments || [],
        } : undefined,
        analysis: devMeeting.analysis ? {
          id: `${devMeeting.id}_analysis`,
          scriptScore: devMeeting.analysis.scriptScore,
          icpFit: devMeeting.analysis.icpFit,
          summary: fullReport?.resumo_executivo || 
                  fullReport?.pontos_positivos?.join(' ') || 
                  `Reunião com ${devMeeting.seller?.fullName || 'vendedor'}`,
          nextAction: fullReport?.proxima_acao_recomendada?.acao,
          fullReport,
          
          // Legacy fields for backward compatibility
          scriptChecklist: null,
          icpCriteria: null,
          objections: fullReport?.analise_objecoes?.lista?.map((item) => ({
            type: item?.categoria,
            text: item?.cliente_citacao_ampliada,
            timestamp: 0,
            handled: item?.avaliacao_resposta?.nota >= 7,
          })),
          highlights: [],
          processingDurationMs: devMeeting.analysis.fullAnalysis?.processingTimeMs,
          createdAt: new Date(devMeeting.createdAt).toISOString(),
        } : undefined,
      };
      
      return meetingDetails;
    }

    const conditions = [eq(meetings.id, id)];
    
    // Add user filter if provided (for role-based access)
    if (userId) {
      conditions.push(eq(meetings.sellerId, userId));
    }
    
    const result = await db
      .select({
        // Meeting data
        meetingId: meetings.id,
        title: meetings.title,
        startedAt: meetings.startedAt,
        durationSeconds: meetings.durationSeconds,
        status: meetings.status,
        urlFathom: meetings.urlFathom,
        source: meetings.source,
        
        // Seller data
        sellerId: users.id,
        sellerName: users.fullName,
        sellerEmail: users.email,
        sellerRole: users.role,
        
        // Transcript data
        transcriptId: transcripts.id,
        rawText: transcripts.rawText,
        language: transcripts.language,
        processed: transcripts.processed,
        speakers: transcripts.speakers,
        segments: transcripts.segments,
        
        // Analysis data
        analysisId: analyses.id,
        scriptScore: analyses.scriptScore,
        icpFit: analyses.icpFit,
        summary: analyses.summary,
        nextAction: analyses.nextAction,
        scriptChecklist: analyses.scriptChecklist,
        icpCriteria: analyses.icpCriteria,
        objections: analyses.objections,
        highlights: analyses.highlights,
        fullReport: analyses.fullReport,
        processingDurationMs: analyses.processingDurationMs,
        analysisCreatedAt: analyses.createdAt,
      })
      .from(meetings)
      .leftJoin(users, eq(meetings.sellerId, users.id))
      .leftJoin(transcripts, eq(meetings.id, transcripts.meetingId))
      .leftJoin(analyses, eq(meetings.id, analyses.meetingId))
      .where(and(...conditions))
      .limit(1);
    
    if (result.length === 0) {
      return null;
    }
    
    const row = result[0];
    
    // Get sync status
    const syncData = await db
      .select({
        service: syncEvents.service,
        status: syncEvents.status,
        createdAt: syncEvents.createdAt,
      })
      .from(syncEvents)
      .where(eq(syncEvents.meetingId, id))
      .orderBy(syncEvents.createdAt);
    
    const hubspotSync = syncData.find(s => s.service === 'hubspot');
    const slackSync = syncData.find(s => s.service === 'slack');
    
    const meetingDetails: MeetingDetails = {
      id: row.meetingId,
      title: row.title || 'Reunião sem título',
      startedAt: row.startedAt.toISOString(),
      durationSeconds: row.durationSeconds || undefined,
      status: row.status as 'pending' | 'processing' | 'completed' | 'failed',
      urlFathom: row.urlFathom || undefined,
      source: row.source,
      seller: row.sellerEmail ? {
        id: row.sellerId,
        fullName: row.sellerName || undefined,
        email: row.sellerEmail,
        role: row.sellerRole,
      } : undefined,
      transcript: row.transcriptId ? {
        id: row.transcriptId,
        rawText: row.rawText || '',
        language: row.language || 'pt-BR',
        processed: row.processed || false,
        speakers: row.speakers as any || [],
        segments: row.segments as any || [],
      } : undefined,
      analysis: row.analysisId ? {
        id: row.analysisId,
        scriptScore: row.scriptScore || 0,
        icpFit: (row.icpFit as 'high' | 'medium' | 'low') || 'low',
        summary: row.summary || '',
        nextAction: row.nextAction || undefined,
        scriptChecklist: row.scriptChecklist as any || {},
        icpCriteria: row.icpCriteria as any || {},
        objections: row.objections as any || [],
        highlights: row.highlights as any || [],
        fullReport: row.fullReport as FullAnalysisReport | undefined,
        processingDurationMs: row.processingDurationMs || undefined,
        createdAt: row.analysisCreatedAt?.toISOString() || '',
      } : undefined,
      syncStatus: {
        hubspot: (hubspotSync?.status as any) || 'pending',
        slack: (slackSync?.status as any) || 'pending',
        lastSyncAt: hubspotSync?.createdAt?.toISOString() || undefined,
      },
    };

    if (meetingDetails.analysis?.fullReport) {
      const report = meetingDetails.analysis.fullReport;
      meetingDetails.analysis.summary = meetingDetails.analysis.summary ||
        report.resumo_executivo ||
        report.pontos_positivos?.join(' ') ||
        meetingDetails.analysis.summary || '';
      meetingDetails.analysis.nextAction = meetingDetails.analysis.nextAction ||
        report.proxima_acao_recomendada?.acao;
      if (!meetingDetails.analysis.objections?.length && report.analise_objecoes?.lista) {
        meetingDetails.analysis.objections = report.analise_objecoes.lista.map((item) => ({
          type: item.categoria,
          text: item.cliente_citacao_ampliada,
          timestamp: 0,
          handled: item.avaliacao_resposta.nota >= 7,
        }));
      }
    }
    
    return meetingDetails;
    
  } catch (error) {
    console.error('Error fetching meeting details:', error);
    return null;
  }
}

export async function triggerMeetingSync(meetingId: string, service: 'hubspot' | 'slack'): Promise<boolean> {
  try {
    // This would trigger the sync process
    // For now, just return true - implement actual sync logic later
    console.log(`Triggering ${service} sync for meeting ${meetingId}`);
    return true;
  } catch (error) {
    console.error(`Error triggering ${service} sync:`, error);
    return false;
  }
}
