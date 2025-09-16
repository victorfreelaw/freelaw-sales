import { pgTable, uuid, text, timestamp, integer, json } from 'drizzle-orm/pg-core';
import { meetings } from './meetings';
import type { FullAnalysisReport } from '@/types/analysis';

export const analyses = pgTable('analyses', {
  id: uuid('id').primaryKey().defaultRandom(),
  meetingId: uuid('meeting_id').references(() => meetings.id, { onDelete: 'cascade' }).notNull(),
  scriptScore: integer('script_score').notNull(), // 0-100
  icpFit: text('icp_fit', { enum: ['high', 'medium', 'low'] }).notNull(),
  objections: json('objections').$type<Array<{
    type: string;
    text: string;
    timestamp: number;
    handled: boolean;
  }>>(),
  highlights: json('highlights').$type<Array<{
    type: 'buying_signal' | 'objection' | 'competitor' | 'budget' | 'timeline' | 'authority';
    text: string;
    timestamp: number;
    confidence: number;
  }>>(),
  summary: text('summary').notNull(),
  nextAction: text('next_action'),
  scriptChecklist: json('script_checklist').$type<{
    opening: boolean;
    agenda: boolean;
    qualification: boolean;
    pain_discovery: boolean;
    value_proposition: boolean;
    roi_discussion: boolean;
    next_steps: boolean;
  }>(),
  icpCriteria: json('icp_criteria').$type<{
    company_size: 'small' | 'medium' | 'large';
    revenue_range: string;
    case_volume: 'low' | 'medium' | 'high';
    pain_points: string[];
    region: string;
    acquisition_channel: string;
  }>(),
  fullReport: json('full_report').$type<FullAnalysisReport | null>().default(null),
  processingDurationMs: integer('processing_duration_ms'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
