// Dashboard data fetching utilities
import { db } from '@/db/connection';
import { meetings, analyses, users } from '@/db/schema';
import { eq, gte, desc, count, avg, and } from 'drizzle-orm';
import { subDays, format, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface DashboardStats {
  totalMeetings: number;
  averageScore: number;
  highIcpCount: number;
  completedAnalyses: number;
  trends: {
    meetings: { value: number; isPositive: boolean };
    score: { value: number; isPositive: boolean };
    icp: { value: number; isPositive: boolean };
  };
}

export interface RecentMeeting {
  id: string;
  title: string;
  startedAt: string;
  durationSeconds?: number;
  seller?: {
    fullName?: string;
    email: string;
  };
  analysis?: {
    scriptScore: number;
    icpFit: 'high' | 'medium' | 'low';
  };
  urlFathom?: string;
}

export interface PerformanceData {
  period: string;
  averageScore: number;
  meetingsCount: number;
  highIcpCount: number;
}

export async function getDashboardStats(userId?: string): Promise<DashboardStats> {
  const now = new Date();
  const thirtyDaysAgo = subDays(now, 30);
  const sixtyDaysAgo = subDays(now, 60);

  // Base conditions  
  const baseConditions = [gte(meetings.createdAt, thirtyDaysAgo)];
  const previousPeriodConditions = [
    gte(meetings.createdAt, sixtyDaysAgo),
    gte(thirtyDaysAgo, meetings.createdAt) // Between 60-30 days ago
  ];
  
  // Add user filter if provided (for role-based access)
  if (userId) {
    baseConditions.push(eq(meetings.sellerId, userId));
    previousPeriodConditions.push(eq(meetings.sellerId, userId));
  }

  try {
    // Current period stats
    const [currentStats] = await db
      .select({
        totalMeetings: count(meetings.id),
        averageScore: avg(analyses.scriptScore),
        highIcpCount: count(meetings.id), // Will be filtered in subquery
      })
      .from(meetings)
      .leftJoin(analyses, eq(meetings.id, analyses.meetingId))
      .where(and(...baseConditions));

    // High ICP count for current period  
    const [highIcpCurrent] = await db
      .select({ count: count(analyses.id) })
      .from(analyses)
      .innerJoin(meetings, eq(analyses.meetingId, meetings.id))
      .where(
        and(
          ...baseConditions,
          eq(analyses.icpFit, 'high')
        )
      );

    // Previous period for comparison
    const [previousStats] = await db
      .select({
        totalMeetings: count(meetings.id),
        averageScore: avg(analyses.scriptScore),
      })
      .from(meetings)
      .leftJoin(analyses, eq(meetings.id, analyses.meetingId))
      .where(and(...previousPeriodConditions));

    const [highIcpPrevious] = await db
      .select({ count: count(analyses.id) })
      .from(analyses)
      .innerJoin(meetings, eq(analyses.meetingId, meetings.id))
      .where(
        and(
          ...previousPeriodConditions,
          eq(analyses.icpFit, 'high')
        )
      );

    // Calculate trends
    const meetingTrend = calculateTrend(
      currentStats.totalMeetings,
      previousStats.totalMeetings
    );
    
    const scoreTrend = calculateTrend(
      Math.round(currentStats.averageScore || 0),
      Math.round(previousStats.averageScore || 0)
    );
    
    const icpTrend = calculateTrend(
      highIcpCurrent.count,
      highIcpPrevious.count
    );

    return {
      totalMeetings: currentStats.totalMeetings,
      averageScore: Math.round(currentStats.averageScore || 0),
      highIcpCount: highIcpCurrent.count,
      completedAnalyses: currentStats.totalMeetings, // Assuming all meetings have analyses
      trends: {
        meetings: meetingTrend,
        score: scoreTrend,
        icp: icpTrend,
      },
    };

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return {
      totalMeetings: 0,
      averageScore: 0,
      highIcpCount: 0,
      completedAnalyses: 0,
      trends: {
        meetings: { value: 0, isPositive: false },
        score: { value: 0, isPositive: false },
        icp: { value: 0, isPositive: false },
      },
    };
  }
}

export async function getRecentMeetings(userId?: string, limit = 5): Promise<RecentMeeting[]> {
  try {
    const conditions = userId ? [eq(meetings.sellerId, userId)] : [];

    const recentMeetings = await db
      .select({
        id: meetings.id,
        title: meetings.title,
        startedAt: meetings.startedAt,
        durationSeconds: meetings.durationSeconds,
        urlFathom: meetings.urlFathom,
        sellerName: users.fullName,
        sellerEmail: users.email,
        scriptScore: analyses.scriptScore,
        icpFit: analyses.icpFit,
      })
      .from(meetings)
      .leftJoin(users, eq(meetings.sellerId, users.id))
      .leftJoin(analyses, eq(meetings.id, analyses.meetingId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(meetings.startedAt))
      .limit(limit);

    return recentMeetings.map(meeting => ({
      id: meeting.id,
      title: meeting.title || 'Reunião sem título',
      startedAt: meeting.startedAt.toISOString(),
      durationSeconds: meeting.durationSeconds || undefined,
      seller: meeting.sellerEmail ? {
        fullName: meeting.sellerName || undefined,
        email: meeting.sellerEmail,
      } : undefined,
      analysis: meeting.scriptScore ? {
        scriptScore: meeting.scriptScore,
        icpFit: meeting.icpFit as 'high' | 'medium' | 'low',
      } : undefined,
      urlFathom: meeting.urlFathom || undefined,
    }));

  } catch (error) {
    console.error('Error fetching recent meetings:', error);
    return [];
  }
}

export async function getPerformanceData(userId?: string): Promise<PerformanceData[]> {
  try {
    const conditions = userId ? [eq(meetings.sellerId, userId)] : [];
    
    // Get last 8 weeks of data
    const weeks: PerformanceData[] = [];
    
    for (let i = 7; i >= 0; i--) {
      const weekStart = startOfWeek(subDays(new Date(), i * 7));
      const weekEnd = endOfWeek(weekStart);
      
      const [weekStats] = await db
        .select({
          meetingsCount: count(meetings.id),
          averageScore: avg(analyses.scriptScore),
          highIcpCount: count(analyses.id),
        })
        .from(meetings)
        .leftJoin(analyses, eq(meetings.id, analyses.meetingId))
        .where(
          and(
            ...conditions,
            gte(meetings.startedAt, weekStart),
            gte(weekEnd, meetings.startedAt)
          )
        );

      const [highIcpCount] = await db
        .select({ count: count(analyses.id) })
        .from(analyses)
        .innerJoin(meetings, eq(analyses.meetingId, meetings.id))
        .where(
          and(
            ...conditions,
            gte(meetings.startedAt, weekStart),
            gte(weekEnd, meetings.startedAt),
            eq(analyses.icpFit, 'high')
          )
        );

      weeks.push({
        period: format(weekStart, "dd/MM", { locale: ptBR }),
        averageScore: Math.round(weekStats.averageScore || 0),
        meetingsCount: weekStats.meetingsCount,
        highIcpCount: highIcpCount.count,
      });
    }
    
    return weeks;

  } catch (error) {
    console.error('Error fetching performance data:', error);
    return [];
  }
}

function calculateTrend(current: number, previous: number): { value: number; isPositive: boolean } {
  if (previous === 0) {
    return { value: current > 0 ? 100 : 0, isPositive: current > 0 };
  }
  
  const percentChange = Math.round(((current - previous) / previous) * 100);
  return {
    value: Math.abs(percentChange),
    isPositive: percentChange >= 0,
  };
}