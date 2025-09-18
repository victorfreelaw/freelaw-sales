// Chat Engine com RAG para reuniões longas
// Integra busca semântica com resposta contextual

import OpenAI from 'openai';
import { createAnalysisPipeline } from '../analysis/analysis-pipeline';
import { EmbeddingSearchResult } from '../analysis/embeddings';
import { SCRIPT_GUIDELINES, ICP_GUIDELINES } from '../analysis/guidelines';
import type { FullAnalysisReport } from '@/types/analysis';

interface RAGChatInput {
  question: string;
  meetingId: string;
  report?: FullAnalysisReport | null;
  maxResults?: number;
  includeTimestamps?: boolean;
}

interface RAGChatResponse {
  answer: string;
  relevantChunks: EmbeddingSearchResult[];
  processingTime: number;
  sourceType: 'rag' | 'report' | 'fallback';
}

export class RAGChatEngine {
  private openai: OpenAI;
  private pipeline: any;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
    this.pipeline = createAnalysisPipeline();
  }

  async answer(input: RAGChatInput): Promise<RAGChatResponse> {
    const startTime = Date.now();
    const { question, meetingId, report, maxResults = 5, includeTimestamps = true } = input;

    // Estratégia híbrida: RAG + Relatório + Fallback
    let sourceType: 'rag' | 'report' | 'fallback' = 'fallback';
    let relevantChunks: EmbeddingSearchResult[] = [];
    let answer: string;

    try {
      // 1. Tenta busca RAG primeiro (melhor contexto)
      if (this.pipeline) {
        const ragResult = await this.pipeline.chatWithMeeting(meetingId, question, maxResults);
        
        if (ragResult.relevantChunks.length > 0) {
          sourceType = 'rag';
          relevantChunks = ragResult.relevantChunks;
          answer = await this.generateRAGResponse(question, relevantChunks, report, includeTimestamps);
        } else {
          // 2. Fallback para análise do relatório
          if (report) {
            sourceType = 'report';
            answer = await this.generateReportResponse(question, report);
          } else {
            // 3. Resposta genérica baseada em conhecimento
            sourceType = 'fallback';
            answer = await this.generateFallbackResponse(question);
          }
        }
      } else {
        // Pipeline indisponível - usar relatório ou fallback
        if (report) {
          sourceType = 'report';
          answer = await this.generateReportResponse(question, report);
        } else {
          sourceType = 'fallback';
          answer = await this.generateFallbackResponse(question);
        }
      }

    } catch (error) {
      console.error('❌ Erro no RAG Chat:', error);
      sourceType = 'fallback';
      answer = 'Erro ao processar sua pergunta. Tente reformular ou entre em contato com o suporte.';
      relevantChunks = [];
    }

    return {
      answer,
      relevantChunks,
      processingTime: Date.now() - startTime,
      sourceType
    };
  }

  // Resposta baseada em RAG (melhor qualidade)
  private async generateRAGResponse(
    question: string,
    chunks: EmbeddingSearchResult[],
    report?: FullAnalysisReport | null,
    includeTimestamps: boolean = true
  ): Promise<string> {
    const systemPrompt = `Você é o especialista em análise de demos da Freelaw com acesso RAG completo.

CONTEXTO CRÍTICO:
- Esta é uma DEMONSTRAÇÃO de vendas da Freelaw para escritórios de advocacia
- Você tem trechos específicos recuperados por busca semântica
- Use evidências dos trechos fornecidos e do relatório quando disponível

DIRETRIZES:
- Cite sempre trechos literais entre aspas com timestamps [mm:ss]
- Priorize informações dos trechos RAG (mais relevantes)
- Complete com dados do relatório quando necessário
- Se não encontrar evidência, seja explícito
- Máximo 600 caracteres, objetivo e preciso

REFERÊNCIAS FREELAW:
${SCRIPT_GUIDELINES.slice(0, 1000)}

${ICP_GUIDELINES.slice(0, 1000)}`;

    const contextChunks = chunks.map(chunk => {
      const timestamp = this.formatTimestamp(chunk.startTime);
      return `[${timestamp}] ${chunk.dominantSpeaker}: "${chunk.content}"`;
    }).join('\n\n');

    const reportSummary = report ? 
      `RESUMO DO RELATÓRIO:
${JSON.stringify({
  score_geral: report.aderencia_ao_script?.score_geral,
  status_icp: report.analise_icp?.status,
  resumo: report.resumo_executivo
}, null, 2)}` : 'Relatório não disponível';

    const userPrompt = `PERGUNTA: ${question}

TRECHOS MAIS RELEVANTES (RAG):
${contextChunks}

${reportSummary}

Responda baseado nos trechos fornecidos, citando timestamps e evidências específicas.`;

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.1,
      max_tokens: 700,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    });

    return completion.choices[0]?.message?.content?.trim() || 'Não foi possível gerar resposta.';
  }

  // Resposta baseada no relatório apenas
  private async generateReportResponse(
    question: string,
    report: FullAnalysisReport
  ): Promise<string> {
    const systemPrompt = `Você é o especialista da Freelaw respondendo baseado no relatório de análise.

CONTEXTO:
- Responda usando apenas dados do relatório fornecido
- Cite informações específicas como notas, percentuais, status
- Indique sempre "(do relatório de análise)"
- Máximo 500 caracteres

FOCO: Performance da demo baseada no Script oficial e critérios ICP.`;

    const userPrompt = `RELATÓRIO DE ANÁLISE:
${JSON.stringify(report, null, 2)}

PERGUNTA: ${question}

Responda baseado exclusivamente no relatório, citando dados específicos.`;

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.1,
      max_tokens: 600,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    });

    return completion.choices[0]?.message?.content?.trim() || 'Não foi possível analisar o relatório.';
  }

  // Resposta genérica (último recurso)
  private async generateFallbackResponse(question: string): Promise<string> {
    const systemPrompt = `Você é um consultor da Freelaw. Sem acesso aos dados específicos da reunião, responda de forma geral sobre vendas B2B, análise de demos ou critérios da Freelaw.

IMPORTANTE: 
- Deixe claro que não tem acesso aos dados específicos da reunião
- Ofereça insights gerais relevantes à pergunta
- Sugira que a análise completa seja feita após processamento
- Máximo 400 caracteres

CONHECIMENTO FREELAW:
- 7 anos no mercado, 700+ escritórios atendidos
- Foco em delegação de processos previdenciários
- Script Demo estruturado para vendas consultivas`;

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      max_tokens: 500,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Pergunta: ${question}` }
      ]
    });

    return completion.choices[0]?.message?.content?.trim() || 
           'Não tenho acesso aos dados específicos desta reunião. Aguarde o processamento completo da análise.';
  }

  // Busca especializada por tipo de pergunta
  async searchByIntent(
    meetingId: string,
    question: string,
    intent: 'script' | 'icp' | 'objections' | 'general'
  ): Promise<EmbeddingSearchResult[]> {
    if (!this.pipeline) return [];

    try {
      switch (intent) {
        case 'script':
          const scriptResults = await this.pipeline.ragService.searchForScriptAnalysis(meetingId);
          return Object.values(scriptResults).flat().slice(0, 5);
        
        case 'icp':
          const icpResults = await this.pipeline.ragService.searchForICPAnalysis(meetingId);
          return Object.values(icpResults).flat().slice(0, 5);
        
        case 'objections':
          return await this.pipeline.ragService.searchForObjectionsAnalysis(meetingId);
        
        default:
          return await this.pipeline.ragService.searchForChat(meetingId, question, 5);
      }
    } catch (error) {
      console.error('❌ Erro na busca por intenção:', error);
      return [];
    }
  }

  // Detecta intenção da pergunta
  private detectIntent(question: string): 'script' | 'icp' | 'objections' | 'general' {
    const normalized = question.toLowerCase();
    
    if (/(nota|score|script|demo|etapa|metodologia|abertura|encerramento)/i.test(normalized)) {
      return 'script';
    }
    
    if (/(icp|ideal|customer|profile|tamanho|faturamento|escritório|fit)/i.test(normalized)) {
      return 'icp';
    }
    
    if (/(objeção|preço|caro|não preciso|já tenho|vou pensar)/i.test(normalized)) {
      return 'objections';
    }
    
    return 'general';
  }

  // Busca inteligente com detecção de intenção
  async smartSearch(meetingId: string, question: string): Promise<RAGChatResponse> {
    const intent = this.detectIntent(question);
    const relevantChunks = await this.searchByIntent(meetingId, question, intent);
    
    const startTime = Date.now();
    let answer: string;

    if (relevantChunks.length > 0) {
      answer = await this.generateRAGResponse(question, relevantChunks, null, true);
    } else {
      answer = await this.generateFallbackResponse(question);
    }

    return {
      answer,
      relevantChunks,
      processingTime: Date.now() - startTime,
      sourceType: relevantChunks.length > 0 ? 'rag' : 'fallback'
    };
  }

  // Sugere perguntas relacionadas baseado no contexto
  async suggestQuestions(meetingId: string): Promise<string[]> {
    const suggestions = [
      'Qual foi a nota geral do script demo e por quê?',
      'Este cliente se encaixa no ICP ideal da Freelaw?',
      'Quais objeções foram identificadas e como foram tratadas?',
      'Cite os momentos onde o cliente demonstrou interesse real.',
      'O que faltou para ter uma nota 10/10 na metodologia?',
      'Qual o próximo passo recomendado com este cliente?'
    ];

    // TODO: Implementar geração dinâmica baseada na análise
    // Por enquanto retorna sugestões estáticas
    return suggestions;
  }

  // Health check do sistema RAG
  async healthCheck(): Promise<{
    rag: boolean;
    openai: boolean;
    pipeline: boolean;
  }> {
    const health = {
      rag: false,
      openai: false,
      pipeline: false
    };

    try {
      // Testa OpenAI
      await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'test' }]
      });
      health.openai = true;
    } catch (error) {
      console.error('OpenAI indisponível:', error);
    }

    try {
      // Testa pipeline
      if (this.pipeline) {
        const systemHealth = await this.pipeline.getSystemHealth();
        health.pipeline = systemHealth.ragService;
        health.rag = systemHealth.ragService && systemHealth.multiModel;
      }
    } catch (error) {
      console.error('Pipeline indisponível:', error);
    }

    return health;
  }

  // Utilidades
  private formatTimestamp(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}

// Factory function
export function createRAGChatEngine(): RAGChatEngine | null {
  const openAIKey = process.env.OPENAI_API_KEY;
  
  if (!openAIKey) {
    console.error('OPENAI_API_KEY não configurada para RAG Chat');
    return null;
  }

  return new RAGChatEngine(openAIKey);
}

export { type RAGChatInput, type RAGChatResponse };