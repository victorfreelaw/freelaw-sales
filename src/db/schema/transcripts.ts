import { pgTable, uuid, text, timestamp, boolean, json } from 'drizzle-orm/pg-core';
import { meetings } from './meetings';

export const transcripts = pgTable('transcripts', {
  id: uuid('id').primaryKey().defaultRandom(),
  meetingId: uuid('meeting_id').references(() => meetings.id, { onDelete: 'cascade' }).notNull(),
  language: text('language').default('pt-BR').notNull(),
  rawText: text('raw_text'),
  processedText: text('processed_text'),
  speakers: json('speakers').$type<Array<{ id: string; name?: string; email?: string }>>(),
  segments: json('segments').$type<Array<{
    speaker: string;
    text: string;
    start: number;
    end: number;
    confidence?: number;
  }>>(),
  processed: boolean('processed').default(false).notNull(),
  processingError: text('processing_error'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});