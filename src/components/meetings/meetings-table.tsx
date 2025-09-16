import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDate, formatTime, getInitials, formatDuration } from '@/lib/utils';
import { ExternalLink, Eye, Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface Meeting {
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

interface MeetingsTableProps {
  meetings: Meeting[];
  isLoading?: boolean;
}

export function MeetingsTable({ meetings, isLoading = false }: MeetingsTableProps) {
  const getStatusBadgeVariant = (status: Meeting['status']) => {
    switch (status) {
      case 'completed': return 'success';
      case 'processing': return 'warning';
      case 'pending': return 'secondary';
      case 'failed': return 'error';
      default: return 'secondary';
    }
  };

  const getStatusText = (status: Meeting['status']) => {
    switch (status) {
      case 'completed': return 'Analisada';
      case 'processing': return 'Processando';
      case 'pending': return 'Pendente';
      case 'failed': return 'Erro';
      default: return status;
    }
  };

  const getIcpBadgeVariant = (fit: 'high' | 'medium' | 'low') => {
    switch (fit) {
      case 'high': return 'success';
      case 'medium': return 'warning';
      case 'low': return 'error';
      default: return 'secondary';
    }
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 bg-muted rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (meetings.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Nenhuma reunião encontrada</h3>
        <p className="text-muted-foreground mb-4">
          Nenhuma reunião corresponde aos filtros selecionados.
        </p>
        <p className="text-sm text-muted-foreground">
          Reuniões do Fathom aparecerão automaticamente após serem processadas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop Table */}
      <div className="hidden md:block">
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Reunião
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Vendedor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Análise
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-background divide-y divide-border">
              {meetings.map((meeting) => (
                <tr key={meeting.id} className="hover:bg-muted/30">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div>
                        <div className="font-medium text-foreground">
                          {meeting.title || 'Reunião sem título'}
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground space-x-3">
                          <span>
                            {formatDate(meeting.startedAt)} às {formatTime(meeting.startedAt)}
                          </span>
                          {meeting.durationSeconds && (
                            <span className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {formatDuration(meeting.durationSeconds)}
                            </span>
                          )}
                          <span className="capitalize text-xs bg-muted px-2 py-1 rounded">
                            {meeting.source}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    {meeting.seller && (
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-freelaw-primary text-white text-xs">
                            {getInitials(meeting.seller.fullName || meeting.seller.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-sm font-medium">
                            {meeting.seller.fullName || meeting.seller.email}
                          </div>
                        </div>
                      </div>
                    )}
                  </td>
                  
                  <td className="px-6 py-4">
                    <Badge variant={getStatusBadgeVariant(meeting.status)}>
                      {getStatusText(meeting.status)}
                    </Badge>
                  </td>
                  
                  <td className="px-6 py-4">
                    {meeting.analysis ? (
                      <div className="flex items-center space-x-2">
                        <Badge variant={getScoreBadgeVariant(meeting.analysis.scriptScore)}>
                          {meeting.analysis.scriptScore}/100
                        </Badge>
                        <Badge variant={getIcpBadgeVariant(meeting.analysis.icpFit)}>
                          ICP {meeting.analysis.icpFit.toUpperCase()}
                        </Badge>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </td>
                  
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                      >
                        <Link href={`/meetings/${meeting.id}`}>
                          <Eye className="h-3 w-3 mr-1" />
                          Ver
                        </Link>
                      </Button>
                      
                      {meeting.urlFathom && (
                        <Button
                          size="sm"
                          variant="ghost"
                          asChild
                        >
                          <a
                            href={meeting.urlFathom}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-3 w-3" />
                            <span className="sr-only">Ver gravação no Fathom</span>
                          </a>
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {meetings.map((meeting) => (
          <div
            key={meeting.id}
            className="bg-card border rounded-lg p-4 space-y-3"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-medium text-foreground">
                  {meeting.title || 'Reunião sem título'}
                </h3>
                <div className="flex items-center text-sm text-muted-foreground space-x-2 mt-1">
                  <span>
                    {formatDate(meeting.startedAt)} às {formatTime(meeting.startedAt)}
                  </span>
                  {meeting.durationSeconds && (
                    <>
                      <span>•</span>
                      <span>{formatDuration(meeting.durationSeconds)}</span>
                    </>
                  )}
                </div>
              </div>
              <Badge variant={getStatusBadgeVariant(meeting.status)}>
                {getStatusText(meeting.status)}
              </Badge>
            </div>

            {meeting.seller && (
              <div className="flex items-center space-x-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="bg-freelaw-primary text-white text-xs">
                    {getInitials(meeting.seller.fullName || meeting.seller.email)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground">
                  {meeting.seller.fullName || meeting.seller.email}
                </span>
              </div>
            )}

            {meeting.analysis && (
              <div className="flex items-center space-x-2">
                <Badge variant={getScoreBadgeVariant(meeting.analysis.scriptScore)}>
                  {meeting.analysis.scriptScore}/100
                </Badge>
                <Badge variant={getIcpBadgeVariant(meeting.analysis.icpFit)}>
                  ICP {meeting.analysis.icpFit.toUpperCase()}
                </Badge>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-muted-foreground capitalize bg-muted px-2 py-1 rounded">
                {meeting.source}
              </span>
              
              <div className="flex items-center space-x-2">
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/meetings/${meeting.id}`}>
                    <Eye className="h-3 w-3 mr-1" />
                    Ver
                  </Link>
                </Button>
                
                {meeting.urlFathom && (
                  <Button size="sm" variant="ghost" asChild>
                    <a
                      href={meeting.urlFathom}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}