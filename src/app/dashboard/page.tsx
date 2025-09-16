import { Suspense } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { StatsCard } from '@/components/dashboard/stats-card';
import { RecentMeetings } from '@/components/dashboard/recent-meetings';
import { PerformanceChart } from '@/components/dashboard/performance-chart';
import { 
  getDashboardStats, 
  getRecentMeetings, 
  getPerformanceData 
} from '@/lib/dashboard-data';
import { getCurrentUser } from '@/lib/auth';
import { Telemetry } from '@/lib/telemetry';
import { 
  Calendar, 
  TrendingUp, 
  Target, 
  CheckCircle2,
  Loader2
} from 'lucide-react';

function DashboardContent() {
  // Fake data for frontend testing
  const stats = {
    totalMeetings: 24,
    averageScore: 78,
    highIcpCount: 8,
    completedAnalyses: 22,
    trends: {
      meetings: { value: 15, isPositive: true },
      score: { value: 8, isPositive: true },
      icp: { value: 25, isPositive: true },
    },
  };

  const recentMeetings = [
    {
      id: '1',
      title: 'Reunião com Escritório Silva & Associados',
      startedAt: new Date().toISOString(),
      durationSeconds: 3600,
      seller: { fullName: 'João Silva', email: 'joao@freelaw.com' },
      analysis: { scriptScore: 85, icpFit: 'high' as const },
      urlFathom: 'https://fathom.video/fake',
    },
    {
      id: '2', 
      title: 'Reunião com Advocacia Santos',
      startedAt: new Date(Date.now() - 86400000).toISOString(),
      durationSeconds: 2700,
      seller: { fullName: 'Maria Santos', email: 'maria@freelaw.com' },
      analysis: { scriptScore: 72, icpFit: 'medium' as const },
    },
  ];

  const performanceData = [
    { period: '01/12', averageScore: 75, meetingsCount: 4, highIcpCount: 1 },
    { period: '08/12', averageScore: 82, meetingsCount: 6, highIcpCount: 2 },
    { period: '15/12', averageScore: 78, meetingsCount: 5, highIcpCount: 2 },
    { period: '22/12', averageScore: 85, meetingsCount: 7, highIcpCount: 3 },
  ];

  // Fake telemetry for frontend
  console.log('Dashboard loaded (fake telemetry)');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-freelaw-primary">
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-2">
          Visão geral da performance de vendas da sua equipe
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Reuniões (30 dias)"
          value={stats.totalMeetings}
          description="Total de reuniões analisadas"
          icon={Calendar}
          trend={{
            value: stats.trends.meetings.value,
            isPositive: stats.trends.meetings.isPositive,
            period: "30 dias anteriores"
          }}
        />
        
        <StatsCard
          title="Score Médio"
          value={`${stats.averageScore}/100`}
          description="Aderência ao script de vendas"
          icon={TrendingUp}
          trend={{
            value: stats.trends.score.value,
            isPositive: stats.trends.score.isPositive,
            period: "período anterior"
          }}
        />
        
        <StatsCard
          title="ICP High"
          value={stats.highIcpCount}
          description="Prospects de alto potencial"
          icon={Target}
          trend={{
            value: stats.trends.icp.value,
            isPositive: stats.trends.icp.isPositive,
            period: "período anterior"
          }}
        />
        
        <StatsCard
          title="Análises Completas"
          value={stats.completedAnalyses}
          description="Reuniões processadas"
          icon={CheckCircle2}
        />
      </div>

      {/* Charts and Recent Activity */}
      <div className="grid gap-6 md:grid-cols-7">
        {/* Performance Chart */}
        <div className="md:col-span-4">
          <PerformanceChart 
            data={performanceData}
            title="Performance Semanal"
          />
        </div>

        {/* Recent Meetings */}
        <div className="md:col-span-3">
          <RecentMeetings meetings={recentMeetings} />
        </div>
      </div>

      {/* Additional Insights */}
      {stats.totalMeetings > 0 && (
        <div className="rounded-lg bg-freelaw-secondary/20 p-6 border border-freelaw-accent">
          <div className="flex items-start space-x-3">
            <TrendingUp className="h-5 w-5 text-freelaw-primary mt-0.5" />
            <div>
              <h3 className="font-semibold text-freelaw-primary">
                Insights de Performance
              </h3>
              <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                {stats.averageScore >= 80 && (
                  <p>✅ Excelente aderência ao script! Continue assim.</p>
                )}
                {stats.averageScore >= 60 && stats.averageScore < 80 && (
                  <p>⚠️ Boa performance, mas há espaço para melhorar a aderência ao script.</p>
                )}
                {stats.averageScore < 60 && (
                  <p>🎯 Foque em melhorar a descoberta de dores e proposta de valor.</p>
                )}
                
                {stats.highIcpCount > 0 && (
                  <p>
                    🚀 {stats.highIcpCount} prospects de alto potencial identificados! 
                    Priorize o follow-up.
                  </p>
                )}
                
                {stats.totalMeetings < 10 && (
                  <p>
                    📈 Para insights mais precisos, procure analisar ao menos 10 reuniões por período.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-4 w-96 bg-muted rounded animate-pulse" />
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 bg-muted rounded animate-pulse" />
        ))}
      </div>
      
      <div className="grid gap-6 md:grid-cols-7">
        <div className="md:col-span-4 h-96 bg-muted rounded animate-pulse" />
        <div className="md:col-span-3 h-96 bg-muted rounded animate-pulse" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <MainLayout>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </MainLayout>
  );
}