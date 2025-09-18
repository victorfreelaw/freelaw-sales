// Sistema de chunking inteligente para transcrições longas
// Divide texto preservando contexto e timestamps

interface TranscriptSegment {
  speaker?: string;
  text: string;
  start?: number;
  end?: number;
  timestamp?: string;
}

interface TranscriptChunk {
  id: string;
  content: string;
  startTime: number;
  endTime: number;
  speakers: string[];
  tokenCount: number;
  hasOverlap: boolean;
  overlapWith?: string;
  metadata: {
    segmentCount: number;
    dominantSpeaker: string;
    topics?: string[];
  };
}

const CHUNK_SIZE = 1500; // Tokens alvo por chunk (~5-7 min de conversa)
const OVERLAP_SIZE = 200; // Tokens de sobreposição
const MIN_CHUNK_SIZE = 800; // Tamanho mínimo do chunk

// Estimativa aproximada de tokens (1 token ≈ 4 caracteres em português)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Parseia transcrição com timestamps para segmentos estruturados
export function parseTranscriptToSegments(rawTranscript: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  
  // Pattern para diferentes formatos de timestamp
  const patterns = [
    /(\d{2}:\d{2}:\d{2})\s*-\s*([^:]+?):\s*(.+?)(?=\d{2}:\d{2}:\d{2}|$)/gs,
    /(\d{1,2}:\d{2})\s*-\s*([^:]+?):\s*(.+?)(?=\d{1,2}:\d{2}|$)/gs,
    /\[(\d{2}:\d{2}:\d{2})\]\s*([^:]+?):\s*(.+?)(?=\[\d{2}:\d{2}:\d{2}\]|$)/gs,
  ];

  for (const pattern of patterns) {
    const matches = [...rawTranscript.matchAll(pattern)];
    if (matches.length > 0) {
      for (const match of matches) {
        const [, timestamp, speaker, text] = match;
        const timeInSeconds = parseTimestamp(timestamp);
        
        segments.push({
          speaker: speaker.trim(),
          text: text.trim(),
          start: timeInSeconds,
          timestamp: timestamp
        });
      }
      break; // Se encontrou matches, para de tentar outros patterns
    }
  }

  // Se nenhum pattern funcionou, tenta splittar por linhas
  if (segments.length === 0) {
    const lines = rawTranscript.split('\n').filter(line => line.trim());
    lines.forEach((line, index) => {
      segments.push({
        speaker: 'Unknown',
        text: line.trim(),
        start: index * 30, // Assume 30s por linha como fallback
        timestamp: `${Math.floor(index * 30 / 60)}:${(index * 30 % 60).toString().padStart(2, '0')}`
      });
    });
  }

  return segments;
}

// Converte timestamp para segundos
function parseTimestamp(timestamp: string): number {
  const parts = timestamp.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

// Formata segundos de volta para timestamp
function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Cria chunks inteligentes preservando contexto
export function createIntelligentChunks(segments: TranscriptSegment[]): TranscriptChunk[] {
  if (segments.length === 0) return [];

  const chunks: TranscriptChunk[] = [];
  let currentChunk: TranscriptSegment[] = [];
  let currentTokens = 0;
  let chunkIndex = 0;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const segmentTokens = estimateTokens(segment.text);

    // Se adicionar este segmento ultrapassaria o limite
    if (currentTokens + segmentTokens > CHUNK_SIZE && currentChunk.length > 0) {
      // Cria chunk atual
      const chunk = createChunkFromSegments(currentChunk, chunkIndex);
      chunks.push(chunk);
      chunkIndex++;

      // Inicia novo chunk com sobreposição
      const overlapSegments = getOverlapSegments(currentChunk, OVERLAP_SIZE);
      currentChunk = [...overlapSegments, segment];
      currentTokens = overlapSegments.reduce((sum, seg) => sum + estimateTokens(seg.text), 0) + segmentTokens;
    } else {
      // Adiciona segmento ao chunk atual
      currentChunk.push(segment);
      currentTokens += segmentTokens;
    }
  }

  // Adiciona último chunk se houver conteúdo
  if (currentChunk.length > 0) {
    const chunk = createChunkFromSegments(currentChunk, chunkIndex);
    chunks.push(chunk);
  }

  // Adiciona referências de sobreposição
  for (let i = 1; i < chunks.length; i++) {
    chunks[i].hasOverlap = true;
    chunks[i].overlapWith = chunks[i - 1].id;
  }

  return chunks;
}

// Pega segmentos para sobreposição baseado em tokens
function getOverlapSegments(segments: TranscriptSegment[], targetTokens: number): TranscriptSegment[] {
  const overlap: TranscriptSegment[] = [];
  let tokens = 0;

  // Pega segmentos do final para trás até atingir o target
  for (let i = segments.length - 1; i >= 0 && tokens < targetTokens; i--) {
    const segment = segments[i];
    const segmentTokens = estimateTokens(segment.text);
    overlap.unshift(segment);
    tokens += segmentTokens;
  }

  return overlap;
}

// Cria objeto chunk a partir de segmentos
function createChunkFromSegments(segments: TranscriptSegment[], index: number): TranscriptChunk {
  const content = segments.map(seg => 
    `${seg.timestamp || formatTimestamp(seg.start || 0)} - ${seg.speaker}: ${seg.text}`
  ).join('\n');

  const speakers = [...new Set(segments.map(seg => seg.speaker || 'Unknown'))];
  const startTime = segments[0]?.start || 0;
  const endTime = segments[segments.length - 1]?.end || segments[segments.length - 1]?.start || 0;
  
  // Identifica speaker dominante
  const speakerCounts = segments.reduce((acc, seg) => {
    const speaker = seg.speaker || 'Unknown';
    acc[speaker] = (acc[speaker] || 0) + estimateTokens(seg.text);
    return acc;
  }, {} as Record<string, number>);
  
  const dominantSpeaker = Object.entries(speakerCounts)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Unknown';

  return {
    id: `chunk_${index.toString().padStart(3, '0')}`,
    content,
    startTime,
    endTime,
    speakers,
    tokenCount: estimateTokens(content),
    hasOverlap: false,
    metadata: {
      segmentCount: segments.length,
      dominantSpeaker,
      topics: [] // TODO: Implementar extração de tópicos
    }
  };
}

// Função principal para processar transcrição completa
export function processTranscriptForAnalysis(rawTranscript: string): {
  segments: TranscriptSegment[];
  chunks: TranscriptChunk[];
  stats: {
    totalSegments: number;
    totalChunks: number;
    totalTokens: number;
    averageChunkSize: number;
    speakers: string[];
    duration: number;
  };
} {
  const segments = parseTranscriptToSegments(rawTranscript);
  const chunks = createIntelligentChunks(segments);
  
  const totalTokens = chunks.reduce((sum, chunk) => sum + chunk.tokenCount, 0);
  const speakers = [...new Set(segments.map(seg => seg.speaker || 'Unknown'))];
  const duration = segments.length > 0 ? 
    (segments[segments.length - 1]?.end || segments[segments.length - 1]?.start || 0) : 0;

  return {
    segments,
    chunks,
    stats: {
      totalSegments: segments.length,
      totalChunks: chunks.length,
      totalTokens,
      averageChunkSize: chunks.length > 0 ? Math.round(totalTokens / chunks.length) : 0,
      speakers,
      duration
    }
  };
}

// Busca chunks por critério temporal
export function findChunksByTimeRange(chunks: TranscriptChunk[], startTime: number, endTime: number): TranscriptChunk[] {
  return chunks.filter(chunk => 
    (chunk.startTime <= endTime && chunk.endTime >= startTime)
  );
}

// Busca chunks por speaker
export function findChunksBySpeaker(chunks: TranscriptChunk[], speaker: string): TranscriptChunk[] {
  return chunks.filter(chunk => 
    chunk.speakers.includes(speaker) || chunk.metadata.dominantSpeaker === speaker
  );
}

export type { TranscriptChunk, TranscriptSegment };