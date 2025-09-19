import type { FullAnalysisReport } from '@/types/analysis';
import type { PipelineResult } from './analysis-pipeline';

export interface PersistableAnalysisData {
  scriptScore: number;
  icpFit: 'high' | 'medium' | 'low';
  summary: string;
  nextAction: string;
  objections: Array<{
    type: string;
    text: string;
    timestamp: number;
    handled: boolean;
  }>;
  fullReport: FullAnalysisReport;
  processingDurationMs: number;
  pipelineStats: PipelineResult['processingStats'];
}

export function buildPersistableAnalysis(
  result: PipelineResult
): PersistableAnalysisData {
  if (!result.success) {
    throw new Error('Pipeline result indicates failure');
  }

  const report = result.report;

  const rawScriptScore = report?.aderencia_ao_script?.score_geral ?? 0;
  const scriptScore = clampScore(rawScriptScore);

  const icpStatus = report?.analise_icp?.status ?? 'LOW';
  const icpFit = normalizeIcpStatus(icpStatus);

  const summary = report?.resumo_executivo?.trim() ?? '';
  const nextAction = report?.proxima_acao_recomendada?.acao?.trim() ?? '';

  const objectionsList = report?.analise_objecoes?.lista ?? [];
  const objections = objectionsList.map((item) => ({
    type: item.categoria,
    text: item.cliente_citacao_ampliada,
    timestamp: extractTimestampHint(item.cliente_citacao_ampliada),
    handled: (item.avaliacao_resposta?.nota ?? 0) >= 7,
  }));

  return {
    scriptScore,
    icpFit,
    summary,
    nextAction,
    objections,
    fullReport: report,
    processingDurationMs: result.processingStats.processingTime,
    pipelineStats: result.processingStats,
  };
}

function normalizeIcpStatus(status: string): 'high' | 'medium' | 'low' {
  switch (status.toUpperCase()) {
    case 'HIGH':
      return 'high';
    case 'MEDIUM':
      return 'medium';
    case 'LOW':
    default:
      return 'low';
  }
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

// Best-effort timestamp extraction (expects formats like [mm:ss] or mm:ss)
function extractTimestampHint(text: string): number {
  if (!text) return 0;

  const bracketMatch = text.match(/\[(\d{1,2}):(\d{2})(?::(\d{2}))?\]/);
  if (bracketMatch) {
    return timestampToSeconds(bracketMatch);
  }

  const inlineMatch = text.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (inlineMatch) {
    return timestampToSeconds(inlineMatch);
  }

  return 0;
}

function timestampToSeconds(match: RegExpMatchArray): number {
  const hours = match[3] ? Number(match[1]) : 0;
  const minutes = match[3] ? Number(match[2]) : Number(match[1]);
  const seconds = match[3] ? Number(match[3]) : Number(match[2]);
  return (hours * 3600) + (minutes * 60) + seconds;
}
