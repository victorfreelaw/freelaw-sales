import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Download, 
  Calendar, 
  BarChart3, 
  Target, 
  Users,
  Clock,
  Award
} from 'lucide-react';

export default function ReportsPage() {
  const fakeReports = [
    {
      id: '1',
      name: 'Performance Mensal - Dezembro 2023',
      type: 'performance',
      period: 'monthly',
      generatedAt: '2023-12-31T23:59:00Z',
      status: 'ready',
      metrics: {
        meetings: 24,
        averageScore: 78,
        highIcp: 8,
      },
    },
    {
      id: '2',
      name: 'Análise de Scripts - Q4 2023',
      type: 'scripts',
      period: 'quarterly',
      generatedAt: '2023-12-30T10:00:00Z',
      status: 'ready',
      metrics: {
        scriptAdherence: 82,
        topPerformer: 'João Silva',
      },
    },
    {
      id: '3',
      name: 'Relatório Semanal - Semana 52',
      type: 'weekly',
      period: 'weekly',
      generatedAt: '2023-12-29T09:00:00Z',
      status: 'generating',
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-freelaw-primary">
              Relatórios
            </h1>
            <p className="text-muted-foreground mt-2">
              Análises detalhadas de performance e insights de vendas
            </p>
          </div>
          
          <Button>
            <BarChart3 className="h-4 w-4 mr-2" />
            Novo Relatório
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reuniões (30d)</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">24</div>
              <p className="text-xs text-muted-foreground">
                +15% vs período anterior
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Score Médio</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">78</div>
              <p className="text-xs text-muted-foreground">
                +8% vs período anterior
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ICP High</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8</div>
              <p className="text-xs text-muted-foreground">
                33% do total
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">52m</div>
              <p className="text-xs text-muted-foreground">
                Por reunião
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Relatórios Disponíveis */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Relatórios Disponíveis</h2>
          
          <div className="grid gap-4">
            {fakeReports.map((report) => (
              <Card key={report.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{report.name}</CardTitle>
                      <CardDescription>
                        Gerado em {new Date(report.generatedAt).toLocaleDateString('pt-BR')} às{' '}
                        {new Date(report.generatedAt).toLocaleTimeString('pt-BR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </CardDescription>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={report.status === 'ready' ? 'default' : 'secondary'}
                      >
                        {report.status === 'ready' ? 'Pronto' : 'Gerando...'}
                      </Badge>
                      
                      <Badge variant="outline">
                        {report.period === 'monthly' ? 'Mensal' : 
                         report.period === 'weekly' ? 'Semanal' : 'Trimestral'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  {/* Report Metrics Preview */}
                  {report.metrics && (
                    <div className="flex gap-6 mb-4 text-sm">
                      {report.metrics.meetings && (
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span>{report.metrics.meetings} reuniões</span>
                        </div>
                      )}
                      {report.metrics.averageScore && (
                        <div className="flex items-center gap-1">
                          <Award className="h-3 w-3 text-muted-foreground" />
                          <span>Score {report.metrics.averageScore}</span>
                        </div>
                      )}
                      {report.metrics.highIcp && (
                        <div className="flex items-center gap-1">
                          <Target className="h-3 w-3 text-muted-foreground" />
                          <span>{report.metrics.highIcp} ICP High</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="capitalize">{report.type}</span>
                      {report.metrics?.topPerformer && (
                        <span>Top: {report.metrics.topPerformer}</span>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      {report.status === 'ready' && (
                        <Button variant="outline" size="sm">
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                      )}
                      
                      <Button variant="outline" size="sm">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        Ver Análise
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Report Types */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border-dashed">
            <CardHeader className="text-center">
              <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <CardTitle className="text-lg">Relatório de Performance</CardTitle>
              <CardDescription>
                Análise completa de KPIs e métricas de vendas
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 text-center">
              <Button variant="outline" size="sm">
                Gerar Agora
              </Button>
            </CardContent>
          </Card>
          
          <Card className="border-dashed">
            <CardHeader className="text-center">
              <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <CardTitle className="text-lg">Análise por Vendedor</CardTitle>
              <CardDescription>
                Performance individual e comparativo da equipe
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 text-center">
              <Button variant="outline" size="sm">
                Gerar Agora
              </Button>
            </CardContent>
          </Card>
          
          <Card className="border-dashed">
            <CardHeader className="text-center">
              <Target className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <CardTitle className="text-lg">Relatório de ICP</CardTitle>
              <CardDescription>
                Análise de perfil de clientes e conversões
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 text-center">
              <Button variant="outline" size="sm">
                Gerar Agora
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}