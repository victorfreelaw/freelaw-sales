import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
// Lazy DB + processor imports inside POST to avoid loading DB on GET
export const runtime = 'nodejs';

// Schema de validação para o payload do N8N
const N8NTranscriptSchema = z.object({
  sellerName: z.string().min(1, 'Nome do vendedor é obrigatório'),
  sellerEmail: z.string().email('Email do vendedor deve ser válido').optional(),
  meetingDate: z.string().min(1, 'Data da reunião é obrigatória'),
  meetingTitle: z.string().min(1, 'Título da reunião é obrigatório').optional(),
  recordingUrl: z.string().url('URL da gravação deve ser válida'),
  transcript: z.string().min(10, 'Transcrição deve ter pelo menos 10 caracteres'),
  clientEmail: z.string().optional(),
  externalId: z.string().min(1).optional(),
});

type N8NTranscriptPayload = z.infer<typeof N8NTranscriptSchema>;

// Chave secreta para autenticação
const N8N_WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET;

function parseMeetingDate(value: string): Date | null {
  if (!value) return null;
  const trimmed = value.trim();

  // Epoch (seconds or milliseconds)
  if (/^-?\d+$/.test(trimmed)) {
    const numeric = Number(trimmed);
    const millis = trimmed.length === 10 ? numeric * 1000 : numeric;
    const date = new Date(millis);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  // Replace space between date/time with 'T'
  const normalized = trimmed.includes('T') ? trimmed : trimmed.replace(' ', 'T');
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

// Função para processar análise IA em background
async function processAnalysisInBackground(data: N8NTranscriptPayload, meetingId: string) {
  try {
    console.log('Iniciando análise IA em background para meeting:', meetingId);

    const [{ createAnalysisPipeline }, { buildPersistableAnalysis }] = await Promise.all([
      import('@/lib/analysis/analysis-pipeline'),
      import('@/lib/analysis/pipeline-result-utils'),
    ]);

    const pipeline = createAnalysisPipeline();
    if (!pipeline) {
      throw new Error('Pipeline de análise não pôde ser inicializado');
    }

    const pipelineResult = await pipeline.executeFullPipeline({
      meetingId,
      rawTranscript: data.transcript,
    });

    if (!pipelineResult.success) {
      throw new Error('Pipeline de análise retornou falha');
    }

    const summary = buildPersistableAnalysis(pipelineResult);

    if (process.env.DATABASE_URL?.includes('fake') || process.env.DEV_STORE_ENABLED === 'true') {
      const { updateDevMeetingAnalysis } = await import('@/lib/dev-store');

      updateDevMeetingAnalysis(meetingId, {
        scriptScore: summary.scriptScore,
        icpFit: summary.icpFit,
        fullAnalysis: {
          report: summary.fullReport,
          stats: summary.pipelineStats,
        },
      });

      console.log('Background analysis completed for meeting:', meetingId);
    }
  } catch (error) {
    console.error('Background analysis failed for meeting:', meetingId, error);
  }
}

function processTranscriptInDatabaseBackground(transcriptId: string, meetingId: string) {
  setImmediate(async () => {
    try {
      const [{ getAnalysisProcessor }, { db }, schema, { eq }] = await Promise.all([
        import('@/lib/analysis/processor'),
        import('@/db/connection'),
        import('@/db/schema'),
        import('drizzle-orm'),
      ]);

      const processor = getAnalysisProcessor();
      const success = await processor.processTranscript(transcriptId);

      await db
        .update(schema.meetings)
        .set({
          status: success ? 'completed' : 'failed',
          updatedAt: new Date(),
        })
        .where(eq(schema.meetings.id, meetingId));

      console.log('Background DB analysis finished', { meetingId, success });
    } catch (error) {
      console.error('Background DB analysis failed', { meetingId, transcriptId, error });
      try {
        const [{ db }, schema, { eq }] = await Promise.all([
          import('@/db/connection'),
          import('@/db/schema'),
          import('drizzle-orm'),
        ]);
        await db
          .update(schema.meetings)
          .set({ status: 'failed', updatedAt: new Date() })
          .where(eq(schema.meetings.id, meetingId));
      } catch (innerErr) {
        console.error('Failed to update meeting status after background error', innerErr);
      }
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('Authorization');
    const providedSecret = authHeader?.replace('Bearer ', '');
    
    if (!N8N_WEBHOOK_SECRET || providedSecret !== N8N_WEBHOOK_SECRET) {
      console.log('N8N Webhook unauthorized access attempt');
      
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse e validação do payload
    let rawBody: any;
    try {
      const raw = await request.json();
      // Alguns clientes (ex.: n8n em modo RAW) enviam o JSON como string literal
      rawBody = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (e) {
      console.error('Invalid JSON body:', e);
      return NextResponse.json({ error: 'Dados inválidos: JSON malformado' }, { status: 400 });
    }
    console.log('N8N Webhook received:', JSON.stringify(rawBody, null, 2));
    
    const validatedData: N8NTranscriptPayload = N8NTranscriptSchema.parse(rawBody);

    console.log('N8N Webhook processing:', {
      sellerName: validatedData.sellerName,
      transcriptLength: validatedData.transcript.length
    });

    const meetingDate = parseMeetingDate(validatedData.meetingDate);
    if (!meetingDate) {
      return NextResponse.json(
        {
          error: 'Dados inválidos',
          details: [{ field: 'meetingDate', message: 'Formato de data inválido' }],
        },
        { status: 400 }
      );
    }

    // Modo dry-run para testes sem banco
    const dryRun = process.env.N8N_WEBHOOK_DRY_RUN === 'true' || request.headers.get('x-dry-run') === 'true';

    // Responder imediatamente para evitar timeout
    // A análise IA será processada em background

    if (dryRun) {
      console.log('N8N Webhook DRY RUN ativo. Pulando escrita no banco.');

      return NextResponse.json({
        success: true,
        dryRun: true,
        message: 'Payload validado (dry-run) - análise será processada em background',
        echo: {
          sellerName: validatedData.sellerName,
          meetingDate: meetingDate.toISOString(),
          recordingUrl: validatedData.recordingUrl,
          clientEmail: validatedData.clientEmail,
        },
      });
    }

    // Salvar dados iniciais e processar análise IA em background
    
    // Se o banco for fake ou dev-store estiver habilitado, usar dev-store
    if (process.env.DATABASE_URL?.includes('fake') || process.env.DEV_STORE_ENABLED === 'true') {
      try {
        const { addDevMeeting, updateDevMeetingTranscript } = await import('@/lib/dev-store');
        
        console.log('Dev-store: Salvando reunião inicial', {
          sellerName: validatedData.sellerName
        });

        const savedMeeting = addDevMeeting({
          sellerName: validatedData.sellerName,
          sellerEmail: validatedData.sellerEmail,
          meetingDate: meetingDate.toISOString(),
          recordingUrl: validatedData.recordingUrl,
          analysis: undefined, // Será atualizado quando a análise IA terminar
          title: validatedData.meetingTitle,
        });
        
        console.log('Dev-store: Reunião salva com ID', savedMeeting.id);

        // Salvar transcrição no dev-store
        updateDevMeetingTranscript(savedMeeting.id, {
          rawText: validatedData.transcript,
          language: 'pt-BR'
        });
        
        console.log('Dev-store: Transcrição salva para meeting', savedMeeting.id);

        // Processar análise IA em background (não aguardar)
        processAnalysisInBackground(validatedData, savedMeeting.id);

        return NextResponse.json({
          success: true,
          dryRun: false,
          message: 'Reunião salva com sucesso - análise IA sendo processada em background',
          meetingId: savedMeeting.id,
          echo: {
            sellerName: validatedData.sellerName,
            meetingDate: meetingDate.toISOString(),
            recordingUrl: validatedData.recordingUrl,
            clientEmail: validatedData.clientEmail,
          },
          analysisStatus: 'processing_in_background'
        });
      } catch (devErr) {
        console.error('Dev store error:', devErr);
        return NextResponse.json({ 
          error: 'Erro ao salvar no dev-store', 
          details: devErr instanceof Error ? devErr.message : String(devErr)
        }, { status: 500 });
      }
    }

    try {
      // Lazy import de DB e schema apenas quando não for dry-run
      const [{ db }, schema, { eq }] = await Promise.all([
        import('@/db/connection'),
        import('@/db/schema'),
        import('drizzle-orm'),
      ]);

      // Garantir vendedor
      const { eq: eqOp } = await import('drizzle-orm');
      async function ensureSeller(): Promise<string> {
        if (validatedData.sellerEmail) {
          const existing = await db
            .select({ id: schema.users.id })
            .from(schema.users)
            .where(eqOp(schema.users.email, validatedData.sellerEmail))
            .limit(1);
          if (existing.length) return existing[0].id;
          const [created] = await db
            .insert(schema.users)
            .values({
              email: validatedData.sellerEmail,
              fullName: validatedData.sellerName,
              role: 'rep',
              isActive: true,
            })
            .returning({ id: schema.users.id });
          return created.id;
        }
        const { randomUUID } = await import('crypto');
        const tempEmail = `webhook+${randomUUID()}@local.dev`;
        const [created] = await db
          .insert(schema.users)
          .values({ email: tempEmail, fullName: validatedData.sellerName, role: 'rep', isActive: true })
          .returning({ id: schema.users.id });
        return created.id;
      }

      // Idempotência via externalId
      const { randomUUID } = await import('crypto');
      const sourceId = validatedData.externalId ? `n8n_${validatedData.externalId}` : `n8n_${randomUUID()}`;
      const existing = await db
        .select({ id: schema.meetings.id })
        .from(schema.meetings)
        .where(eq(schema.meetings.sourceId, sourceId))
        .limit(1);

      let meetingId: string;
      if (existing.length) {
        meetingId = existing[0].id;
      } else {
        const sellerId = await ensureSeller();
        const [createdMeeting] = await db
          .insert(schema.meetings)
          .values({
            sourceId,
            sellerId,
            title: validatedData.meetingTitle || `Reunião - ${validatedData.sellerName}`,
            startedAt: meetingDate,
            urlFathom: validatedData.recordingUrl,
            participantCount: 2,
            status: 'processing',
            language: 'pt-BR',
            source: 'n8n',
          })
          .returning({ id: schema.meetings.id });
        meetingId = createdMeeting.id;
      }

      // Inserir transcrição
      const [transcript] = await db
        .insert(schema.transcripts)
        .values({
          meetingId,
          rawText: validatedData.transcript,
          language: 'pt-BR',
        })
        .returning();

      // Processar análise em background
      processTranscriptInDatabaseBackground(transcript.id, meetingId);

      console.log('Meeting queued for background processing:', {
        meetingId,
        sellerName: validatedData.sellerName,
      });

      return NextResponse.json({
        success: true,
        meetingId: meetingId,
        transcriptId: transcript.id,
        message: 'Reunião salva - análise sendo processada em background',
        analysisStatus: 'processing_in_background',
        echo: {
          sellerName: validatedData.sellerName,
          meetingDate: meetingDate.toISOString(),
          recordingUrl: validatedData.recordingUrl,
          clientEmail: validatedData.clientEmail,
        },
      });

    } catch (dbError) {
      console.error('Database error:', dbError);
      throw dbError;
    }

  } catch (error) {
    console.error('N8N Webhook error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Dados inválidos',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}

// Endpoint para teste (GET)
export async function GET() {
  return NextResponse.json({
    endpoint: 'N8N Transcript Webhook',
    status: 'active',
    expectedMethod: 'POST',
    authentication: 'Bearer token required',
    dryRunActive: process.env.N8N_WEBHOOK_DRY_RUN === 'true',
    documentation: {
      url: '/api/webhooks/n8n',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer YOUR_N8N_WEBHOOK_SECRET'
      },
      requiredFields: [
        'sellerName', 
        'meetingDate',
        'recordingUrl',
        'transcript',
        'clientEmail'
      ]
    }
  });
}
