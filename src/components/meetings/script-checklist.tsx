import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Circle } from 'lucide-react';

interface ScriptChecklistProps {
  checklist: {
    opening: boolean;
    agenda: boolean;
    qualification: boolean;
    pain_discovery: boolean;
    value_proposition: boolean;
    roi_discussion: boolean;
    next_steps: boolean;
  };
  score: number;
}

const checklistItems = [
  {
    key: 'opening' as const,
    label: 'Abertura',
    description: 'Apresentação profissional e agradecimento',
    weight: 20,
  },
  {
    key: 'agenda' as const,
    label: 'Agenda',
    description: 'Definição clara dos objetivos da reunião',
    weight: 15,
  },
  {
    key: 'qualification' as const,
    label: 'Qualificação',
    description: 'Perguntas sobre perfil e especialidades',
    weight: 20,
  },
  {
    key: 'pain_discovery' as const,
    label: 'Descoberta de Dor',
    description: 'Identificação de problemas e desafios',
    weight: 25,
  },
  {
    key: 'value_proposition' as const,
    label: 'Proposta de Valor',
    description: 'Conexão das dores com soluções',
    weight: 15,
  },
  {
    key: 'roi_discussion' as const,
    label: 'Discussão de ROI',
    description: 'Apresentação de benefícios financeiros',
    weight: 10,
  },
  {
    key: 'next_steps' as const,
    label: 'Próximos Passos',
    description: 'Definição clara de follow-up',
    weight: 15,
  },
];

export function ScriptChecklist({ checklist, score }: ScriptChecklistProps) {
  const completedItems = Object.values(checklist).filter(Boolean).length;
  const totalItems = Object.keys(checklist).length;
  
  const getScoreBadgeVariant = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Aderência ao Script
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={getScoreBadgeVariant(score)}>
              {score}/100
            </Badge>
            <Badge variant="outline">
              {completedItems}/{totalItems} itens
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {checklistItems.map((item) => {
            const isCompleted = checklist[item.key];
            
            return (
              <div
                key={item.key}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                  isCompleted
                    ? 'bg-freelaw-success/5 border-freelaw-success/20'
                    : 'bg-muted/30 border-border'
                }`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-freelaw-success" />
                  ) : (
                    <XCircle className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className={`font-medium ${
                      isCompleted ? 'text-freelaw-success' : 'text-foreground'
                    }`}>
                      {item.label}
                    </h4>
                    <span className="text-xs text-muted-foreground">
                      {item.weight} pontos
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Progress Summary */}
        <div className="mt-6 p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Progresso Geral</span>
            <span className="text-muted-foreground">
              {Math.round((completedItems / totalItems) * 100)}% concluído
            </span>
          </div>
          <div className="mt-2 w-full bg-muted rounded-full h-2">
            <div
              className="bg-freelaw-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${(completedItems / totalItems) * 100}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}