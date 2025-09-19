import { revalidatePath } from 'next/cache';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  createScriptPlaybook,
  createIcpProfile,
  getPlaybooksOverview,
  setActiveScript,
  setActiveIcp,
  deletePlaybook,
} from '@/lib/playbooks-data';
import { cn } from '@/lib/utils';
import type { Playbook } from '@/types/database';
import {
  BookOpen,
  Target,
  CheckCircle2,
  FileText,
  CalendarClock,
  Trash2,
} from 'lucide-react';
import { CreatePlaybookToolbar } from '@/components/playbooks/create-playbook-toolbar';

const PLAYBOOKS_PATH = '/playbooks';

function truncate(text: string, maxLength: number) {
  if (!text) return '';
  return text.length <= maxLength ? text : `${text.slice(0, maxLength)}…`;
}

const createScriptAction = async (formData: FormData) => {
  'use server';

  const title = formData.get('title')?.toString().trim();
  const description = formData.get('description')?.toString().trim() || null;
  const content = formData.get('content')?.toString().trim();
  const makeActive = formData.get('makeActive') === 'on';

  if (!title || !content) {
    throw new Error('Nome e conteúdo do script são obrigatórios.');
  }

  await createScriptPlaybook({ title, description, content, makeActive });
  revalidatePath(PLAYBOOKS_PATH);
};

const createIcpAction = async (formData: FormData) => {
  'use server';

  const title = formData.get('title')?.toString().trim();
  const description = formData.get('description')?.toString().trim() || null;
  const content = formData.get('content')?.toString().trim();
  const makeActive = formData.get('makeActive') === 'on';

  if (!title || !content) {
    throw new Error('Nome e conteúdo do ICP são obrigatórios.');
  }

  await createIcpProfile({ title, description, content, makeActive });
  revalidatePath(PLAYBOOKS_PATH);
};

const activateScriptAction = async (formData: FormData) => {
  'use server';
  const scriptId = formData.get('scriptId')?.toString();
  if (!scriptId) {
    throw new Error('ID do script não informado.');
  }
  await setActiveScript(scriptId);
  revalidatePath(PLAYBOOKS_PATH);
};

const activateIcpAction = async (formData: FormData) => {
  'use server';
  const icpId = formData.get('icpId')?.toString();
  if (!icpId) {
    throw new Error('ID do ICP não informado.');
  }
  await setActiveIcp(icpId);
  revalidatePath(PLAYBOOKS_PATH);
};

const deletePlaybookAction = async (formData: FormData) => {
  'use server';
  const playbookId = formData.get('playbookId')?.toString();
  if (!playbookId) {
    throw new Error('ID do playbook não informado.');
  }
  await deletePlaybook(playbookId);
  revalidatePath(PLAYBOOKS_PATH);
};

function formatDate(value: string | Date | null | undefined) {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function ContentPreview({ label, content }: { label: string; content: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <FileText className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="text-sm text-muted-foreground whitespace-pre-line border border-dashed border-muted rounded-md p-3 bg-muted/20">
        {truncate(content, 600)}
      </p>
    </div>
  );
}

function PlaybookList({
  title,
  description,
  items,
  kind,
}: {
  title: string;
  description: string;
  items: Playbook[];
  kind: 'script' | 'icp';
}) {
  const filteredItems = items.filter((item) => item.type === kind);
  const visibleItems = filteredItems.filter((item) => item.status !== 'archived');
  const archivedItems = filteredItems.filter((item) => item.status === 'archived');
  const hasItems = visibleItems.length > 0;

  const renderPlaybook = (item: Playbook) => {
    const isActive = item.status === 'active';
    const statusVariant = isActive
      ? 'success'
      : item.status === 'draft'
        ? 'secondary'
        : 'outline';
    const statusLabel = isActive
      ? 'Ativo nas análises'
      : item.status === 'draft'
        ? 'Rascunho'
        : 'Arquivado';
    const referenceDate = isActive ? item.activatedAt || item.updatedAt : item.updatedAt;
    const dateLabel = isActive ? 'Ativado em' : 'Atualizado em';

    return (
      <div key={item.id} className="rounded-lg border border-muted/60 p-4 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
            {item.description ? (
              <p className="text-sm text-muted-foreground">{item.description}</p>
            ) : null}
          </div>
          <Badge variant={statusVariant}>{statusLabel}</Badge>
        </div>
        <ContentPreview label="Resumo" content={item.content} />
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CalendarClock className="h-3.5 w-3.5" />
            {dateLabel} {formatDate(referenceDate)}
          </span>
          <div className="flex flex-wrap gap-2">
            {!isActive ? (
              <form action={kind === 'script' ? activateScriptAction : activateIcpAction}>
                <input type="hidden" name={kind === 'script' ? 'scriptId' : 'icpId'} value={item.id} />
                <Button variant="outline" size="sm">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Tornar ativo
                </Button>
              </form>
            ) : (
              <span className="font-medium text-foreground">Em uso nas análises</span>
            )}
            <form action={deletePlaybookAction}>
              <input type="hidden" name="playbookId" value={item.id} />
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          {kind === 'script' ? <BookOpen className="h-5 w-5" /> : <Target className="h-5 w-5" />}
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className={cn('space-y-4', !hasItems && 'pb-10')}>
        {hasItems ? (
          visibleItems.map(renderPlaybook)
        ) : (
          <div className="rounded-lg border border-dashed border-muted px-4 py-6 text-center text-sm text-muted-foreground">
            Nenhum {kind === 'script' ? 'script' : 'ICP'} cadastrado ainda.
            <br />
            Utilize o formulário ao lado para criar o primeiro.
          </div>
        )}

        {archivedItems.length > 0 ? (
          <details className="rounded-lg border border-dashed border-muted px-4 py-3">
            <summary className="flex cursor-pointer items-center justify-between text-sm font-medium text-muted-foreground">
              <span>Playbooks arquivados ({archivedItems.length})</span>
              <span className="text-xs uppercase tracking-wide">exibir/ocultar</span>
            </summary>
            <div className="mt-3 space-y-4">
              {archivedItems.map(renderPlaybook)}
            </div>
          </details>
        ) : null}
      </CardContent>
    </Card>
  );
}

function CreatePlaybookForm({
  kind,
}: {
  kind: 'script' | 'icp';
}) {
  const action = kind === 'script' ? createScriptAction : createIcpAction;

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${kind}-title`}>Nome</Label>
        <Input id={`${kind}-title`} name="title" placeholder="Ex.: Script Demo v3" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${kind}-description`}>Descrição (opcional)</Label>
        <Input id={`${kind}-description`} name="description" placeholder="Ex.: Atualização com foco em ROI" />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${kind}-content`}>Conteúdo completo</Label>
        <textarea
          id={`${kind}-content`}
          name="content"
          required
          rows={10}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-freelaw-primary"
          placeholder={kind === 'script' ? 'Cole aqui o roteiro completo da demo...' : 'Cole aqui o ICP completo com critérios e thresholds...'}
        />
        <p className="text-xs text-muted-foreground">
          Este conteúdo será enviado para o modelo durante as análises. Utilize texto puro.
        </p>
      </div>
      <Separator />
      <div className="flex items-center gap-2">
        <input id={`${kind}-make-active`} name="makeActive" type="checkbox" className="h-4 w-4" />
        <Label htmlFor={`${kind}-make-active`} className="text-sm text-muted-foreground">
          Tornar ativo imediatamente
        </Label>
      </div>
      <div className="flex justify-end">
        <Button type="submit">
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Salvar
        </Button>
      </div>
    </form>
  );
}

export default async function PlaybooksPage() {
  const { scripts, icps } = await getPlaybooksOverview();
  const activeScripts = scripts.filter((script) => script.status === 'active').length;
  const activeIcps = icps.filter((icp) => icp.status === 'active').length;

  return (
    <MainLayout>
      <div className="space-y-8">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-freelaw-primary">Playbooks</h1>
            <p className="text-muted-foreground mt-2">
              Cadastre scripts e perfis de ICP. Somente os playbooks ativos são usados nas análises automáticas.
            </p>
          </div>
        </header>

        <CreatePlaybookToolbar
          scriptForm={<CreatePlaybookForm kind="script" />}
          icpForm={<CreatePlaybookForm kind="icp" />}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Scripts ativos</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeScripts}</div>
              <p className="text-xs text-muted-foreground">Somente scripts ativos entram no prompt da IA</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ICPs ativos</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeIcps}</div>
              <p className="text-xs text-muted-foreground">Critérios ativos orientam a avaliação de fit</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <PlaybookList
              title="Scripts de vendas"
              description="Versões disponíveis do roteiro oficial da demo"
              items={scripts}
              kind="script"
            />
          </div>
          <div className="space-y-6">
            <PlaybookList
              title="Perfis ICP"
              description="Estruturas de cliente ideal que alimentam as análises"
              items={icps}
              kind="icp"
            />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
