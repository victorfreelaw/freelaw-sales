import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import {
  users,
  meetings,
  transcripts,
  analyses,
  syncEvents,
  playbooks,
} from '@/db/schema';

// User types
export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

// Meeting types
export type Meeting = InferSelectModel<typeof meetings>;
export type NewMeeting = InferInsertModel<typeof meetings>;

// Transcript types
export type Transcript = InferSelectModel<typeof transcripts>;
export type NewTranscript = InferInsertModel<typeof transcripts>;

// Analysis types
export type Analysis = InferSelectModel<typeof analyses>;
export type NewAnalysis = InferInsertModel<typeof analyses>;

// Sync event types
export type SyncEvent = InferSelectModel<typeof syncEvents>;
export type NewSyncEvent = InferInsertModel<typeof syncEvents>;

// Playbook types
export type Playbook = InferSelectModel<typeof playbooks>;
export type NewPlaybook = InferInsertModel<typeof playbooks>;

// Extended types with relations
export type MeetingWithAnalysis = Meeting & {
  analysis?: Analysis;
  transcript?: Transcript;
  seller?: User;
};

export type AnalysisWithMeeting = Analysis & {
  meeting: Meeting & {
    seller: User;
  };
};

// Enums
export type UserRole = 'admin' | 'lead' | 'rep';
export type MeetingStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type ICPFit = 'high' | 'medium' | 'low';
export type SyncStatus = 'pending' | 'completed' | 'failed';
export type HighlightType = 'buying_signal' | 'objection' | 'competitor' | 'budget' | 'timeline' | 'authority';
export type PlaybookType = 'script' | 'icp';
