import OpenAI from 'openai';
import { clampText } from '@/lib/analysis/utils';
import type { FullAnalysisReport } from '@/types/analysis';

interface TranscriptSegment {
  speaker?: string;
  text: string;
  start?: number;
  end?: number;
}

interface MeetingChatInput {
  question: string;
  report: FullAnalysisReport;
  transcriptText: string;
  segments: TranscriptSegment[];
}

const CHAT_SYSTEM_PROMPT = `Você é o modo de chat da Freelaw para analisar uma demo específica. Sempre responda citando trechos literais com timestamps. Se o dado vier do relatório e não houver timestamp, indique que é derivado do relatório.`;

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

    const reportJson = clampText(JSON.stringify(report, null, 2), 8000);
    const rawTranscript = clampText(transcriptText, 6000);

    const userPrompt = [
      'Você receberá partes relevantes da transcrição e o relatório completo da demo. Responda à pergunta do usuário com base apenas nesses dados.',
      '',
      'CONTEXTOS DISPONÍVEIS:',
      '--- RELATÓRIO DA DEMO (JSON) ---',
      reportJson,
      '',
      '--- TRECHOS DE TRANSCRIÇÃO MAIS RELEVANTES ---',
      contextSegments,
      '',
      '--- TRANSCRIÇÃO (TRECHO REDUZIDO PARA REFERÊNCIA) ---',
      rawTranscript,
      '',
      'INSTRUÇÕES DE RESPOSTA:',
      '- Cite sempre trechos literais entre aspas e inclua timestamps no formato [mm:ss] ou indique "[estimado]"',
      '- Se usar informação do relatório sem timestamp, sinalize como "(relatório)"',
      '- Responda em português, com tom consultivo e objetivo',
      '- Quando questionado sobre motivos de notas específicas, aponte as evidências correspondentes',
      '- Se não houver menção na transcrição, diga explicitamente que não encontrou e sugira pergunta de follow-up',
      '- Jamais invente informações novas',
      '',
      `Pergunta do usuário: ${question}`,
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
