'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Filter, X } from 'lucide-react';

export interface MeetingsFilters {
  search: string;
  status: 'all' | 'pending' | 'processing' | 'completed' | 'failed';
  icpFit: 'all' | 'high' | 'medium' | 'low';
  scoreRange: 'all' | 'high' | 'medium' | 'low';
  dateRange: 'all' | 'today' | 'week' | 'month' | 'quarter';
  seller: string;
}

interface MeetingsFilterProps {
  filters: MeetingsFilters;
  onFiltersChange: (filters: MeetingsFilters) => void;
  sellers?: Array<{ id: string; fullName?: string; email: string }>;
  isLoading?: boolean;
}

export function MeetingsFilter({ 
  filters, 
  onFiltersChange, 
  sellers = [],
  isLoading = false
}: MeetingsFilterProps) {
  const [showFilters, setShowFilters] = useState(false);

  const updateFilter = (key: keyof MeetingsFilters, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      status: 'all',
      icpFit: 'all',
      scoreRange: 'all',
      dateRange: 'all',
      seller: 'all',
    });
  };

  const hasActiveFilters = 
    filters.search ||
    filters.status !== 'all' ||
    filters.icpFit !== 'all' ||
    filters.scoreRange !== 'all' ||
    filters.dateRange !== 'all' ||
    filters.seller !== 'all';

  return (
    <div className="space-y-4">
      {/* Search and Filter Toggle */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar reuniões..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pl-10"
            disabled={isLoading}
          />
        </div>
        
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="shrink-0"
          disabled={isLoading}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filtros
          {hasActiveFilters && (
            <span className="ml-2 bg-freelaw-primary text-white text-xs px-1.5 py-0.5 rounded-full">
              !
            </span>
          )}
        </Button>
        
        {hasActiveFilters && (
          <Button
            variant="ghost"
            onClick={clearFilters}
            className="shrink-0"
            disabled={isLoading}
          >
            <X className="h-4 w-4 mr-2" />
            Limpar
          </Button>
        )}
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="grid gap-4 p-4 bg-muted/30 rounded-lg border">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={filters.status}
                onValueChange={(value) => updateFilter('status', value)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="completed">Analisada</SelectItem>
                  <SelectItem value="processing">Processando</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="failed">Erro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* ICP Fit Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">ICP Fit</label>
              <Select
                value={filters.icpFit}
                onValueChange={(value) => updateFilter('icpFit', value)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os fits" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="high">Alto</SelectItem>
                  <SelectItem value="medium">Médio</SelectItem>
                  <SelectItem value="low">Baixo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Score Range Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Score</label>
              <Select
                value={filters.scoreRange}
                onValueChange={(value) => updateFilter('scoreRange', value)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os scores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="high">Alto (80-100)</SelectItem>
                  <SelectItem value="medium">Médio (60-79)</SelectItem>
                  <SelectItem value="low">Baixo (0-59)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Período</label>
              <Select
                value={filters.dateRange}
                onValueChange={(value) => updateFilter('dateRange', value)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os períodos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="week">Esta semana</SelectItem>
                  <SelectItem value="month">Este mês</SelectItem>
                  <SelectItem value="quarter">Este trimestre</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Seller Filter (only shown if multiple sellers) */}
          {sellers.length > 1 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Vendedor</label>
              <Select
                value={filters.seller}
                onValueChange={(value) => updateFilter('seller', value)}
                disabled={isLoading}
              >
                <SelectTrigger className="max-w-xs">
                  <SelectValue placeholder="Todos os vendedores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {sellers.map((seller) => (
                    <SelectItem key={seller.id} value={seller.id}>
                      {seller.fullName || seller.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}