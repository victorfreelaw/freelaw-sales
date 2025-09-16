'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { MessageSquare, Send, Sparkles } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface MeetingChatProps {
  meetingId: string;
  disabled?: boolean;
}

const DEFAULT_SUGGESTIONS = [
  'Mostre os trechos onde o cliente fala de sobrecarga.',
  'Escreva uma mensagem de follow-up personalizada com base nas dores e no ICP.',
  'Liste as objeções e proponha respostas, citando os pontos da demo.',
  'Por que a nota de "Metodologia" ficou abaixo de 6/10? Traga as evidências.',
];

export function MeetingChat({ meetingId, disabled }: MeetingChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async (question: string) => {
    if (!question.trim() || disabled) return;
    setIsLoading(true);
    setError(null);
    setMessages((prev) => [...prev, { role: 'user', content: question.trim() }]);
    setInput('');

    try {
      const response = await fetch(`/api/meetings/${meetingId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.trim() }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(data.error || 'Erro ao consultar chat');
      }

      const data = await response.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.answer || 'Sem resposta disponível.' }]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao consultar chat';
      setError(message);
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!input.trim()) return;
    handleSend(input.trim());
  };

  return (
    <Card className="border-muted/60">
      <CardHeader className="flex flex-row items-center gap-2">
        <MessageSquare className="h-5 w-5 text-freelaw-primary" />
        <CardTitle className="text-base font-semibold">Chat da Reunião</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Faça perguntas sobre a transcrição ou sobre o relatório. Respostas sempre trazem trechos literais com timestamp.
          </p>
          <div className="flex flex-wrap gap-2">
            {DEFAULT_SUGGESTIONS.map((suggestion) => (
              <Button
                key={suggestion}
                variant="outline"
                size="sm"
                disabled={isLoading || disabled}
                onClick={() => handleSend(suggestion)}
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        <div
          ref={containerRef}
          className="h-64 overflow-y-auto rounded-lg border border-muted/60 bg-muted/20 p-3 space-y-3"
        >
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma interação ainda. Escolha uma sugestão ou envie sua pergunta.
            </p>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={
                  message.role === 'user'
                    ? 'ml-auto max-w-[85%] rounded-lg bg-freelaw-primary/10 px-3 py-2 text-sm'
                    : 'mr-auto max-w-[95%] rounded-lg bg-background px-3 py-2 text-sm shadow'
                }
              >
                <p className="whitespace-pre-line text-foreground">{message.content}</p>
              </div>
            ))
          )}
        </div>

        {error && (
          <p className="text-xs text-red-500">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <textarea
            className="min-h-[90px] w-full rounded-lg border border-muted/60 bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-freelaw-primary"
            placeholder={disabled ? 'Chat indisponível sem relatório completo.' : 'Digite sua pergunta...'}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            disabled={isLoading || disabled}
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={isLoading || disabled || !input.trim()}>
              <Send className="mr-2 h-4 w-4" />
              {isLoading ? 'Enviando...' : 'Enviar'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
