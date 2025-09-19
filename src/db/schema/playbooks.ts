import { pgTable, uuid, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users';

export const playbookTypeEnum = pgEnum('playbook_type', ['script', 'icp']);
export const playbookStatusEnum = pgEnum('playbook_status', ['draft', 'active', 'archived']);

export const playbooks = pgTable('playbooks', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: playbookTypeEnum('type').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  content: text('content').notNull(),
  status: playbookStatusEnum('status').default('draft').notNull(),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  activatedAt: timestamp('activated_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
