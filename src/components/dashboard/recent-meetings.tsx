import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDate, formatTime, getInitials } from '@/lib/utils';
import { ExternalLink, Clock, Calendar } from 'lucide-react';
import Link from 'next/link';

interface Meeting {
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

interface RecentMeetingsProps {
  meetings: Meeting[];
}

export function RecentMeetings({ meetings }: RecentMeetingsProps) {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reuniões Recentes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {meetings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma reunião encontrada</p>
              <p className="text-sm">
                Reuniões do Fathom aparecerão aqui automaticamente
              </p>
            </div>
          ) : (
            meetings.map((meeting) => (
              <div
                key={meeting.id}
                className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-freelaw-primary text-white">
                      {getInitials(meeting.seller?.fullName || meeting.seller?.email || 'U')}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Link
                        href={`/meetings/${meeting.id}`}
                        className="font-medium text-foreground hover:text-freelaw-primary transition-colors truncate"
                      >
                        {meeting.title}
                      </Link>
                      {meeting.urlFathom && (
                        <a
                          href={meeting.urlFathom}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-freelaw-primary"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    
                    <div className="flex items-center text-sm text-muted-foreground space-x-3">
                      <span>{formatDate(meeting.startedAt)} às {formatTime(meeting.startedAt)}</span>
                      {meeting.durationSeconds && (
                        <span className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {Math.round(meeting.durationSeconds / 60)}min
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
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
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}