import { pgTable, uuid, text, timestamp, boolean, json, integer } from 'drizzle-orm/pg-core';
import { meetings } from './meetings';

export const syncEvents = pgTable('sync_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  meetingId: uuid('meeting_id').references(() => meetings.id, { onDelete: 'cascade' }).notNull(),
  service: text('service', { enum: ['hubspot', 'slack'] }).notNull(),
  status: text('status', { enum: ['pending', 'completed', 'failed'] }).notNull(),
  hubspotStatus: text('hubspot_status', { enum: ['pending', 'completed', 'failed'] }),
  hubspotContactId: text('hubspot_contact_id'),
  hubspotCompanyId: text('hubspot_company_id'),
  hubspotDealId: text('hubspot_deal_id'),
  slackStatus: text('slack_status', { enum: ['pending', 'completed', 'failed'] }),
  slackChannelId: text('slack_channel_id'),
  slackMessageTs: text('slack_message_ts'),
  error: json('error').$type<{
    message: string;
    code?: string;
    details?: any;
  }>(),
  retryCount: integer('retry_count').default(0).notNull(),
  lastRetryAt: timestamp('last_retry_at', { withTimezone: true }),
  correlationId: uuid('correlation_id').defaultRandom().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});