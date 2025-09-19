import OpenAI from 'openai';
import { z } from 'zod';
import { buildFullAnalysisPrompt, SYSTEM_PROMPT } from './prompts';
import { parseModelJSON } from './utils';
import { Telemetry } from '@/lib/telemetry';
import type { FullAnalysisReport } from '@/types/analysis';

type TranscriptSegment = {
  speaker?: string;
  text?: string;
  start?: number;
  end?: number;
};

const ScriptStageSchema = z.object({
  nota: z.number().min(0).max(10),
  justificativa: z.string(),
  evidencias_que_sustentam: z.array(z.string()),
  faltou_para_10: z.array(z.string())
});

const FullReportSchema = z.object({
  aderencia_ao_script: z.object({
    score_geral: z.number().min(0).max(100),
    etapas: z.object({
      introducao: ScriptStageSchema,
      exploracao_cenario: ScriptStageSchema,
      apresentacao_freelaw: ScriptStageSchema,
      beneficios_escritorio: ScriptStageSchema,
      metodologia: ScriptStageSchema,
      como_funciona_delegacao: ScriptStageSchema,
      conversa_com_prestador: ScriptStageSchema,
      plano_ideal: ScriptStageSchema,
      encerramento_follow_up: ScriptStageSchema,
    }),
  }),
  analise_icp: z.object({
    status: z.enum(['HIGH', 'MEDIUM', 'LOW']),
    score_geral: z.number().min(0).max(100),
    criterios: z.object({
      porte_estrutura: z.object({
        classificacao: z.enum(['alto', 'medio', 'baixo', 'nao_mencionado']),
        evidencia: z.string(),
        nota: z.number().min(0).max(20),
      }),
      faturamento: z.object({
        classificacao: z.enum(['alto', 'medio', 'baixo', 'nao_mencionado']),
        evidencia: z.string(),
        nota: z.number().min(0).max(20),
      }),
      volume_casos: z.object({
        classificacao: z.enum(['alto', 'medio', 'baixo', 'nao_mencionado']),
        evidencia: z.string(),
        nota: z.number().min(0).max(20),
      }),
      dores_principais: z.object({
        classificacao: z.enum(['alto', 'medio', 'baixo', 'nao_mencionado']),
        evidencia: z.string(),
        nota: z.number().min(0).max(20),
      }),
      regiao: z.object({
        classificacao: z.enum(['alto', 'medio', 'baixo', 'nao_mencionado']),
        evidencia: z.string(),
        nota: z.number().min(0).max(20),
      }),
      maturidade_digital: z.object({
        classificacao: z.enum(['alto', 'medio', 'baixo', 'nao_mencionado']),
        evidencia: z.string(),
        nota: z.number().min(0).max(20),
      }),
      perfil_decisao: z.object({
        classificacao: z.enum(['alto', 'medio', 'baixo', 'nao_mencionado']),
        evidencia: z.string(),
        nota: z.number().min(0).max(20),
      }),
    }),
    vale_insistir: z.object({
      recomendacao: z.string(),
      condicoes: z.array(z.string()),
      status: z.enum(['insistir', 'despriorizar', 'avaliar'])
    }),
    observacoes: z.string().optional()
  }),
  analise_objecoes: z.object({
    lista: z.array(z.object({
      categoria: z.string(),
      cliente_citacao_ampliada: z.string(),
      resposta_vendedor_citacao: z.string(),
      avaliacao_resposta: z.object({
        nota: z.number().min(0).max(10),
        racional: z.string(),
      }),
      resposta_sugerida: z.object({
        texto: z.string(),
        por_que_funciona: z.string(),
      }),
      proximo_passo_demo: z.string(),
    })),
    kpis: z.object({
      total: z.number(),
      tratadas_efetivamente: z.number(),
      score_medio_por_categoria: z.record(z.number()),
      principais_lacunas: z.array(z.string()),
    }),
  }),
  pontos_positivos: z.array(z.string()),
  pontos_a_melhorar: z.array(z.string()),
  sugestoes_praticas: z.array(z.object({
    sugestao: z.string(),
    como_executar: z.array(z.string()),
    impacto: z.string().optional(),
  })),
  resumo_executivo: z.string(),
  proxima_acao_recomendada: z.object({
    acao: z.string(),
    prazo: z.string(),
    racional: z.string(),
    condicoes: z.array(z.string()).optional(),
  }),
  mensagem_sugerida: z.object({
    texto: z.string(),
    por_que_funciona: z.string(),
  }),
  checklist_follow_up: z.array(z.string()),
});

export interface AnalysisResult {
  report: FullAnalysisReport;
  scriptScore: number;
  icpFit: 'high' | 'medium' | 'low';
  summary: string;
  nextAction: string;
  processingTimeMs: number;
}

export class FreelawAnalysisEngine {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({
      apiKey,
    });
  }

  private async callLLM(prompt: string, maxTokens: number = 1000): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ],
        max_tokens: maxTokens,
        temperature: 0.3, // Lower temperature for more consistent analysis
        response_format: { type: 'json_object' },
      });

      return response.choices[0]?.message?.content || '{}';
    } catch (error) {
      console.error('LLM API error:', error);
      throw new Error('Failed to get analysis from LLM');
    }
  }

  private preprocessTranscript(transcript: string, segments?: TranscriptSegment[]): string {
    const formatTimestamp = (value?: number) => {
      if (typeof value !== 'number' || Number.isNaN(value)) return 'timestamp indisponível';
      const minutes = Math.floor(value / 60)
        .toString()
        .padStart(2, '0');
      const seconds = Math.floor(value % 60)
        .toString()
        .padStart(2, '0');
      return `${minutes}:${seconds}`;
    };

    // Preferir a transcrição estruturada (segmentos com timestamps) quando disponível.
    if (segments && segments.length > 0) {
      const formattedSegments = segments.map((segment, index) => {
        const start = formatTimestamp(segment.start);
        const end = segment.end ? formatTimestamp(segment.end) : start;
        const speaker = segment.speaker || 'Indefinido';
        const text = (segment.text || '').trim();
        return `[[SEGMENTO ${index + 1}]] [${start}-${end}] ${speaker}: "${text}"`;
      });

      const joined = formattedSegments.join('\n');
      return this.chunkTranscript(joined);
    }

    // Caso não haja segmentos, aplicar limpeza básica no texto bruto.
    const cleaned = transcript
      .replace(/\[.*?\]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    return this.chunkTranscript(cleaned);
  }

  private chunkTranscript(content: string): string {
    const MAX_CHUNK = 60000; // ~12k tokens por bloco no GPT-4o
    if (content.length <= MAX_CHUNK) {
      return content;
    }

    const chunks: string[] = [];
    let index = 0;
    while (index < content.length) {
      chunks.push(content.slice(index, index + MAX_CHUNK));
      index += MAX_CHUNK;
    }

    return chunks
      .map((chunk, i) => `[[TRECHO ${i + 1} de ${chunks.length}]]\n${chunk}`)
      .join('\n\n');
  }

  async analyzeTranscript(
    transcript: string,
    meetingId: string,
    segments?: TranscriptSegment[]
  ): Promise<AnalysisResult> {
    return Telemetry.time('analysis.complete', async () => {
      const processedTranscript = this.preprocessTranscript(transcript, segments);

      const rawReport = await this.callLLM(buildFullAnalysisPrompt(processedTranscript), 4200);

      let report: FullAnalysisReport;

      try {
        console.log('Full Analysis Raw Response:', rawReport?.substring(0, 600));
        const parsed = parseModelJSON(rawReport, 'análise completa');
        report = FullReportSchema.parse(parsed) as FullAnalysisReport;
      } catch (error) {
        console.error('Failed to parse full analysis response:', error);
        throw new Error('Invalid analysis response format');
      }

      const stageNotes = Object.values(report.aderencia_ao_script.etapas).map(stage => stage.nota);
      const avgStageScore = stageNotes.length
        ? (stageNotes.reduce((acc, note) => acc + note, 0) / stageNotes.length) * 10
        : 0;
      const scriptScore = Math.max(
        0,
        Math.min(100, Math.round(report.aderencia_ao_script.score_geral || avgStageScore))
      );

      const icpFit = (report.analise_icp.status || 'LOW').toLowerCase() as 'high' | 'medium' | 'low';
      const summary = report.resumo_executivo;
      const nextAction = report.proxima_acao_recomendada?.acao || '';

      // Emit specific telemetry
      Telemetry.analysisCompleted({
        meetingId,
        scriptScore,
        icpFit,
        durationMs: 0, // Will be filled by the timing wrapper
      });

      return {
        report,
        scriptScore,
        icpFit,
        summary,
        nextAction,
        processingTimeMs: 0, // Will be filled by the timing wrapper
      };
    }, { meetingId });
  }

  // Utility method for batch processing
  async analyzeMultipleTranscripts(
    transcripts: Array<{ id: string; transcript: string; meetingId: string }>
  ): Promise<Array<{ id: string; result: AnalysisResult | null; error?: string }>> {
    const results = await Promise.allSettled(
      transcripts.map(async ({ id, transcript, meetingId }) => ({
        id,
        result: await this.analyzeTranscript(transcript, meetingId),
      }))
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          id: transcripts[index].id,
          result: null,
          error: result.reason?.message || 'Unknown error',
        };
      }
    });
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Responda apenas "OK"' }],
        max_tokens: 5,
      });

      return response.choices[0]?.message?.content?.trim() === 'OK';
    } catch (error) {
      console.error('LLM health check failed:', error);
      return false;
    }
  }
}
