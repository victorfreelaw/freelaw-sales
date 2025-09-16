'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';

interface PerformanceData {
  period: string;
  averageScore: number;
  meetingsCount: number;
  highIcpCount: number;
}

interface PerformanceChartProps {
  data: PerformanceData[];
  title?: string;
}

export function PerformanceChart({ data, title = "Performance por Período" }: PerformanceChartProps) {
  const formatTooltip = (value: any, name: string) => {
    switch (name) {
      case 'averageScore':
        return [value + '/100', 'Score Médio'];
      case 'meetingsCount':
        return [value, 'Total de Reuniões'];
      case 'highIcpCount':
        return [value, 'High ICP'];
      default:
        return [value, name];
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="period" 
                className="text-xs" 
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                className="text-xs" 
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                formatter={formatTooltip}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  color: 'hsl(var(--foreground))'
                }}
              />
              <Bar 
                dataKey="averageScore" 
                fill="hsl(var(--freelaw-primary))" 
                name="Score Médio"
                radius={[2, 2, 0, 0]}
              />
              <Bar 
                dataKey="highIcpCount" 
                fill="hsl(var(--freelaw-success))" 
                name="High ICP"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}