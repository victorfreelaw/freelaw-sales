import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import {
  getPlaybookById,
  updatePlaybookStatus,
} from '@/lib/playbooks-data';

const updateSchema = z.object({
  status: z.enum(['draft', 'active', 'archived']).optional(),
});

interface RouteContext {
  params: { id: string };
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = context.params;
    if (!id) {
      return NextResponse.json({ error: 'Playbook não informado' }, { status: 400 });
    }

    const body = await request.json();
    const data = updateSchema.parse(body);

    if (data.status) {
      await updatePlaybookStatus(id, data.status);
    }

    const updated = await getPlaybookById(id);
    if (!updated) {
      return NextResponse.json({ error: 'Playbook não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ playbook: updated });
  } catch (error) {
    console.error('Playbooks PATCH error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Payload inválido', details: error.flatten() },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
