'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Play, 
  Copy, 
  Download, 
  User,
  Clock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface TranscriptSegment {
  speaker: string;
  text: string;
  start: number;
  end: number;
  confidence?: number;
}

interface TranscriptViewerProps {
  transcript: {
    rawText: string;
    language: string;
    segments?: TranscriptSegment[];
    speakers?: Array<{
      id: string;
      name?: string;
      email?: string;
    }>;
  };
  highlights?: Array<{
    type: string;
    text: string;
    timestamp: number;
  }>;
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function TranscriptViewer({ transcript, highlights = [] }: TranscriptViewerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>('all');

  const handleCopyTranscript = () => {
    navigator.clipboard.writeText(transcript.rawText);
  };

  const handleDownloadTranscript = () => {
    const blob = new Blob([transcript.rawText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transcript.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Get unique speakers
  const speakers = transcript.speakers || [];
  const uniqueSpeakers = transcript.segments
    ? [...new Set(transcript.segments.map(s => s.speaker))]
    : [];

  // Filter segments based on search and speaker
  const filteredSegments = transcript.segments?.filter(segment => {
    const matchesSearch = !searchTerm || 
      segment.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      segment.speaker.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSpeaker = selectedSpeaker === 'all' || segment.speaker === selectedSpeaker;
    
    return matchesSearch && matchesSpeaker;
  }) || [];

  // Highlight search terms in text
  const highlightText = (text: string) => {
    if (!searchTerm) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.split(regex).map((part, i) => 
      regex.test(part) ? (
        <mark key={i} className="bg-freelaw-gold/20 text-freelaw-accent-dark px-1 rounded">
          {part}
        </mark>
      ) : part
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Transcrição da Reunião
            <Badge variant="outline" className="ml-2">
              {transcript.language?.toUpperCase() || 'PT-BR'}
            </Badge>
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleCopyTranscript}>
              <Copy className="h-4 w-4 mr-1" />
              Copiar
            </Button>
            <Button size="sm" variant="outline" onClick={handleDownloadTranscript}>
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          {/* Search and Filters */}
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar na transcrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {uniqueSpeakers.length > 1 && (
              <select
                value={selectedSpeaker}
                onChange={(e) => setSelectedSpeaker(e.target.value)}
                className="px-3 py-2 border border-input rounded-md bg-background"
              >
                <option value="all">Todos os falantes</option>
                {uniqueSpeakers.map((speaker) => (
                  <option key={speaker} value={speaker}>
                    {speaker}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Segmented Transcript */}
          {transcript.segments && transcript.segments.length > 0 ? (
            <div className="space-y-4">
              {filteredSegments.map((segment, index) => {
                // Find speaker info
                const speakerInfo = speakers.find(s => s.id === segment.speaker);
                const displayName = speakerInfo?.name || segment.speaker;
                
                // Check if this segment contains highlights
                const segmentHighlights = highlights.filter(h => 
                  Math.abs(h.timestamp - segment.start) < 30 // Within 30 seconds
                );
                
                return (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${
                      segmentHighlights.length > 0
                        ? 'border-freelaw-primary/30 bg-freelaw-primary/5'
                        : 'border-border bg-muted/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {displayName}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(segment.start)} - {formatTime(segment.end)}
                        </span>
                        {segment.confidence && segment.confidence < 0.8 && (
                          <Badge variant="outline" className="text-xs">
                            Baixa confiança
                          </Badge>
                        )}
                      </div>
                      
                      {segmentHighlights.length > 0 && (
                        <div className="flex gap-1">
                          {segmentHighlights.map((highlight, i) => (
                            <Badge key={i} variant="default" className="text-xs">
                              {highlight.type}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <p className="text-sm leading-relaxed">
                      {highlightText(segment.text)}
                    </p>
                  </div>
                );
              })}
              
              {filteredSegments.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Nenhum resultado encontrado para os filtros aplicados.</p>
                </div>
              )}
            </div>
          ) : (
            /* Raw Text Fallback */
            <div className="p-4 bg-muted/20 rounded-lg border">
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="secondary">Transcrição Completa</Badge>
                <span className="text-xs text-muted-foreground">
                  {transcript.rawText.length} caracteres
                </span>
              </div>
              
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {highlightText(transcript.rawText)}
                </p>
              </div>
            </div>
          )}

          {/* Transcript Stats */}
          <div className="mt-6 p-4 bg-muted/30 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-lg font-semibold">
                  {transcript.segments?.length || 1}
                </div>
                <div className="text-xs text-muted-foreground">Segmentos</div>
              </div>
              <div>
                <div className="text-lg font-semibold">
                  {uniqueSpeakers.length || 1}
                </div>
                <div className="text-xs text-muted-foreground">Participantes</div>
              </div>
              <div>
                <div className="text-lg font-semibold">
                  {Math.round(transcript.rawText.split(' ').length)}
                </div>
                <div className="text-xs text-muted-foreground">Palavras</div>
              </div>
              <div>
                <div className="text-lg font-semibold">
                  {highlights.length}
                </div>
                <div className="text-xs text-muted-foreground">Destaques</div>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}