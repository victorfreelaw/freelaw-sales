import OpenAI from 'openai';
import { clampText } from '@/lib/analysis/utils';
import { getActiveGuidelines } from '@/lib/analysis/guidelines-service';
import type { FullAnalysisReport } from '@/types/analysis';

interface TranscriptSegment {
  speaker?: string;
  text: string;
  start?: number;
  end?: number;
}

interface MeetingChatInput {
  question: string;
  report: FullAnalysisReport | null;
  transcriptText: string;
  segments: TranscriptSegment[];
}

const CHAT_SYSTEM_PROMPT = `Você é o especialista em análise de demos da Freelaw, com acesso completo ao contexto da reunião.

CONTEXTO CRÍTICO:
- Esta é sempre uma DEMONSTRAÇÃO (demo) de vendas da Freelaw para escritórios de advocacia
- Você tem acesso ao Script Demo oficial, critérios ICP, transcrição completa e relatório de análise
- Sempre responda com base nas evidências concretas disponíveis

AUTORIDADE FREELAW (use quando relevante):
- 7 anos de mercado, 700+ escritórios atendidos, 9.000+ advogados na plataforma
- Produção artesanal sob medida, revisão gratuita em 2 dias, substituição de advogado

DIRETRIZES DE RESPOSTA:
- Cite sempre trechos literais entre aspas com timestamps [mm:ss] ou [mm:ss-mm:ss]
- Se usar dados do relatório sem timestamp, indique "(do relatório de análise)"
- Responda em português, tom consultivo e objetivo
- Quando questionado sobre notas/scores, aponte evidências específicas
- Se não encontrar informação na transcrição, diga explicitamente e sugira follow-up
- Nunca invente informações que não estão nos dados fornecidos

FOCO: Ajudar a entender a performance da demo baseado no Script oficial e critérios ICP da Freelaw.`;

function formatTimestamp(seconds?: number): string {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) return 'estimado';
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes.toString().padStart(2, '0')}:${secs}`;
}

function buildSegmentText(segment: TranscriptSegment, index: number): string {
  const start = formatTimestamp(segment.start);
  const end = formatTimestamp(segment.end);
  const speaker = segment.speaker ? `${segment.speaker}:` : 'Cliente:';
  return `${index + 1}. [${start}-${end}] ${speaker} ${segment.text.trim()}`;
}

function pickRelevantSegments(question: string, segments: TranscriptSegment[], maxSegments = 8): TranscriptSegment[] {
  if (!segments || segments.length === 0) return [];
  const normalizedQuestion = question.toLowerCase();
  const keywords = normalizedQuestion
    .split(/[^a-zà-ú0-9]+/i)
    .map((word) => word.trim())
    .filter((word) => word.length > 3 && !['porque', 'quais', 'sobre', 'quantos'].includes(word));

  const scored = segments
    .map((segment, idx) => {
      const text = (segment.text || '').toLowerCase();
      let score = 0;
      if (text.includes(normalizedQuestion)) score += 5;
      for (const keyword of keywords) {
        if (text.includes(keyword)) score += 2;
      }
      if (segment.speaker && /vendedor|freelaw|representante/i.test(segment.speaker)) {
        score -= 1;
      }
      return { segment, score, idx };
    })
    .sort((a, b) => b.score - a.score);

  const top = scored
    .filter((item) => item.score > 0)
    .slice(0, maxSegments)
    .map((item) => item.segment);

  if (top.length > 0) return top;
  return scored.slice(0, Math.min(maxSegments, scored.length)).map((item) => item.segment);
}

export class MeetingChatEngine {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  async answer({ question, report, transcriptText, segments }: MeetingChatInput): Promise<string> {
    const relevantSegments = pickRelevantSegments(question, segments);
    const contextSegments = relevantSegments.length > 0
      ? relevantSegments.map(buildSegmentText).join('\n')
      : 'Nenhum trecho altamente relevante encontrado. Utilize apenas o relatório para responder e sinalize a ausência de trechos.';

    const reportJson = report ? clampText(JSON.stringify(report, null, 2), 7000) : 'Análise não disponível ainda - use apenas a transcrição para responder.';
    const rawTranscript = clampText(transcriptText, 5000);
    const { script, icp } = await getActiveGuidelines();
    const scriptGuidelines = clampText(script, 4000);
    const icpGuidelines = clampText(icp, 4000);

    const userPrompt = [
      'CONTEXTO COMPLETO DA DEMO FREELAW',
      '',
      '--- SCRIPT DEMO OFICIAL (REFERÊNCIA) ---',
      scriptGuidelines,
      '',
      '--- CRITÉRIOS ICP FREELAW (REFERÊNCIA) ---',
      icpGuidelines,
      '',
      '--- RELATÓRIO DE ANÁLISE ---',
      reportJson,
      '',
      '--- TRECHOS DE TRANSCRIÇÃO MAIS RELEVANTES ---',
      contextSegments,
      '',
      '--- TRANSCRIÇÃO COMPLETA (RESUMIDA) ---',
      rawTranscript,
      '',
      'INSTRUÇÕES DE RESPOSTA:',
      '- Use o Script Demo e critérios ICP como referência para explicar notas e avaliações',
      '- Cite sempre trechos literais entre aspas com timestamps [mm:ss] ou [mm:ss-mm:ss]',
      '- Se usar dados do relatório, indique "(do relatório de análise)"',
      '- Compare performance com as expectativas do Script Demo oficial',
      '- Para perguntas sobre ICP, use os critérios oficiais como base',
      '- Para notas baixas, explique o que faltou segundo o Script Demo',
      '- Se não encontrar evidência na transcrição, seja explícito e sugira follow-up',
      '- Resposta máxima: 800 caracteres, direto ao ponto',
      '',
      `PERGUNTA: ${question}`,
    ].join('\n');

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      max_tokens: 900,
      messages: [
        { role: 'system', content: CHAT_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    });

    return completion.choices[0]?.message?.content?.trim() || '';
  }
}
