import { randomUUID } from 'crypto';
import { and, desc, eq } from 'drizzle-orm';
import { playbooks } from '@/db/schema';
import type { Playbook, PlaybookType } from '@/types/database';
import { SCRIPT_GUIDELINES, ICP_GUIDELINES } from '@/lib/analysis/guidelines';

type DrizzleDb = typeof import('@/db/connection').db;

const isDevStore =
  process.env.DEV_STORE_ENABLED === 'true' ||
  !process.env.DATABASE_URL ||
  process.env.DATABASE_URL.includes('fake');

let cachedDb: DrizzleDb | null = null;

async function getDb(): Promise<DrizzleDb> {
  if (!cachedDb) {
    const connection = await import('@/db/connection');
    cachedDb = connection.db;
  }
  return cachedDb;
}

let memoryPlaybooks: Playbook[] | null = null;

function ensureMemoryPlaybooks(): Playbook[] {
  if (!memoryPlaybooks) {
    const now = new Date();
    memoryPlaybooks = [
      {
        id: randomUUID(),
        type: 'script',
        title: 'Script Demo Freelaw (default)',
        description: 'Versão padrão carregada do repositório (DEV-store)',
        content: SCRIPT_GUIDELINES,
        status: 'active',
        createdBy: null,
        activatedAt: now,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: randomUUID(),
        type: 'icp',
        title: 'ICP Freelaw (default)',
        description: 'Perfil padrão carregado do repositório (DEV-store)',
        content: ICP_GUIDELINES,
        status: 'active',
        createdBy: null,
        activatedAt: now,
        createdAt: now,
        updatedAt: now,
      },
    ];
  }

  return memoryPlaybooks;
}

function listMemoryPlaybooks(type?: PlaybookType): Playbook[] {
  const items = ensureMemoryPlaybooks();
  const filtered = type ? items.filter((item) => item.type === type) : [...items];
  return filtered.sort((a, b) => {
    if (a.status === 'active' && b.status !== 'active') return -1;
    if (b.status === 'active' && a.status !== 'active') return 1;
    const aTimestamp = a.activatedAt ? a.activatedAt.getTime() : 0;
    const bTimestamp = b.activatedAt ? b.activatedAt.getTime() : 0;
    return bTimestamp - aTimestamp || b.updatedAt.getTime() - a.updatedAt.getTime();
  });
}

function createMemoryPlaybook(type: PlaybookType, input: CreatePlaybookInput): Playbook {
  const store = ensureMemoryPlaybooks();
  const now = new Date();

  if (input.makeActive) {
    for (const item of store) {
      if (item.type === type && item.status === 'active') {
        item.status = 'archived';
        item.activatedAt = null;
        item.updatedAt = now;
      }
    }
  }

  const playbook: Playbook = {
    id: randomUUID(),
    type,
    title: input.title,
    description: input.description ?? null,
    content: input.content,
    status: input.makeActive ? 'active' : 'draft',
    createdBy: input.createdBy ?? null,
    activatedAt: input.makeActive ? now : null,
    createdAt: now,
    updatedAt: now,
  };

  store.push(playbook);
  return playbook;
}

function setMemoryActive(type: PlaybookType, id: string): void {
  const store = ensureMemoryPlaybooks();
  const now = new Date();
  let target: Playbook | undefined;

  for (const item of store) {
    if (item.type !== type) continue;
    if (item.id === id) {
      item.status = 'active';
      item.activatedAt = now;
      item.updatedAt = now;
      target = item;
    } else if (item.status === 'active') {
      item.status = 'archived';
      item.activatedAt = null;
      item.updatedAt = now;
    }
  }

  if (!target) {
    throw new Error('Playbook não encontrado para ativação');
  }
}

function updateMemoryPlaybook(id: string, status: Playbook['status']): void {
  const store = ensureMemoryPlaybooks();
  const playbook = store.find((item) => item.id === id);
  if (!playbook) {
    throw new Error('Playbook não encontrado');
  }
  playbook.status = status;
  playbook.updatedAt = new Date();
}

function deleteMemoryPlaybook(id: string): void {
  const store = ensureMemoryPlaybooks();
  const index = store.findIndex((item) => item.id === id);
  if (index === -1) {
    throw new Error('Playbook não encontrado');
  }
  store.splice(index, 1);
}

async function listDbPlaybooks(type?: PlaybookType): Promise<Playbook[]> {
  const db = await getDb();
  let query = db
    .select()
    .from(playbooks)
    .orderBy(desc(playbooks.activatedAt), desc(playbooks.updatedAt));

  if (type) {
    query = query.where(eq(playbooks.type, type));
  }

  return query;
}

async function createDbPlaybook(type: PlaybookType, input: CreatePlaybookInput): Promise<Playbook> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const now = new Date();

    if (input.makeActive) {
      await tx
        .update(playbooks)
        .set({ status: 'archived', activatedAt: null, updatedAt: now })
        .where(and(eq(playbooks.type, type), eq(playbooks.status, 'active')));
    }

    const [created] = await tx
      .insert(playbooks)
      .values({
        type,
        title: input.title,
        description: input.description ?? null,
        content: input.content,
        status: input.makeActive ? 'active' : 'draft',
        activatedAt: input.makeActive ? now : null,
        createdBy: input.createdBy ?? null,
      })
      .returning();

    return created;
  });
}

async function setDbActive(type: PlaybookType, id: string): Promise<void> {
  const db = await getDb();
  await db.transaction(async (tx) => {
    const now = new Date();

    await tx
      .update(playbooks)
      .set({ status: 'archived', activatedAt: null, updatedAt: now })
      .where(and(eq(playbooks.type, type), eq(playbooks.status, 'active')));

    const [updated] = await tx
      .update(playbooks)
      .set({ status: 'active', activatedAt: now, updatedAt: now })
      .where(and(eq(playbooks.id, id), eq(playbooks.type, type)))
      .returning();

    if (!updated) {
      throw new Error('Playbook não encontrado para ativação');
    }
  });
}

async function updateDbPlaybookStatus(id: string, status: Playbook['status']): Promise<void> {
  const db = await getDb();
  const [result] = await db
    .update(playbooks)
    .set({ status, updatedAt: new Date() })
    .where(eq(playbooks.id, id))
    .returning();

  if (!result) {
    throw new Error('Playbook não encontrado');
  }
}

async function deleteDbPlaybook(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(playbooks).where(eq(playbooks.id, id));
}

export interface CreatePlaybookInput {
  title: string;
  description?: string | null;
  content: string;
  makeActive?: boolean;
  createdBy?: string | null;
}

export interface PlaybooksOverview {
  scripts: Playbook[];
  icps: Playbook[];
}

export async function listPlaybooks(type?: PlaybookType): Promise<Playbook[]> {
  if (isDevStore) {
    return listMemoryPlaybooks(type);
  }

  return listDbPlaybooks(type);
}

export async function getPlaybooksOverview(): Promise<PlaybooksOverview> {
  const [scripts, icps] = await Promise.all([listPlaybooks('script'), listPlaybooks('icp')]);
  return { scripts, icps };
}

export async function getPlaybookById(id: string): Promise<Playbook | null> {
  if (isDevStore) {
    const items = ensureMemoryPlaybooks();
    return items.find((item) => item.id === id) ?? null;
  }

  const db = await getDb();
  const [result] = await db
    .select()
    .from(playbooks)
    .where(eq(playbooks.id, id))
    .limit(1);

  return result ?? null;
}

export async function getActiveScript(): Promise<Playbook | null> {
  const scripts = await listPlaybooks('script');
  return scripts.find((item) => item.status === 'active') ?? scripts[0] ?? null;
}

export async function getActiveIcp(): Promise<Playbook | null> {
  const icps = await listPlaybooks('icp');
  return icps.find((item) => item.status === 'active') ?? icps[0] ?? null;
}

export async function createScriptPlaybook(input: CreatePlaybookInput): Promise<Playbook> {
  if (isDevStore) {
    return createMemoryPlaybook('script', input);
  }

  return createDbPlaybook('script', input);
}

export async function createIcpProfile(input: CreatePlaybookInput): Promise<Playbook> {
  if (isDevStore) {
    return createMemoryPlaybook('icp', input);
  }

  return createDbPlaybook('icp', input);
}

export async function setActiveScript(id: string): Promise<void> {
  if (isDevStore) {
    return setMemoryActive('script', id);
  }

  return setDbActive('script', id);
}

export async function setActiveIcp(id: string): Promise<void> {
  if (isDevStore) {
    return setMemoryActive('icp', id);
  }

  return setDbActive('icp', id);
}

export async function updatePlaybookStatus(
  id: string,
  status: Playbook['status']
): Promise<void> {
  if (isDevStore) {
    return updateMemoryPlaybook(id, status);
  }

  return updateDbPlaybookStatus(id, status);
}

export async function deletePlaybook(id: string): Promise<void> {
  if (isDevStore) {
    return deleteMemoryPlaybook(id);
  }

  return deleteDbPlaybook(id);
}
