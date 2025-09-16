import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, TrendingUp, MapPin, Zap } from 'lucide-react';

interface ICPAnalysisProps {
  fit: 'high' | 'medium' | 'low';
  criteria: {
    company_size: 'small' | 'medium' | 'large';
    revenue_range: string;
    case_volume: 'low' | 'medium' | 'high';
    pain_points: string[];
    region: string;
    acquisition_channel: string;
  };
  reasoning?: string;
}

export function ICPAnalysis({ fit, criteria, reasoning }: ICPAnalysisProps) {
  const getIcpBadgeVariant = (fit: 'high' | 'medium' | 'low') => {
    switch (fit) {
      case 'high': return 'success';
      case 'medium': return 'warning';
      case 'low': return 'error';
      default: return 'secondary';
    }
  };

  const getIcpLabel = (fit: 'high' | 'medium' | 'low') => {
    switch (fit) {
      case 'high': return 'Alto Potencial';
      case 'medium': return 'Potencial Médio';
      case 'low': return 'Baixo Potencial';
      default: return fit;
    }
  };

  const getSizeLabel = (size: string) => {
    switch (size) {
      case 'small': return 'Pequeno (até 5 advogados)';
      case 'medium': return 'Médio (6-20 advogados)';
      case 'large': return 'Grande (20+ advogados)';
      default: return size;
    }
  };

  const getVolumeLabel = (volume: string) => {
    switch (volume) {
      case 'low': return 'Baixo (<50/mês)';
      case 'medium': return 'Médio (50-200/mês)';
      case 'high': return 'Alto (200+/mês)';
      default: return volume;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Análise de ICP
          </CardTitle>
          <Badge variant={getIcpBadgeVariant(fit)} className="text-sm">
            {getIcpLabel(fit)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* ICP Criteria Grid */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Company Size */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <Users className="h-5 w-5 text-freelaw-primary mt-0.5" />
              <div>
                <h4 className="font-medium text-sm">Porte do Escritório</h4>
                <p className="text-sm text-muted-foreground">
                  {getSizeLabel(criteria.company_size)}
                </p>
              </div>
            </div>

            {/* Revenue Range */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <TrendingUp className="h-5 w-5 text-freelaw-primary mt-0.5" />
              <div>
                <h4 className="font-medium text-sm">Faixa de Receita</h4>
                <p className="text-sm text-muted-foreground">
                  {criteria.revenue_range || 'Não informado'}
                </p>
              </div>
            </div>

            {/* Case Volume */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <Zap className="h-5 w-5 text-freelaw-primary mt-0.5" />
              <div>
                <h4 className="font-medium text-sm">Volume de Casos</h4>
                <p className="text-sm text-muted-foreground">
                  {getVolumeLabel(criteria.case_volume)}
                </p>
              </div>
            </div>

            {/* Region */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <MapPin className="h-5 w-5 text-freelaw-primary mt-0.5" />
              <div>
                <h4 className="font-medium text-sm">Região</h4>
                <p className="text-sm text-muted-foreground">
                  {criteria.region || 'Não informado'}
                </p>
              </div>
            </div>
          </div>

          {/* Pain Points */}
          {criteria.pain_points && criteria.pain_points.length > 0 && (
            <div>
              <h4 className="font-medium text-sm mb-3">Principais Dores Identificadas</h4>
              <div className="flex flex-wrap gap-2">
                {criteria.pain_points.map((pain, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {pain}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Acquisition Channel */}
          {criteria.acquisition_channel && (
            <div>
              <h4 className="font-medium text-sm mb-2">Canal de Aquisição</h4>
              <Badge variant="secondary">
                {criteria.acquisition_channel}
              </Badge>
            </div>
          )}

          {/* Reasoning */}
          {reasoning && (
            <div className="p-4 bg-muted/30 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Justificativa da Classificação</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {reasoning}
              </p>
            </div>
          )}

          {/* Action Recommendation */}
          <div className={`p-4 rounded-lg border ${
            fit === 'high' 
              ? 'bg-freelaw-success/5 border-freelaw-success/20' 
              : fit === 'medium'
              ? 'bg-freelaw-warning/5 border-freelaw-warning/20'
              : 'bg-muted/30 border-border'
          }`}>
            <h4 className="font-medium text-sm mb-2">Recomendação de Ação</h4>
            <p className="text-sm text-muted-foreground">
              {fit === 'high' && 
                '🚀 Prospect prioritário! Agende follow-up imediatamente e prepare proposta personalizada.'
              }
              {fit === 'medium' && 
                '⚠️ Potencial interessante. Faça nurturing e qualifique melhor antes de avançar.'
              }
              {fit === 'low' && 
                '📝 Baixa prioridade. Inclua em campanhas de nurturing de longo prazo.'
              }
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}