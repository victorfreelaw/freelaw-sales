// Meetings data fetching utilities  
import { db } from '@/db/connection';
import { meetings, analyses, users } from '@/db/schema';
import { eq, desc, and, or, ilike, gte, lte } from 'drizzle-orm';
import { subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter } from 'date-fns';

export interface MeetingsFilters {
  search: string;
  status: 'all' | 'pending' | 'processing' | 'completed' | 'failed';
  icpFit: 'all' | 'high' | 'medium' | 'low';
  scoreRange: 'all' | 'high' | 'medium' | 'low';
  dateRange: 'all' | 'today' | 'week' | 'month' | 'quarter';
  seller: string;
}

export interface Meeting {
  id: string;
  title: string;
  startedAt: string;
  durationSeconds?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  seller?: {
    id: string;
    fullName?: string;
    email: string;
  };
  analysis?: {
    scriptScore: number;
    icpFit: 'high' | 'medium' | 'low';
  };
  urlFathom?: string;
  source: string;
}

export interface MeetingsPaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface MeetingsResponse {
  meetings: Meeting[];
  pagination: MeetingsPaginationInfo;
}

function getDateRangeCondition(range: string) {
  const now = new Date();
  
  switch (range) {
    case 'today':
      return and(
        gte(meetings.startedAt, startOfDay(now)),
        lte(meetings.startedAt, endOfDay(now))
      );
    case 'week':
      return and(
        gte(meetings.startedAt, startOfWeek(now)),
        lte(meetings.startedAt, endOfWeek(now))
      );
    case 'month':
      return and(
        gte(meetings.startedAt, startOfMonth(now)),
        lte(meetings.startedAt, endOfMonth(now))
      );
    case 'quarter':
      return and(
        gte(meetings.startedAt, startOfQuarter(now)),
        lte(meetings.startedAt, endOfQuarter(now))
      );
    default:
      return undefined;
  }
}

function getScoreRangeCondition(range: string) {
  switch (range) {
    case 'high':
      return gte(analyses.scriptScore, 80);
    case 'medium':
      return and(
        gte(analyses.scriptScore, 60),
        lte(analyses.scriptScore, 79)
      );
    case 'low':
      return lte(analyses.scriptScore, 59);
    default:
      return undefined;
  }
}

export async function getMeetings(
  filters: MeetingsFilters,
  page: number = 1,
  limit: number = 20,
  userId?: string
): Promise<MeetingsResponse> {
  try {
    // Se dev-store estiver habilitado, usar dev-store
    if (process.env.DEV_STORE_ENABLED === 'true') {
      const { listDevMeetings } = await import('@/lib/dev-store');
      const result = listDevMeetings(page, limit);
      
      const formattedMeetings: Meeting[] = result.meetings.map(meeting => ({
        id: meeting.id,
        title: meeting.title,
        startedAt: meeting.startedAt,
        durationSeconds: meeting.durationSeconds,
        status: meeting.status,
        seller: meeting.seller ? {
          id: meeting.seller.id || 'dev_seller',
          fullName: meeting.seller.fullName,
          email: meeting.seller.email || 'dev@example.com',
        } : undefined,
        analysis: meeting.analysis ? {
          scriptScore: meeting.analysis.scriptScore,
          icpFit: meeting.analysis.icpFit,
        } : undefined,
        urlFathom: meeting.urlFathom,
        source: meeting.source,
      }));
      
      return {
        meetings: formattedMeetings,
        pagination: result.pagination,
      };
    }
    const offset = (page - 1) * limit;
    
    // Build base conditions
    const conditions = [];
    
    // User filter (for role-based access)
    if (userId) {
      conditions.push(eq(meetings.sellerId, userId));
    }
    
    // Search filter
    if (filters.search) {
      conditions.push(
        or(
          ilike(meetings.title, `%${filters.search}%`),
          ilike(users.fullName, `%${filters.search}%`),
          ilike(users.email, `%${filters.search}%`)
        )
      );
    }
    
    // Status filter
    if (filters.status !== 'all') {
      conditions.push(eq(meetings.status, filters.status));
    }
    
    // Seller filter
    if (filters.seller !== 'all') {
      conditions.push(eq(meetings.sellerId, filters.seller));
    }
    
    // Date range filter
    const dateCondition = getDateRangeCondition(filters.dateRange);
    if (dateCondition) {
      conditions.push(dateCondition);
    }
    
    // Build query with joins
    let query = db
      .select({
        id: meetings.id,
        title: meetings.title,
        startedAt: meetings.startedAt,
        durationSeconds: meetings.durationSeconds,
        status: meetings.status,
        urlFathom: meetings.urlFathom,
        source: meetings.source,
        sellerId: meetings.sellerId,
        sellerName: users.fullName,
        sellerEmail: users.email,
        scriptScore: analyses.scriptScore,
        icpFit: analyses.icpFit,
      })
      .from(meetings)
      .leftJoin(users, eq(meetings.sellerId, users.id))
      .leftJoin(analyses, eq(meetings.id, analyses.meetingId));
    
    // Apply base conditions
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    // Apply ICP fit filter (needs to be after join)
    if (filters.icpFit !== 'all') {
      query = query.where(eq(analyses.icpFit, filters.icpFit));
    }
    
    // Apply score range filter (needs to be after join)
    const scoreCondition = getScoreRangeCondition(filters.scoreRange);
    if (scoreCondition) {
      query = query.where(scoreCondition);
    }
    
    // Get total count for pagination
    const countQuery = await db
      .select({ count: db.count() })
      .from(meetings)
      .leftJoin(users, eq(meetings.sellerId, users.id))
      .leftJoin(analyses, eq(meetings.id, analyses.meetingId))
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    
    const totalCount = countQuery[0]?.count || 0;
    
    // Execute main query with pagination
    const results = await query
      .orderBy(desc(meetings.startedAt))
      .limit(limit)
      .offset(offset);
    
    // Transform results
    const formattedMeetings: Meeting[] = results.map(row => ({
      id: row.id,
      title: row.title || 'Reunião sem título',
      startedAt: row.startedAt.toISOString(),
      durationSeconds: row.durationSeconds || undefined,
      status: row.status as 'pending' | 'processing' | 'completed' | 'failed',
      seller: row.sellerEmail ? {
        id: row.sellerId,
        fullName: row.sellerName || undefined,
        email: row.sellerEmail,
      } : undefined,
      analysis: row.scriptScore ? {
        scriptScore: row.scriptScore,
        icpFit: row.icpFit as 'high' | 'medium' | 'low',
      } : undefined,
      urlFathom: row.urlFathom || undefined,
      source: row.source,
    }));
    
    return {
      meetings: formattedMeetings,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
    
  } catch (error) {
    console.error('Error fetching meetings:', error);
    return {
      meetings: [],
      pagination: {
        total: 0,
        page: 1,
        limit,
        totalPages: 0,
      },
    };
  }
}

export async function getMeetingById(id: string, userId?: string): Promise<Meeting | null> {
  try {
    const conditions = [eq(meetings.id, id)];
    
    // Add user filter if provided (for role-based access)
    if (userId) {
      conditions.push(eq(meetings.sellerId, userId));
    }
    
    const result = await db
      .select({
        id: meetings.id,
        title: meetings.title,
        startedAt: meetings.startedAt,
        durationSeconds: meetings.durationSeconds,
        status: meetings.status,
        urlFathom: meetings.urlFathom,
        source: meetings.source,
        sellerId: meetings.sellerId,
        sellerName: users.fullName,
        sellerEmail: users.email,
        scriptScore: analyses.scriptScore,
        icpFit: analyses.icpFit,
      })
      .from(meetings)
      .leftJoin(users, eq(meetings.sellerId, users.id))
      .leftJoin(analyses, eq(meetings.id, analyses.meetingId))
      .where(and(...conditions))
      .limit(1);
    
    if (result.length === 0) {
      return null;
    }
    
    const row = result[0];
    return {
      id: row.id,
      title: row.title || 'Reunião sem título',
      startedAt: row.startedAt.toISOString(),
      durationSeconds: row.durationSeconds || undefined,
      status: row.status as 'pending' | 'processing' | 'completed' | 'failed',
      seller: row.sellerEmail ? {
        id: row.sellerId,
        fullName: row.sellerName || undefined,
        email: row.sellerEmail,
      } : undefined,
      analysis: row.scriptScore ? {
        scriptScore: row.scriptScore,
        icpFit: row.icpFit as 'high' | 'medium' | 'low',
      } : undefined,
      urlFathom: row.urlFathom || undefined,
      source: row.source,
    };
    
  } catch (error) {
    console.error('Error fetching meeting by ID:', error);
    return null;
  }
}

export async function getSellers(): Promise<Array<{ id: string; fullName?: string; email: string }>> {
  try {
    const sellers = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
      })
      .from(users)
      .where(eq(users.isActive, true))
      .orderBy(users.fullName, users.email);
    
    return sellers.map(seller => ({
      id: seller.id,
      fullName: seller.fullName || undefined,
      email: seller.email,
    }));
    
  } catch (error) {
    console.error('Error fetching sellers:', error);
    return [];
  }
}