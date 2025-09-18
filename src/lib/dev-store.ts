// Simple in-memory store for dev/demo (no database required)

export type DevIcpFit = 'high' | 'medium' | 'low';

// Extend globalThis to include our dev store
declare global {
  var __devMeetings: DevMeetingItem[] | undefined;
}

export interface DevMeetingItem {
  id: string;
  title: string;
  startedAt: string; // ISO
  durationSeconds?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  seller?: { id?: string; fullName?: string; email?: string };
  analysis?: { 
    scriptScore: number; 
    icpFit: DevIcpFit;
    fullAnalysis?: any; // Análise completa do webhook
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
  urlFathom?: string;
  source: string;
  createdAt: number;
}

// Use globalThis para garantir persistência entre hot reloads em desenvolvimento
const getDevMeetingsStore = (): DevMeetingItem[] => {
  if (!globalThis.__devMeetings) {
    globalThis.__devMeetings = [];
  }
  return globalThis.__devMeetings;
};

const devMeetings = getDevMeetingsStore();

function genId() {
  return `dev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function addDevMeeting(params: {
  sellerName?: string;
  sellerEmail?: string;
  meetingDate: string; // ISO
  recordingUrl?: string;
  analysis?: {
    scriptScore: number;
    icpFit: DevIcpFit;
    fullAnalysis?: any;
  };
  title?: string;
}): DevMeetingItem {
  const id = genId();
  const item: DevMeetingItem = {
    id,
    title: params.title || `Reunião - ${params.sellerName || 'Vendedor'}`,
    startedAt: params.meetingDate,
    durationSeconds: undefined,
    status: params.analysis ? 'completed' : 'processing',
    seller: params.sellerEmail || params.sellerName ? {
      fullName: params.sellerName,
      email: params.sellerEmail,
    } : undefined,
    analysis: params.analysis,
    urlFathom: params.recordingUrl,
    source: 'n8n',
    createdAt: Date.now(),
  };

  devMeetings.push(item);
  // keep the list bounded to avoid unbounded memory in long sessions
  if (devMeetings.length > 200) devMeetings.shift();
  return item;
}

export function listDevMeetings(page: number = 1, limit: number = 20) {
  const sorted = [...devMeetings].sort((a, b) => b.createdAt - a.createdAt);
  const offset = (page - 1) * limit;
  const pageItems = sorted.slice(offset, offset + limit);
  return {
    meetings: pageItems,
    pagination: {
      total: sorted.length,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(sorted.length / limit)),
    },
  };
}

export function getDevMeeting(id: string): DevMeetingItem | null {
  return devMeetings.find(meeting => meeting.id === id) || null;
}

export function updateDevMeetingAnalysis(id: string, analysis: {
  scriptScore: number;
  icpFit: DevIcpFit;
  fullAnalysis?: any;
}): boolean {
  const meeting = devMeetings.find(m => m.id === id);
  if (!meeting) return false;
  
  meeting.analysis = analysis;
  meeting.status = 'completed';
  return true;
}

export function updateDevMeetingTranscript(id: string, transcript: {
  rawText: string;
  language?: string;
  segments?: Array<{
    speaker: string;
    text: string;
    start: number;
    end: number;
    confidence?: number;
  }>;
}): boolean {
  const meeting = devMeetings.find(m => m.id === id);
  if (!meeting) return false;
  
  meeting.transcript = {
    id: `${id}_transcript`,
    rawText: transcript.rawText,
    language: transcript.language || 'pt-BR',
    processed: true,
    speakers: [],
    segments: transcript.segments || [],
  };
  
  return true;
}

export function getDevStoreStats() {
  return {
    total: devMeetings.length,
    ids: devMeetings.map(m => m.id),
    lastCreated: devMeetings.length > 0 ? Math.max(...devMeetings.map(m => m.createdAt)) : 0
  };
}

