'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MeetingsFilter, type MeetingsFilters } from '@/components/meetings/meetings-filter';
import { MeetingsTable } from '@/components/meetings/meetings-table';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { type Meeting, type MeetingsPaginationInfo } from '@/lib/meetings-data';
import { Telemetry } from '@/lib/telemetry';

const initialFilters: MeetingsFilters = {
  search: '',
  status: 'all',
  icpFit: 'all',
  scoreRange: 'all',
  dateRange: 'all',
  seller: 'all',
};

interface MeetingsPageContentProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export function MeetingsPageContent({ searchParams }: MeetingsPageContentProps) {
  const router = useRouter();
  
  // State
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [pagination, setPagination] = useState<MeetingsPaginationInfo>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });
  const [filters, setFilters] = useState<MeetingsFilters>(initialFilters);
  const [sellers, setSellers] = useState<Array<{ id: string; fullName?: string; email: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize filters from URL params
  useEffect(() => {
    const urlFilters: MeetingsFilters = {
      search: (searchParams.search as string) || '',
      status: (searchParams.status as any) || 'all',
      icpFit: (searchParams.icpFit as any) || 'all',
      scoreRange: (searchParams.scoreRange as any) || 'all',
      dateRange: (searchParams.dateRange as any) || 'all',
      seller: (searchParams.seller as string) || 'all',
    };
    setFilters(urlFilters);
    
    const page = parseInt((searchParams.page as string) || '1');
    setPagination(prev => ({ ...prev, page }));
  }, [searchParams]);

  // Update URL when filters change
  const updateURL = useCallback((newFilters: MeetingsFilters, page: number = 1) => {
    const params = new URLSearchParams();
    
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value && value !== 'all') {
        params.set(key, value);
      }
    });
    
    if (page > 1) {
      params.set('page', page.toString());
    }
    
    const query = params.toString();
    router.push(`/meetings${query ? `?${query}` : ''}`, { scroll: false });
  }, [router]);

  // Fetch meetings (real via API or fake, based on env)
  const fetchMeetings = useCallback(async (newFilters: MeetingsFilters, page: number = 1) => {
    setIsLoading(true);
    setError(null);
    
    const useReal = process.env.NEXT_PUBLIC_USE_REAL_DATA === 'true';

    if (useReal) {
      try {
        const params = new URLSearchParams();
        if (newFilters.search) params.set('search', newFilters.search);
        if (newFilters.status !== 'all') params.set('status', newFilters.status);
        if (newFilters.icpFit !== 'all') params.set('icpFit', newFilters.icpFit);
        if (newFilters.scoreRange !== 'all') params.set('scoreRange', newFilters.scoreRange);
        if (newFilters.dateRange !== 'all') params.set('dateRange', newFilters.dateRange);
        if (newFilters.seller !== 'all') params.set('seller', newFilters.seller);
        params.set('page', String(page));
        params.set('limit', '20');

        const res = await fetch(`/api/meetings/public?${params.toString()}`, { cache: 'no-store' });
        if (!res.ok) {
          throw new Error(`API error: ${res.status}`);
        }
        const data = await res.json();
        setMeetings(data.meetings || []);
        setPagination(data.pagination || { total: 0, page: 1, limit: 20, totalPages: 0 });
        setIsLoading(false);
        return;
      } catch (err: any) {
        console.error('Failed to fetch real meetings:', err);
        setError('Falha ao carregar reuniões reais. Voltando para dados de demonstração.');
        // fallback to fake below
      }
    }

    // Simulate loading delay (fake)
    await new Promise(resolve => setTimeout(resolve, 300));

    const fakeMeetings: Meeting[] = [
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
        urlFathom: 'https://fathom.video/fake2',
      },
      {
        id: '3',
        title: 'Reunião com Oliveira Advocacia',
        startedAt: new Date(Date.now() - 172800000).toISOString(),
        durationSeconds: 2100,
        seller: { fullName: 'Carlos Oliveira', email: 'carlos@freelaw.com' },
        analysis: { scriptScore: 68, icpFit: 'low' as const },
      },
      {
        id: '4',
        title: 'Reunião com Costa & Filhos',
        startedAt: new Date(Date.now() - 259200000).toISOString(),
        durationSeconds: 3300,
        seller: { fullName: 'Ana Costa', email: 'ana@freelaw.com' },
        analysis: { scriptScore: 91, icpFit: 'high' as const },
        urlFathom: 'https://fathom.video/fake3',
      },
    ];

    const fakeSellers = [
      { id: '1', fullName: 'João Silva', email: 'joao@freelaw.com' },
      { id: '2', fullName: 'Maria Santos', email: 'maria@freelaw.com' },
      { id: '3', fullName: 'Carlos Oliveira', email: 'carlos@freelaw.com' },
      { id: '4', fullName: 'Ana Costa', email: 'ana@freelaw.com' },
    ];

    setMeetings(fakeMeetings);
    setPagination({
      total: fakeMeetings.length,
      page: page,
      limit: 20,
      totalPages: 1,
    });
    setSellers(fakeSellers);
    
    // Fake telemetry for frontend
    console.log('Meetings page loaded (fake telemetry)');
    
    setIsLoading(false);
  }, []);

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters: MeetingsFilters) => {
    setFilters(newFilters);
    updateURL(newFilters, 1);
    fetchMeetings(newFilters, 1);
  }, [updateURL, fetchMeetings]);

  // Handle pagination
  const handlePageChange = useCallback((newPage: number) => {
    updateURL(filters, newPage);
    fetchMeetings(filters, newPage);
    setPagination(prev => ({ ...prev, page: newPage }));
  }, [filters, updateURL, fetchMeetings]);

  // Initial data fetch
  useEffect(() => {
    const page = parseInt((searchParams.page as string) || '1');
    fetchMeetings(filters, page);
  }, []); // Only run once on mount

  const hasNextPage = pagination.page < pagination.totalPages;
  const hasPrevPage = pagination.page > 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-freelaw-primary">
            Reuniões
          </h1>
          <p className="text-muted-foreground mt-2">
            Gerencie e analise suas reuniões de vendas
          </p>
        </div>
        
        <Button 
          onClick={() => window.open('https://app.fathom.video', '_blank')}
          className="hidden sm:flex"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova Reunião
        </Button>
      </div>

      {/* Filters */}
      <MeetingsFilter
        filters={filters}
        onFiltersChange={handleFiltersChange}
        sellers={sellers}
        isLoading={isLoading}
      />

      {/* Error State */}
      {error && (
        <div className="bg-freelaw-error/10 border border-freelaw-error/20 rounded-lg p-4">
          <p className="text-freelaw-error font-medium">{error}</p>
        </div>
      )}

      {/* Results Summary */}
      {!isLoading && !error && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Mostrando {meetings.length} de {pagination.total} reuniões
          </span>
          {pagination.totalPages > 1 && (
            <span>
              Página {pagination.page} de {pagination.totalPages}
            </span>
          )}
        </div>
      )}

      {/* Meetings Table */}
      <MeetingsTable meetings={meetings} isLoading={isLoading} />

      {/* Pagination */}
      {pagination.totalPages > 1 && !isLoading && (
        <div className="flex items-center justify-center space-x-2">
          <Button
            variant="outline"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={!hasPrevPage}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>
          
          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              const pageNum = Math.max(1, pagination.page - 2) + i;
              if (pageNum > pagination.totalPages) return null;
              
              return (
                <Button
                  key={pageNum}
                  variant={pageNum === pagination.page ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePageChange(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          
          <Button
            variant="outline"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={!hasNextPage}
          >
            Próxima
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
