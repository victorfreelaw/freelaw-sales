import { pgTable, uuid, text, timestamp, integer, boolean } from 'drizzle-orm/pg-core';
import { users } from './users';

export const meetings = pgTable('meetings', {
  id: uuid('id').primaryKey().defaultRandom(),
  sourceId: text('source_id').unique().notNull(), // Fathom meeting ID
  sellerId: uuid('seller_id').references(() => users.id).notNull(),
  organizationId: uuid('organization_id'),
  title: text('title'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  durationSeconds: integer('duration_seconds'),
  urlFathom: text('url_fathom'),
  status: text('status', { 
    enum: ['pending', 'processing', 'completed', 'failed'] 
  }).default('pending').notNull(),
  language: text('language').default('pt-BR'),
  source: text('source').default('fathom').notNull(),
  participantCount: integer('participant_count'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});