import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type {
  FullAnalysisReport,
  ScriptStageEvaluation,
  ScriptStageId,
  ObjectionAnalysisItem,
} from '@/types/analysis';
import {
  CheckCircle2,
  Flame,
  LineChart,
  MessageSquareWarning,
  Star,
  Target,
  ClipboardList,
  Mail,
} from 'lucide-react';

interface FullAnalysisReportViewProps {
  report: FullAnalysisReport;
  scriptScore: number;
  icpFit: 'high' | 'medium' | 'low';
}

const STAGE_LABELS: Record<ScriptStageId, string> = {
  introducao: '1. Introdução',
  exploracao_cenario: '2. Exploração do Cenário',
  apresentacao_freelaw: '3. Apresentação da Freelaw',
  beneficios_escritorio: '4. Benefícios para o Escritório',
  metodologia: '5. Metodologia',
  como_funciona_delegacao: '6. Como Funciona a Delegação',
  conversa_com_prestador: '7. Conversa com o Prestador',
  plano_ideal: '8. Plano Ideal',
  encerramento_follow_up: '9. Encerramento e Follow-up',
};

const fitVariant = {
  high: 'success',
  medium: 'warning',
  low: 'destructive',
} as const;

function StageCard({ stageId, data }: { stageId: ScriptStageId; data: ScriptStageEvaluation }) {
  return (
    <Card key={stageId} className="border-muted/60">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle className="text-base font-semibold">
          {STAGE_LABELS[stageId]}
        </CardTitle>
        <Badge variant={data.nota >= 7 ? 'success' : data.nota >= 5 ? 'warning' : 'destructive'}>
          {data.nota.toFixed(1)}/10
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-muted-foreground leading-relaxed">{data.justificativa}</p>
        <div>
          <h4 className="font-medium text-foreground">Evidências que sustentam a nota</h4>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            {data.evidencias_que_sustentam.map((evidencia, index) => (
              <li key={index}>• {evidencia}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-medium text-foreground">O que faltou para 10/10</h4>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            {data.faltou_para_10.map((item, index) => (
              <li key={index}>☐ {item}</li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

function ObjectionCard({ item }: { item: ObjectionAnalysisItem }) {
  return (
    <Card className="border-muted/60">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <MessageSquareWarning className="h-4 w-4" />
          {item.categoria.toUpperCase()}
        </CardTitle>
        <Badge variant={item.avaliacao_resposta.nota >= 7 ? 'success' : 'warning'}>
          Resposta {item.avaliacao_resposta.nota.toFixed(1)}/10
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div>
          <h4 className="font-medium text-foreground">Citação do cliente</h4>
          <p className="mt-1 text-muted-foreground whitespace-pre-line">{item.cliente_citacao_ampliada}</p>
        </div>
        <div>
          <h4 className="font-medium text-foreground">Resposta do vendedor</h4>
          <p className="mt-1 text-muted-foreground whitespace-pre-line">{item.resposta_vendedor_citacao}</p>
        </div>
        <div>
          <h4 className="font-medium text-foreground">Avaliação</h4>
          <p className="mt-1 text-muted-foreground">{item.avaliacao_resposta.racional}</p>
        </div>
        <Separator />
        <div>
          <h4 className="font-medium text-foreground">Resposta sugerida</h4>
          <p className="mt-1 text-foreground">{item.resposta_sugerida.texto}</p>
          <p className="mt-1 text-muted-foreground">Por que funciona: {item.resposta_sugerida.por_que_funciona}</p>
        </div>
        <div>
          <h4 className="font-medium text-foreground">Próximo passo dentro da demo</h4>
          <p className="mt-1 text-muted-foreground">{item.proximo_passo_demo}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function FullAnalysisReportView({ report, scriptScore, icpFit }: FullAnalysisReportViewProps) {
  if (!report) return null;

  const stageEntries = report?.aderencia_ao_script?.etapas
    ? (Object.entries(report.aderencia_ao_script.etapas) as [ScriptStageId, ScriptStageEvaluation][])
    : [];
  const objections = report?.analise_objecoes?.lista ?? [];
  const objectionKpis = report?.analise_objecoes?.kpis;

  return (
    <div className="space-y-8">
      <section id="aderencia-script" className="space-y-4">
        <div className="flex items-center gap-3">
          <Star className="h-5 w-5 text-freelaw-primary" />
          <h2 className="text-xl font-semibold text-freelaw-primary">Aderência ao Script</h2>
          <Badge variant={scriptScore >= 70 ? 'success' : scriptScore >= 50 ? 'warning' : 'destructive'}>
            {scriptScore}/100
          </Badge>
        </div>
        <div className="grid gap-4">
          {stageEntries.length > 0 ? (
            stageEntries.map(([stageId, data]) => (
              <StageCard key={stageId} stageId={stageId} data={data} />
            ))
          ) : (
            <Card className="border-muted/60">
              <CardContent className="py-6 text-sm text-muted-foreground">
                Dados de aderência indisponíveis nesta análise.
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {report?.analise_icp ? (
        <section id="analise-icp" className="space-y-4">
        <div className="flex items-center gap-3">
          <Target className="h-5 w-5 text-freelaw-primary" />
          <h2 className="text-xl font-semibold text-freelaw-primary">Análise de ICP</h2>
          <Badge variant={fitVariant[icpFit] ?? 'secondary'}>{report.analise_icp.status}</Badge>
          <Badge variant="outline">{report.analise_icp.score_geral}/100</Badge>
        </div>
        <Card className="border-muted/60">
          <CardContent className="p-4 grid gap-4">
            {Object.entries(report.analise_icp.criterios).map(([criterio, data]) => (
              <div key={criterio} className="rounded-lg border border-muted/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold capitalize">{criterio.replace(/_/g, ' ')}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={data.classificacao === 'alto' ? 'success' : data.classificacao === 'medio' ? 'warning' : data.classificacao === 'baixo' ? 'destructive' : 'secondary'}>
                      {data.classificacao.toUpperCase()}
                    </Badge>
                    <Badge variant="outline">{data.nota}/20</Badge>
                  </div>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{data.evidencia}</p>
              </div>
            ))}
            <div className="rounded-lg bg-muted/30 p-4">
              <h4 className="font-medium text-foreground">Vale insistir?</h4>
              <p className="mt-1 text-sm text-muted-foreground">{report.analise_icp.vale_insistir.recomendacao}</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {report.analise_icp.vale_insistir.condicoes.map((condicao, index) => (
                  <li key={index}>• {condicao}</li>
                ))}
              </ul>
              {report.analise_icp.observacoes && (
                <p className="mt-2 text-xs text-muted-foreground">Obs.: {report.analise_icp.observacoes}</p>
              )}
            </div>
          </CardContent>
        </Card>
        </section>
      ) : null}

      <section id="analise-objeções" className="space-y-4">
        <div className="flex items-center gap-3">
          <MessageSquareWarning className="h-5 w-5 text-freelaw-primary" />
          <h2 className="text-xl font-semibold text-freelaw-primary">Análise de Objeções</h2>
          <Badge variant="outline">Total {objectionKpis?.total ?? 0}</Badge>
        </div>
        {objections.length > 0 ? (
          <div className="grid gap-4">
            {objections.map((obj, index) => (
              <ObjectionCard key={index} item={obj} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma objeção identificada.</p>
        )}
        {objectionKpis ? (
          <Card className="border-muted/60">
            <CardContent className="p-4 grid gap-2 text-sm text-muted-foreground">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>Total tratadas efetivamente</span>
                <Badge variant="success">{objectionKpis.tratadas_efetivamente}</Badge>
              </div>
              <div>
                <span className="font-medium text-foreground">Score médio por categoria</span>
                <ul className="mt-1 space-y-1">
                  {Object.entries(objectionKpis.score_medio_por_categoria).map(([categoria, score]) => (
                    <li key={categoria}>{categoria}: {score.toFixed(1)}</li>
                  ))}
                </ul>
              </div>
              <div>
                <span className="font-medium text-foreground">Principais lacunas</span>
                <ul className="mt-1 space-y-1">
                  {objectionKpis.principais_lacunas.map((lacuna, index) => (
                    <li key={index}>• {lacuna}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </section>

      <section id="pontos" className="grid gap-4 lg:grid-cols-3">
        <Card className="border-muted/60">
          <CardHeader className="flex flex-row items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-freelaw-success" />
            <CardTitle className="text-base font-semibold">Pontos Positivos</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            {(report.pontos_positivos ?? []).length > 0 ? (
              report.pontos_positivos.map((ponto, index) => (
                <div key={index}>• {ponto}</div>
              ))
            ) : (
              <p className="text-muted-foreground">Sem destaques registrados.</p>
            )}
          </CardContent>
        </Card>
        <Card className="border-muted/60">
          <CardHeader className="flex flex-row items-center gap-2">
            <Flame className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-base font-semibold">Pontos a Melhorar</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            {(report.pontos_a_melhorar ?? []).length > 0 ? (
              report.pontos_a_melhorar.map((ponto, index) => (
                <div key={index}>• {ponto}</div>
              ))
            ) : (
              <p className="text-muted-foreground">Nenhum ponto crítico mapeado.</p>
            )}
          </CardContent>
        </Card>
        <Card className="border-muted/60">
          <CardHeader className="flex flex-row items-center gap-2">
            <LineChart className="h-5 w-5 text-freelaw-primary" />
            <CardTitle className="text-base font-semibold">Sugestões Práticas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {(report.sugestoes_praticas ?? []).length > 0 ? (
              report.sugestoes_praticas.map((sugestao, index) => (
                <div key={index} className="rounded-lg border border-muted/60 p-3">
                  <p className="font-medium text-foreground">{sugestao.sugestao}</p>
                  {sugestao.impacto && (
                    <p className="text-xs text-muted-foreground mt-1">Impacto: {sugestao.impacto}</p>
                  )}
                  <ul className="mt-2 space-y-1 text-muted-foreground">
                    {sugestao.como_executar.map((passo, passoIndex) => (
                      <li key={passoIndex}>{passo}</li>
                    ))}
                  </ul>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">Nenhuma sugestão prática registrada.</p>
            )}
          </CardContent>
        </Card>
      </section>

      <section id="resumo" className="space-y-4">
        <Card className="border-muted/60">
          <CardHeader className="flex flex-row items-center gap-2">
            <Star className="h-5 w-5 text-freelaw-primary" />
            <CardTitle className="text-base font-semibold">Resumo Executivo</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground whitespace-pre-line">
            {report.resumo_executivo}
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-muted/60">
            <CardHeader className="flex flex-row items-center gap-2">
              <ClipboardList className="h-5 w-5 text-freelaw-primary" />
              <CardTitle className="text-base font-semibold">Próxima Ação Recomendada</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p className="text-foreground font-medium">{report.proxima_acao_recomendada?.acao ?? 'Ação não informada.'}</p>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Prazo: {report.proxima_acao_recomendada?.prazo ?? 'Sem prazo'}</Badge>
              </div>
              <p>{report.proxima_acao_recomendada?.racional ?? 'Sem racional informado.'}</p>
              {report.proxima_acao_recomendada?.condicoes?.length ? (
                <div>
                  <span className="font-medium text-foreground">Condições:</span>
                  <ul className="mt-1 space-y-1">
                    {report.proxima_acao_recomendada.condicoes.map((condicao, index) => (
                      <li key={index}>• {condicao}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-muted/60">
            <CardHeader className="flex flex-row items-center gap-2">
              <Mail className="h-5 w-5 text-freelaw-primary" />
              <CardTitle className="text-base font-semibold">Mensagem Sugerida</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p className="text-foreground whitespace-pre-line">{report.mensagem_sugerida?.texto ?? 'Mensagem não fornecida.'}</p>
              <p className="text-xs">Por que funciona: {report.mensagem_sugerida?.por_que_funciona ?? 'Sem justificativa.'}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-muted/60">
          <CardHeader className="flex flex-row items-center gap-2">
            <ClipboardList className="h-5 w-5 text-freelaw-primary" />
            <CardTitle className="text-base font-semibold">Checklist de Follow-up</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            {(report.checklist_follow_up ?? []).length > 0 ? (
              report.checklist_follow_up.map((item, index) => (
                <div key={index}>☑︎ {item}</div>
              ))
            ) : (
              <p className="text-muted-foreground">Checklist não preenchido.</p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
