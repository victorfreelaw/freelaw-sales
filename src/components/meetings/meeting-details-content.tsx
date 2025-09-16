'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScriptChecklist } from './script-checklist';
import { ICPAnalysis } from './icp-analysis';
import { HighlightsTimeline } from './highlights-timeline';
import { TranscriptViewer } from './transcript-viewer';
import { EnhancedAnalysis } from './enhanced-analysis';
import { FullAnalysisReportView } from './full-analysis-report';
import { MeetingChat } from './meeting-chat';
import { 
  ArrowLeft, 
  ExternalLink, 
  Calendar, 
  Clock, 
  User, 
  Share2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Copy,
  TrendingUp
} from 'lucide-react';
import { formatDate, formatTime, formatDuration, getInitials } from '@/lib/utils';
import Link from 'next/link';
import { MeetingDetails } from '@/lib/meeting-details-data';

interface MeetingDetailsContentProps {
  meeting: MeetingDetails;
  currentUser: {
    id: string;
    role: string;
    fullName?: string;
    email: string;
  };
}

export function MeetingDetailsContent({ meeting, currentUser }: MeetingDetailsContentProps) {
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'processing': return 'warning'; 
      case 'pending': return 'secondary';
      case 'failed': return 'error';
      default: return 'secondary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Analisada';
      case 'processing': return 'Processando';
      case 'pending': return 'Pendente';
      case 'failed': return 'Erro';
      default: return status;
    }
  };

  const handleCopyMeetingUrl = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  const handleShareSummary = () => {
    if (meeting.analysis) {
      const summary = `📊 Resumo da Reunião: ${meeting.title}\n\n${meeting.analysis.summary}\n\n🎯 Score: ${meeting.analysis.scriptScore}/100\n📈 ICP: ${meeting.analysis.icpFit.toUpperCase()}\n\n${meeting.urlFathom ? `🎬 Gravação: ${meeting.urlFathom}` : ''}`;
      navigator.clipboard.writeText(summary);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link 
              href="/meetings" 
              className="flex items-center gap-1 hover:text-freelaw-primary transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Reuniões
            </Link>
            <span>/</span>
            <span className="text-foreground">Detalhes</span>
          </div>

          {/* Title and Info */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-freelaw-primary mb-2">
              {meeting.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>
                  {formatDate(meeting.startedAt)} às {formatTime(meeting.startedAt)}
                </span>
              </div>
              
              {meeting.durationSeconds && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{formatDuration(meeting.durationSeconds)}</span>
                </div>
              )}
              
              <Badge variant={getStatusBadgeVariant(meeting.status)}>
                {getStatusText(meeting.status)}
              </Badge>
              
              <Badge variant="outline" className="capitalize">
                {meeting.source}
              </Badge>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {meeting.analysis && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleShareSummary}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Compartilhar
            </Button>
          )}
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleCopyMeetingUrl}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copiar Link
          </Button>
          
          {meeting.urlFathom && (
            <Button size="sm" asChild>
              <a
                href={meeting.urlFathom}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Ver Gravação
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Seller Info & Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* Seller Card */}
        {meeting.seller && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-freelaw-primary text-white">
                    {getInitials(meeting.seller.fullName || meeting.seller.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {meeting.seller.fullName || meeting.seller.email}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {meeting.seller.role}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        {meeting.analysis && (
          <>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-freelaw-primary">
                  {meeting.analysis.scriptScore}
                </div>
                <div className="text-xs text-muted-foreground">Script Score</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-freelaw-success">
                  {meeting.analysis.icpFit.toUpperCase()}
                </div>
                <div className="text-xs text-muted-foreground">ICP Fit</div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Sync Status */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>HubSpot</span>
                {meeting.syncStatus?.hubspot === 'completed' ? (
                  <CheckCircle2 className="h-4 w-4 text-freelaw-success" />
                ) : meeting.syncStatus?.hubspot === 'failed' ? (
                  <AlertCircle className="h-4 w-4 text-freelaw-error" />
                ) : (
                  <RefreshCw className="h-4 w-4 text-muted-foreground animate-spin" />
                )}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Slack</span>
                {meeting.syncStatus?.slack === 'completed' ? (
                  <CheckCircle2 className="h-4 w-4 text-freelaw-success" />
                ) : meeting.syncStatus?.slack === 'failed' ? (
                  <AlertCircle className="h-4 w-4 text-freelaw-error" />
                ) : (
                  <RefreshCw className="h-4 w-4 text-muted-foreground animate-spin" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analysis Content */}
      {meeting.status === 'completed' && meeting.analysis ? (
        <div className="space-y-6">
          {meeting.analysis.fullReport ? (
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                <FullAnalysisReportView
                  report={meeting.analysis.fullReport}
                  scriptScore={meeting.analysis.scriptScore}
                  icpFit={meeting.analysis.icpFit}
                />
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Resumo Executivo</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <p className="text-muted-foreground leading-relaxed">
                      {meeting.analysis.summary}
                    </p>
                  </CardContent>
                </Card>

                {meeting.transcript && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Transcrição</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm">
                      <p className="text-muted-foreground line-clamp-6">
                        {meeting.transcript.rawText?.substring(0, 300)}...
                      </p>
                      <Button variant="outline" size="sm" className="mt-2 w-full">
                        Ver Transcrição Completa
                      </Button>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Informações da Análise</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Processado em:</span>
                      <span>{formatDate(meeting.analysis.createdAt || new Date().toISOString())}</span>
                    </div>
                    {meeting.analysis.processingDurationMs && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tempo de processamento:</span>
                        <span>{Math.round(meeting.analysis.processingDurationMs / 1000)}s</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Modelo:</span>
                      <span>GPT-4o-mini</span>
                    </div>
                  </CardContent>
                </Card>

                <MeetingChat meetingId={meeting.id} disabled={!meeting.analysis.fullReport} />
              </div>
            </div>
          ) : meeting.analysis.scriptAnalysis || meeting.analysis.icpAnalysis || meeting.analysis.objectionsAnalysis ? (
            /* Enhanced analysis (compatibility mode) */
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                <EnhancedAnalysis analysis={meeting.analysis} />
              </div>
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Resumo Executivo</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <p className="text-muted-foreground leading-relaxed">
                      {meeting.analysis.icpAnalysis?.resumo_executivo || meeting.analysis.summary || 'Resumo não disponível'}
                    </p>
                  </CardContent>
                </Card>

                {meeting.transcript && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Transcrição</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm">
                      <p className="text-muted-foreground line-clamp-6">
                        {meeting.transcript.rawText?.substring(0, 300)}...
                      </p>
                      <Button variant="outline" size="sm" className="mt-2 w-full">
                        Ver Transcrição Completa
                      </Button>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Informações da Análise</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Processado em:</span>
                      <span>{formatDate(meeting.analysis.createdAt || new Date().toISOString())}</span>
                    </div>
                    {meeting.analysis.processingDurationMs && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tempo de processamento:</span>
                        <span>{Math.round(meeting.analysis.processingDurationMs / 1000)}s</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Modelo:</span>
                      <span>GPT-4o-mini</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            /* Legacy Analysis Format */
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Left Column - Transcript and Timeline */}
              <div className="lg:col-span-2 space-y-6">
                {/* Executive Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Resumo Executivo
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none">
                      <p className="text-muted-foreground leading-relaxed">
                        {meeting.analysis.summary}
                      </p>
                    </div>
                    
                    {meeting.analysis.nextAction && (
                      <>
                        <Separator className="my-4" />
                        <div>
                          <h4 className="font-medium mb-2">Próxima Ação Recomendada</h4>
                          <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                            {typeof meeting.analysis.nextAction === 'string' 
                              ? meeting.analysis.nextAction 
                              : meeting.analysis.nextAction.action || 'Ação não definida'
                            }
                          </p>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Transcript */}
                {meeting.transcript && (
                  <TranscriptViewer 
                    transcript={meeting.transcript}
                    highlights={meeting.analysis.highlights}
                  />
                )}

                {/* Highlights Timeline */}
                {(meeting.analysis.highlights || meeting.analysis.objections) && (
                  <HighlightsTimeline
                    highlights={meeting.analysis.highlights || []}
                    objections={meeting.analysis.objections || []}
                  />
                )}
              </div>

              {/* Right Column - Analysis Components */}
              <div className="space-y-6">
                {/* Script Checklist */}
                {meeting.analysis.scriptChecklist && (
                  <ScriptChecklist
                    checklist={meeting.analysis.scriptChecklist}
                    score={meeting.analysis.scriptScore}
                  />
                )}

                {/* ICP Analysis */}
                {meeting.analysis.icpCriteria && (
                  <ICPAnalysis
                    fit={meeting.analysis.icpFit}
                    criteria={meeting.analysis.icpCriteria}
                  />
                )}

                {/* Processing Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Informações da Análise</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Processado em:</span>
                      <span>{formatDate(meeting.analysis.createdAt)}</span>
                    </div>
                    {meeting.analysis.processingDurationMs && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tempo de processamento:</span>
                        <span>{Math.round(meeting.analysis.processingDurationMs / 1000)}s</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Modelo:</span>
                      <span>GPT-4o-mini</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Processing States */
        <div className="text-center py-12">
          {meeting.status === 'processing' && (
            <>
              <RefreshCw className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-spin" />
              <h3 className="text-lg font-semibold mb-2">Processando Análise</h3>
              <p className="text-muted-foreground">
                A transcrição está sendo analisada. Isso pode levar alguns minutos.
              </p>
            </>
          )}
          
          {meeting.status === 'pending' && (
            <>
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aguardando Processamento</h3>
              <p className="text-muted-foreground">
                A reunião está na fila para análise. Em breve será processada automaticamente.
              </p>
            </>
          )}
          
          {meeting.status === 'failed' && (
            <>
              <AlertCircle className="h-12 w-12 text-freelaw-error mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-freelaw-error">Erro no Processamento</h3>
              <p className="text-muted-foreground mb-4">
                Ocorreu um erro ao processar esta reunião. Nossa equipe foi notificada.
              </p>
              <Button variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar Novamente
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
