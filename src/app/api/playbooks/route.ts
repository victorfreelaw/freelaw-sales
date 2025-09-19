import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import {
  listPlaybooks,
  createScriptPlaybook,
  createIcpProfile,
} from '@/lib/playbooks-data';

const createSchema = z.object({
  type: z.enum(['script', 'icp']),
  title: z.string().min(3, 'Título deve ter pelo menos 3 caracteres'),
  description: z.string().nullable().optional(),
  content: z.string().min(20, 'Conteúdo deve ter pelo menos 20 caracteres'),
  makeActive: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const typeParam = searchParams.get('type');

    if (typeParam && typeParam !== 'script' && typeParam !== 'icp') {
      return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
    }

    const playbooks = await listPlaybooks(typeParam as 'script' | 'icp' | undefined);

    return NextResponse.json({ playbooks });
  } catch (error) {
    console.error('Playbooks GET error:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = createSchema.parse(body);

    const payload = {
      title: data.title,
      description: data.description ?? null,
      content: data.content,
      makeActive: data.makeActive ?? false,
      createdBy: user.id,
    };

    const created = data.type === 'script'
      ? await createScriptPlaybook(payload)
      : await createIcpProfile(payload);

    return NextResponse.json({ playbook: created }, { status: 201 });
  } catch (error) {
    console.error('Playbooks POST error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Payload inválido', details: error.flatten() },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
