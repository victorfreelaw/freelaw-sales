import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  AlertTriangle, 
  Building, 
  DollarSign, 
  Clock, 
  Shield,
  Zap,
  MessageSquare
} from 'lucide-react';

interface Highlight {
  type: 'buying_signal' | 'objection' | 'competitor' | 'budget' | 'timeline' | 'authority';
  text: string;
  timestamp: number;
  confidence: number;
}

interface Objection {
  type: string;
  text: string;
  timestamp: number;
  handled: boolean;
}

interface HighlightsTimelineProps {
  highlights: Highlight[];
  objections: Objection[];
}

const highlightIcons = {
  buying_signal: TrendingUp,
  objection: AlertTriangle,
  competitor: Building,
  budget: DollarSign,
  timeline: Clock,
  authority: Shield,
};

const highlightColors = {
  buying_signal: 'text-freelaw-success',
  objection: 'text-freelaw-error',
  competitor: 'text-orange-500',
  budget: 'text-green-600',
  timeline: 'text-blue-500',
  authority: 'text-purple-500',
};

const highlightLabels = {
  buying_signal: 'Sinal de Compra',
  objection: 'Objeção',
  competitor: 'Concorrente',
  budget: 'Orçamento',
  timeline: 'Cronograma',
  authority: 'Autoridade',
};

function formatTimestamp(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function HighlightsTimeline({ highlights, objections }: HighlightsTimelineProps) {
  // Combine highlights and objections into a single timeline
  const timelineItems = [
    ...highlights.map(h => ({
      ...h,
      category: 'highlight' as const,
    })),
    ...objections.map(o => ({
      ...o,
      category: 'objection' as const,
      confidence: 0.9, // Default confidence for objections
    }))
  ].sort((a, b) => a.timestamp - b.timestamp);

  const getBadgeVariant = (confidence: number) => {
    if (confidence >= 0.8) return 'default';
    if (confidence >= 0.6) return 'secondary';
    return 'outline';
  };

  const getObjectionBadgeVariant = (handled: boolean) => {
    return handled ? 'success' : 'error';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Momentos Importantes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {timelineItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum momento importante identificado na reunião.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {timelineItems.map((item, index) => {
              if (item.category === 'highlight') {
                const highlight = item as Highlight & { category: 'highlight' };
                const Icon = highlightIcons[highlight.type];
                
                return (
                  <div key={index} className="flex gap-4 p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                    <div className="flex-shrink-0">
                      <div className={`p-2 rounded-full bg-muted ${highlightColors[highlight.type]}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={getBadgeVariant(highlight.confidence)}>
                            {highlightLabels[highlight.type]}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatTimestamp(highlight.timestamp)}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {Math.round(highlight.confidence * 100)}% confiança
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        "{highlight.text}"
                      </p>
                    </div>
                  </div>
                );
              } else {
                const objection = item as Objection & { category: 'objection'; confidence: number };
                
                return (
                  <div key={index} className="flex gap-4 p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                    <div className="flex-shrink-0">
                      <div className="p-2 rounded-full bg-muted text-freelaw-error">
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="error">
                            Objeção: {objection.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatTimestamp(objection.timestamp)}
                          </span>
                        </div>
                        <Badge variant={getObjectionBadgeVariant(objection.handled)}>
                          {objection.handled ? 'Tratada' : 'Não tratada'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        "{objection.text}"
                      </p>
                    </div>
                  </div>
                );
              }
            })}
          </div>
        )}
        
        {/* Summary Stats */}
        {timelineItems.length > 0 && (
          <div className="mt-6 p-4 bg-muted/30 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-freelaw-success">
                  {highlights.filter(h => h.type === 'buying_signal').length}
                </div>
                <div className="text-xs text-muted-foreground">Sinais de Compra</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-freelaw-error">
                  {objections.length}
                </div>
                <div className="text-xs text-muted-foreground">Objeções</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-500">
                  {highlights.filter(h => h.type === 'competitor').length}
                </div>
                <div className="text-xs text-muted-foreground">Concorrentes</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {highlights.filter(h => h.type === 'budget').length}
                </div>
                <div className="text-xs text-muted-foreground">Orçamento</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}