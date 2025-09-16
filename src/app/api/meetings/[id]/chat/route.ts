import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getMeetingDetails } from '@/lib/meeting-details-data';
import { MeetingChatEngine } from '@/lib/chat/meeting-chat-engine';

const BodySchema = z.object({
  question: z.string().min(5, 'Pergunta muito curta'),
});

function buildFallbackSegments(transcriptText: string) {
  const chunks = transcriptText
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean)
    .slice(0, 20);

  return chunks.map((text, index) => ({
    text: text.trim(),
    start: undefined,
    end: undefined,
    speaker: index === 0 ? 'Cliente' : undefined,
  }));
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OPENAI_API_KEY não configurada' }, { status: 500 });
    }

    const body = await request.json();
    const { question } = BodySchema.parse(body);

    const meeting = await getMeetingDetails(params.id);
    if (!meeting || !meeting.analysis?.fullReport) {
      return NextResponse.json({ error: 'Reunião ou relatório não encontrado' }, { status: 404 });
    }

    const transcriptText = meeting.transcript?.rawText || '';
    const rawSegments = Array.isArray(meeting.transcript?.segments)
      ? (meeting.transcript?.segments as Array<{ speaker?: string; text?: string; start?: number; end?: number }>)
      : [];
    const segments = rawSegments.length > 0
      ? rawSegments.map((segment) => ({
          speaker: segment.speaker,
          text: segment.text || '',
          start: typeof segment.start === 'number' ? segment.start : undefined,
          end: typeof segment.end === 'number' ? segment.end : undefined,
        }))
      : buildFallbackSegments(transcriptText);

    const engine = new MeetingChatEngine(process.env.OPENAI_API_KEY);
    const answer = await engine.answer({
      question,
      report: meeting.analysis.fullReport,
      transcriptText,
      segments,
    });

    return NextResponse.json({ answer });
  } catch (error) {
    console.error('Meeting chat error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro ao processar chat da reunião' }, { status: 500 });
  }
}
