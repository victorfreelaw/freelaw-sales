'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Target,
  MessageSquare,
  TrendingUp,
  Users,
  Mail,
  Clock,
  Star
} from 'lucide-react';

interface EnhancedAnalysisProps {
  analysis: any; // Will be properly typed later
}

export function EnhancedAnalysis({ analysis }: EnhancedAnalysisProps) {
  if (!analysis) return null;

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high': return <Badge variant="destructive">Alta</Badge>;
      case 'medium': return <Badge variant="warning">Média</Badge>;
      case 'low': return <Badge variant="secondary">Baixa</Badge>;
      default: return <Badge variant="outline">{priority}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Script Analysis */}
      {analysis.scriptAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Aderência ao Script ({analysis.scriptAnalysis.script_score}/100)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Script Checklist */}
            {analysis.scriptAnalysis.checklist && (
              <div className="space-y-3">
                <h4 className="font-medium">Etapas do Script</h4>
                <div className="grid gap-2 text-sm">
                  {Object.entries(analysis.scriptAnalysis.checklist).map(([key, completed]: [string, boolean]) => (
                    <div key={key} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                      <span className="capitalize">{key.replace('_', ' ')}</span>
                      <div className="flex items-center gap-2">
                        {completed ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pontos Positivos */}
            {analysis.scriptAnalysis.strengths?.length > 0 && (
              <div>
                <h4 className="font-medium text-green-700 mb-2">✅ Pontos Positivos</h4>
                <ul className="text-sm space-y-1">
                  {analysis.scriptAnalysis.strengths.map((ponto: string, index: number) => (
                    <li key={index} className="text-muted-foreground">• {ponto}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Oportunidades de Melhoria */}
            {analysis.scriptAnalysis.opportunities?.length > 0 && (
              <div>
                <h4 className="font-medium text-yellow-700 mb-2">⚠️ Oportunidades de Melhoria</h4>
                <ul className="text-sm space-y-1">
                  {analysis.scriptAnalysis.opportunities.map((ponto: string, index: number) => (
                    <li key={index} className="text-muted-foreground">• {ponto}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Sugestões Práticas */}
            {analysis.scriptAnalysis.sugestoes_praticas?.length > 0 && (
              <div>
                <h4 className="font-medium text-blue-700 mb-2">💡 Sugestões Práticas</h4>
                <ul className="text-sm space-y-1">
                  {analysis.scriptAnalysis.sugestoes_praticas.map((sugestao: string, index: number) => (
                    <li key={index} className="text-muted-foreground">• {sugestao}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ICP Analysis */}
      {analysis.icpAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Análise de ICP
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <span>Fit:</span>
              <Badge variant={
                analysis.icpAnalysis.icp_fit === 'high' ? 'success' : 
                analysis.icpAnalysis.icp_fit === 'medium' ? 'warning' : 'destructive'
              }>
                {analysis.icpAnalysis.icp_fit.toUpperCase()}
              </Badge>
            </div>

            {/* Reasoning */}
            {analysis.icpAnalysis.reasoning && (
              <div className="bg-muted/30 p-3 rounded-lg">
                <h4 className="font-medium mb-2">Análise</h4>
                <p className="text-sm text-muted-foreground">{analysis.icpAnalysis.reasoning}</p>
              </div>
            )}

            {/* Critérios */}
            {analysis.icpAnalysis.criteria && (
              <div>
                <h4 className="font-medium mb-2">Critérios Identificados</h4>
                <div className="grid gap-2 text-sm">
                  {Object.entries(analysis.icpAnalysis.criteria).map(([key, value]: [string, any]) => (
                    <div key={key} className="p-2 bg-muted/30 rounded">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium capitalize">{key.replace('_', ' ')}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {Array.isArray(value) ? value.join(', ') : value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Score Breakdown */}
            {analysis.icpAnalysis.score_breakdown && (
              <div>
                <h4 className="font-medium mb-2">Breakdown de Pontuação</h4>
                <div className="grid gap-2 text-sm">
                  {Object.entries(analysis.icpAnalysis.score_breakdown).map(([key, score]: [string, number]) => (
                    <div key={key} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                      <span className="capitalize">{key.replace('_', ' ')}</span>
                      <span className="font-medium">{score}/20</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recomendação */}
            {analysis.icpAnalysis.recomendacao && (
              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium">Vale insistir?</span>
                  {analysis.icpAnalysis.recomendacao.vale_insistir ? (
                    <Badge variant="success">Sim</Badge>
                  ) : (
                    <Badge variant="destructive">Não</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-2">{analysis.icpAnalysis.recomendacao.motivo}</p>
                <p className="text-sm font-medium">Próximos passos: {analysis.icpAnalysis.recomendacao.proximos_passos}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Highlights & Objections Analysis */}
      {(analysis.highlights || analysis.objectionsAnalysis) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Highlights e Objeções
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary Bullets */}
            {analysis.highlights?.summary_bullets && (
              <div className="bg-muted/30 p-3 rounded-lg">
                <h4 className="font-medium mb-2">Resumo da Reunião</h4>
                <ul className="text-sm space-y-1">
                  {analysis.highlights.summary_bullets.map((bullet: string, index: number) => (
                    <li key={index} className="text-muted-foreground">• {bullet}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Highlights */}
            {analysis.highlights?.highlights && analysis.highlights.highlights.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Highlights da Reunião</h4>
                <div className="space-y-2">
                  {analysis.highlights.highlights.map((highlight: any, index: number) => (
                    <div key={index} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">{highlight.type}</Badge>
                        <span className="text-xs text-muted-foreground">{highlight.timestamp_estimate}</span>
                      </div>
                      <p className="text-sm">{highlight.text}</p>
                      {highlight.context && (
                        <p className="text-xs text-muted-foreground italic">{highlight.context}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Objections */}
            {analysis.highlights?.objections && analysis.highlights.objections.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Objeções Identificadas</h4>
                <div className="space-y-2">
                  {analysis.highlights.objections.map((objection: any, index: number) => (
                    <div key={index} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">{objection.type}</Badge>
                        {objection.handled ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                      <p className="text-sm">{objection.text}</p>
                      <p className="text-xs text-muted-foreground">
                        {objection.handled ? 'Tratada adequadamente' : 'Necessita atenção'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </CardContent>
        </Card>
      )}

      {/* Next Actions */}
      {analysis.nextAction && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Próximas Ações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Main Action */}
            <div className="bg-muted/30 p-3 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Ação Recomendada</h4>
                <div className="flex items-center gap-2">
                  {getPriorityBadge(analysis.nextAction.priority)}
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {analysis.nextAction.timeline}
                  </div>
                </div>
              </div>
              <p className="text-sm font-medium mb-2">{analysis.nextAction.next_action}</p>
              <p className="text-sm text-muted-foreground">{analysis.nextAction.reasoning}</p>
            </div>

            {/* Follow-up Template */}
            {analysis.nextAction.follow_up_template && (
              <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
                <h4 className="font-medium mb-2">Template de Follow-up</h4>
                <p className="text-sm text-muted-foreground italic">"{analysis.nextAction.follow_up_template}"</p>
              </div>
            )}

            {/* Personalized Message */}
            {analysis.nextAction.personalized_message && (
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Mensagem Personalizada
                </h4>
                <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
                  <p className="font-medium text-sm mb-1">Assunto: {analysis.nextAction.personalized_message.subject}</p>
                  <p className="text-sm">{analysis.nextAction.personalized_message.message}</p>
                </div>
              </div>
            )}

            {/* Follow-up Checklist */}
            {analysis.nextAction.follow_up_checklist?.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Checklist de Follow-up</h4>
                <ul className="text-sm space-y-1">
                  {analysis.nextAction.follow_up_checklist.map((item: string, index: number) => (
                    <li key={index} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Sales Strategy */}
            {analysis.nextAction.sales_strategy && (
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Estratégia de Vendas
                </h4>
                <div className="grid gap-3 text-sm">
                  {analysis.nextAction.sales_strategy.focus_areas?.length > 0 && (
                    <div>
                      <span className="font-medium">Focar em:</span>
                      <ul className="mt-1">
                        {analysis.nextAction.sales_strategy.focus_areas.map((area: string, index: number) => (
                          <li key={index} className="text-muted-foreground">• {area}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {analysis.nextAction.sales_strategy.objections_to_address?.length > 0 && (
                    <div>
                      <span className="font-medium">Objeções a abordar:</span>
                      <ul className="mt-1">
                        {analysis.nextAction.sales_strategy.objections_to_address.map((obj: string, index: number) => (
                          <li key={index} className="text-muted-foreground">• {obj}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {analysis.nextAction.sales_strategy.value_props_to_emphasize?.length > 0 && (
                    <div>
                      <span className="font-medium">Benefícios a enfatizar:</span>
                      <ul className="mt-1">
                        {analysis.nextAction.sales_strategy.value_props_to_emphasize.map((prop: string, index: number) => (
                          <li key={index} className="text-muted-foreground">• {prop}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}