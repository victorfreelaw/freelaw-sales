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
  clientEmail: z.string().email('Email do cliente deve ser válido'),
  externalId: z.string().min(1).optional(),
});

type N8NTranscriptPayload = z.infer<typeof N8NTranscriptSchema>;

// Chave secreta para autenticação
const N8N_WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET;

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

    // Modo dry-run para testes sem banco
    const dryRun = process.env.N8N_WEBHOOK_DRY_RUN === 'true' || request.headers.get('x-dry-run') === 'true';

    // Executar análise sempre (tanto dry-run quanto produção)
    const mode = process.env.ANALYSIS_MODE || 'mock';
    const { FreelawAnalysisEngine } = await import('@/lib/analysis/engine');
    const { MockAnalysisEngine } = await import('@/lib/analysis/mock-engine');
    const engineIsLive = mode === 'live' && !!process.env.OPENAI_API_KEY;
    const engine = engineIsLive
      ? new FreelawAnalysisEngine(process.env.OPENAI_API_KEY as string)
      : new MockAnalysisEngine();
    console.log('Analysis engine selected:', engineIsLive ? 'live' : 'mock');

    let analysis: any = null;
    let analysisErrorMessage: string | undefined;
    try {
      const meetingId = dryRun ? 'dry-run' : 'production';
      analysis = await engine.analyzeTranscript(validatedData.transcript, meetingId);
    } catch (analysisErr) {
      console.error('Analysis error:', analysisErr);
      analysisErrorMessage = analysisErr instanceof Error ? analysisErr.message : 'Unknown error';
    }

    if (dryRun) {
      console.log('N8N Webhook DRY RUN ativo. Pulando escrita no banco e executando análise.');

      // Register in dev in-memory store so it appears in the Meetings front (no DB required)
      try {
        const { addDevMeeting } = await import('@/lib/dev-store');
        const icpFit = (analysis?.icpFit as 'high' | 'medium' | 'low') ||
          (analysis?.report?.analise_icp?.status?.toLowerCase() as 'high' | 'medium' | 'low') ||
          'medium';
        const scriptScore = Number(analysis?.scriptScore ?? analysis?.report?.aderencia_ao_script?.score_geral) || 0;
        addDevMeeting({
          sellerName: validatedData.sellerName,
          sellerEmail: (validatedData as any).sellerEmail,
          meetingDate: validatedData.meetingDate,
          recordingUrl: validatedData.recordingUrl,
          analysis: { scriptScore, icpFit },
          title: validatedData.meetingTitle,
        });
      } catch (devErr) {
        console.warn('Dev store not available or failed to register meeting:', devErr);
      }

      return NextResponse.json({
        success: true,
        dryRun: true,
        message: 'Payload validado e analisado (dry-run) — nenhuma escrita no banco foi realizada',
        echo: {
          sellerName: validatedData.sellerName,
          meetingDate: validatedData.meetingDate,
          recordingUrl: validatedData.recordingUrl,
          clientEmail: validatedData.clientEmail,
        },
        analysis,
        analysisStatus: analysis ? 'ok' : 'skipped_or_failed',
        engine: engineIsLive ? 'live' : 'mock',
        error: analysis ? undefined : analysisErrorMessage,
      });
    }

    // Se o banco for fake ou dev-store estiver habilitado, usar dev-store
    if (process.env.DATABASE_URL?.includes('fake') || process.env.DEV_STORE_ENABLED === 'true') {
      try {
        const { addDevMeeting } = await import('@/lib/dev-store');
        const icpFit = (analysis?.icpFit as 'high' | 'medium' | 'low') ||
          (analysis?.report?.analise_icp?.status?.toLowerCase() as 'high' | 'medium' | 'low') ||
          'medium';
        const scriptScore = Number(analysis?.scriptScore ?? analysis?.report?.aderencia_ao_script?.score_geral) || 0;
        
        console.log('Dev-store: Salvando reunião', {
          sellerName: validatedData.sellerName,
          hasAnalysis: !!analysis
        });
        
        const savedMeeting = addDevMeeting({
          sellerName: validatedData.sellerName,
          sellerEmail: validatedData.sellerEmail,
          meetingDate: validatedData.meetingDate,
          recordingUrl: validatedData.recordingUrl,
          analysis: analysis ? { 
            scriptScore, 
            icpFit, 
            fullAnalysis: analysis 
          } : { 
            scriptScore: 0, 
            icpFit: 'medium' 
          },
          title: validatedData.meetingTitle,
        });
        
        console.log('Dev-store: Reunião salva com ID', savedMeeting.id);

        return NextResponse.json({
          success: true,
          dryRun: false,
          message: 'Reunião salva com sucesso no dev-store',
          meetingId: savedMeeting.id,
          echo: {
            sellerName: validatedData.sellerName,
            meetingDate: validatedData.meetingDate,
            recordingUrl: validatedData.recordingUrl,
            clientEmail: validatedData.clientEmail,
          },
          analysis,
          analysisStatus: analysis ? 'ok' : 'skipped_or_failed',
          engine: engineIsLive ? 'live' : 'mock',
          error: analysis ? undefined : analysisErrorMessage,
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
            startedAt: new Date(validatedData.meetingDate),
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
      try {
        const { getAnalysisProcessor } = await import('@/lib/analysis/processor');
        const processor = getAnalysisProcessor();
        const success = await processor.processTranscript(transcript.id);

        if (success) {
          // Atualizar status da reunião como concluído
          await db
            .update(schema.meetings)
            .set({
              status: 'completed',
              updatedAt: new Date(),
            })
            .where(eq(schema.meetings.id, meetingId));
        } else {
          throw new Error('Failed to process transcript analysis');
        }

      } catch (analysisError) {
        console.error('Analysis processing error:', analysisError);
        
        // Atualizar status para erro, mas não falhar o webhook
        await db
          .update(schema.meetings)
          .set({
            status: 'failed',
            updatedAt: new Date(),
          })
          .where(eq(schema.meetings.id, meetingId));
      }

      console.log('Meeting processed successfully:', {
        meetingId: meetingId,
        sellerName: validatedData.sellerName
      });

      return NextResponse.json({
        success: true,
        meetingId: meetingId,
        transcriptId: transcript.id,
        message: 'Transcrição processada com sucesso'
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
