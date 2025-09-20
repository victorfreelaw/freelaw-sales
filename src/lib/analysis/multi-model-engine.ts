// Engine de análise multi-modelo
// Orquestra Gemini 1.5 Pro + GPT-4o para análises otimizadas

import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { EmbeddingSearchResult } from './embeddings';
import { parseModelJSON } from './utils';
import { SCRIPT_GUIDELINES, ICP_GUIDELINES } from './guidelines';
import type { FullAnalysisReport } from '@/types/analysis';

const GEMINI_PRO_MODEL = 'gemini-1.5-pro';

interface ModelOrchestrationConfig {
  openAIKey: string;
  geminiKey?: string;
  useGeminiForDeepAnalysis?: boolean;
  fallbackToOpenAI?: boolean;
}

interface AnalysisContext {
  meetingId: string;
  relevantChunks: EmbeddingSearchResult[];
  fullTranscript?: string;
  analysisType: 'script' | 'icp' | 'objections' | 'summary' | 'general';
}

interface ModelResponse {
  content: string;
  model: string;
  tokensUsed: number;
  processingTime: number;
}

class MultiModelEngine {
  private openai: OpenAI;
  private geminiClient: GoogleGenerativeAI | null = null;
  private config: ModelOrchestrationConfig;

  constructor(config: ModelOrchestrationConfig) {
    this.config = config;
    this.openai = new OpenAI({ apiKey: config.openAIKey });

    if (config.geminiKey) {
      this.geminiClient = new GoogleGenerativeAI(config.geminiKey);
    }
  }

  // Análise profunda usando Gemini 1.5 Pro (janela longa)
  async deepAnalysisWithGemini(
    context: AnalysisContext,
    prompt: string,
    systemPrompt: string
  ): Promise<ModelResponse> {
    if (!this.geminiClient) {
      throw new Error('Gemini API não configurada');
    }

    const startTime = Date.now();

    try {
      const contextContent = this.buildContextContent(context);

      const model = this.geminiClient.getGenerativeModel({ model: GEMINI_PRO_MODEL });
      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: `${contextContent}\n\n${prompt}` }]
          }
        ],
        systemInstruction: {
          role: 'system',
          parts: [{ text: systemPrompt }]
        },
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 6000
        }
      });

      const geminiResponse = result.response;
      const content = geminiResponse?.text() || '';
      const usage = geminiResponse?.usageMetadata;

      return {
        content,
        model: GEMINI_PRO_MODEL,
        tokensUsed:
          usage?.totalTokenCount ??
          (usage?.promptTokenCount || 0) + (usage?.candidatesTokenCount || 0),
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      console.error('Erro no Gemini:', error);

      if (this.config.fallbackToOpenAI) {
        console.log('Usando fallback para GPT-4o');
        return await this.consolidationWithGPT4o(context, prompt, systemPrompt);
      }

      throw error;
    }
  }

  // Consolidação e formatação usando GPT-4o
  async consolidationWithGPT4o(
    context: AnalysisContext,
    prompt: string,
    systemPrompt: string
  ): Promise<ModelResponse> {
    const startTime = Date.now();

    try {
      const contextContent = this.buildContextContent(context);
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `${contextContent}\n\n${prompt}`
          }
        ],
        temperature: 0.1,
        max_tokens: 4000,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content || '';
      
      return {
        content,
        model: 'gpt-4o',
        tokensUsed: response.usage?.total_tokens || 0,
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      console.error('Erro no GPT-4o:', error);
      throw error;
    }
  }

  // Análise de Script usando Gemini 1.5 (contexto longo)
  async analyzeScript(context: AnalysisContext, scriptGuidelines?: string): Promise<any> {
    const guidelines = scriptGuidelines?.trim()?.length ? scriptGuidelines : SCRIPT_GUIDELINES;
    const preferGemini = Boolean(this.config.useGeminiForDeepAnalysis && this.geminiClient);
    const systemPrompt = `Você é um especialista em análise de demos de vendas B2B para a Freelaw.

CONTEXTO CRÍTICO:
- Esta é uma demonstração de vendas da Freelaw para escritórios de advocacia
- Analise a aderência ao Script Demo oficial fornecido
- Avalie cada etapa do script com nota 0-10 e evidências específicas

DIRETRIZES DE ANÁLISE:
- Use apenas os trechos fornecidos como evidência
- Cite timestamps exatos quando disponíveis
- Seja específico sobre o que foi feito bem e o que pode melhorar
- Foque em resultados práticos e mensuráveis

SCRIPT DEMO OFICIAL:
${guidelines}`;

    const analysisPrompt = `Analise a aderência ao Script Demo desta reunião.

Para cada etapa do script, forneça:
1. Nota de 0-10
2. Justificativa da nota
3. Evidências específicas dos trechos (com timestamps)
4. O que faltou para nota 10/10

Retorne em formato JSON com a seguinte estrutura:
{
  "score_geral": number,
  "etapas": {
    "introducao": {
      "nota": number,
      "justificativa": "string",
      "evidencias_que_sustentam": ["string"],
      "faltou_para_10": ["string"]
    },
    "exploracao_cenario": { ... },
    "apresentacao_freelaw": { ... },
    "beneficios_escritorio": { ... },
    "metodologia": { ... },
    "como_funciona_delegacao": { ... },
    "conversa_com_prestador": { ... },
    "plano_ideal": { ... },
    "encerramento_follow_up": { ... }
  }
}`;

    if (preferGemini) {
      try {
        return await this.deepAnalysisWithGemini(context, analysisPrompt, systemPrompt);
      } catch (error: any) {
        if (error?.status === 429 || error?.error?.code === 'RESOURCE_EXHAUSTED') {
          console.warn('Limite de uso do Gemini atingido, voltando para GPT-4o (análise de script).');
          return await this.consolidationWithGPT4o(context, analysisPrompt, systemPrompt);
        }
        throw error;
      }
    }

    return await this.consolidationWithGPT4o(context, analysisPrompt, systemPrompt);
  }

  // Análise de ICP usando Gemini 1.5
  async analyzeICP(context: AnalysisContext, icpGuidelines?: string): Promise<any> {
    const guidelines = icpGuidelines?.trim()?.length ? icpGuidelines : ICP_GUIDELINES;
    const preferGemini = Boolean(this.config.useGeminiForDeepAnalysis && this.geminiClient);
    const systemPrompt = `Você é um especialista em qualificação de ICP (Ideal Customer Profile) para a Freelaw.

CONTEXTO CRÍTICO:
- Analise se este escritório se encaixa no ICP ideal da Freelaw
- Use os critérios oficiais fornecidos
- Foque em dados concretos mencionados na reunião

CRITÉRIOS ICP FREELAW:
${guidelines}`;

    const analysisPrompt = `Analise o fit de ICP deste cliente baseado nos trechos da reunião.

Avalie cada critério com nota 0-20 e forneça evidências específicas:

Retorne em formato JSON:
{
  "score_geral": number,
  "status": "high" | "medium" | "low",
  "criterios": {
    "tamanho_escritorio": {
      "nota": number,
      "classificacao": "alto" | "medio" | "baixo",
      "evidencia": "string com citação literal e timestamp"
    },
    "faturamento": { ... },
    "area_atuacao": { ... },
    "dores_identificadas": { ... },
    "poder_decisao": { ... }
  },
  "vale_insistir": {
    "recomendacao": "string",
    "condicoes": ["string"]
  },
  "observacoes": "string"
}`;

    if (preferGemini) {
      try {
        return await this.deepAnalysisWithGemini(context, analysisPrompt, systemPrompt);
      } catch (error: any) {
        if (error?.status === 429 || error?.error?.code === 'RESOURCE_EXHAUSTED') {
          console.warn('Limite de uso do Gemini atingido, voltando para GPT-4o (análise ICP).');
          return await this.consolidationWithGPT4o(context, analysisPrompt, systemPrompt);
        }
        throw error;
      }
    }

    return await this.consolidationWithGPT4o(context, analysisPrompt, systemPrompt);
  }

  // Análise de Objeções
  async analyzeObjections(context: AnalysisContext): Promise<any> {
    const systemPrompt = `Você é um especialista em análise de objeções em vendas B2B para a Freelaw.

FOQUE EM:
- Identificar objeções explícitas e implícitas
- Avaliar como foram tratadas pelo vendedor
- Sugerir respostas otimizadas para cada objeção
- Recomendar próximos passos dentro da demo`;

    const analysisPrompt = `Identifique e analise todas as objeções nesta reunião.

Para cada objeção encontrada, forneça:

Retorne em formato JSON:
{
  "kpis": {
    "total": number,
    "bem_tratadas": number,
    "perdidas": number,
    "score_medio": number
  },
  "lista": [
    {
      "categoria": "preço" | "necessidade" | "autoridade" | "timing" | "confiança",
      "objecao_detectada": "string",
      "cliente_citacao_ampliada": "string com contexto e timestamp",
      "avaliacao_resposta": {
        "nota": number,
        "racional": "string"
      },
      "resposta_sugerida": {
        "texto": "string",
        "por_que_funciona": "string"
      },
      "proximo_passo_demo": "string"
    }
  ]
}`;

    return await this.consolidationWithGPT4o(context, analysisPrompt, systemPrompt);
  }

  // Consolidação final usando GPT-4o para relatório estruturado
  async generateFinalReport(
    scriptAnalysis: any,
    icpAnalysis: any,
    objectionsAnalysis: any,
    context: AnalysisContext
  ): Promise<ModelResponse> {
    const systemPrompt = `Você é um especialista em consolidação de análises de vendas B2B para a Freelaw.

TAREFA: Consolidar as análises parciais em um relatório executivo final.

FOQUE EM:
- Resumo executivo claro e acionável
- Próxima ação recomendada específica
- Insights principais baseados em evidências
- Formatação JSON estruturada`;

    const consolidationPrompt = `Consolide as análises em um relatório final estruturado.

ANÁLISE DE SCRIPT:
${JSON.stringify(scriptAnalysis, null, 2)}

ANÁLISE DE ICP:
${JSON.stringify(icpAnalysis, null, 2)}

ANÁLISE DE OBJEÇÕES:
${JSON.stringify(objectionsAnalysis, null, 2)}

Retorne um relatório consolidado em formato JSON:
{
  "resumo_executivo": "string (2-3 frases concisas)",
  "aderencia_ao_script": { ... dados do script ... },
  "analise_icp": { ... dados do ICP ... },
  "analise_objecoes": { ... dados das objeções ... },
  "insights_principais": [
    "string"
  ],
  "pontos_positivos": [
    "string"
  ],
  "areas_melhoria": [
    "string"
  ],
  "proxima_acao_recomendada": {
    "acao": "string",
    "prazo": "string",
    "justificativa": "string"
  }
}`;

    return await this.consolidationWithGPT4o(context, consolidationPrompt, systemPrompt);
  }

  // Análise rápida para resumo usando GPT-4o-mini
  async quickSummary(context: AnalysisContext): Promise<ModelResponse> {
    const startTime = Date.now();

    try {
      const contextContent = this.buildContextContent(context, 500); // Contexto reduzido
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em resumos de reuniões de vendas. Crie um resumo executivo conciso focando nos pontos principais, decisões e próximos passos.'
          },
          {
            role: 'user',
            content: `${contextContent}\n\nCrie um resumo executivo desta reunião em 2-3 frases, focando no resultado principal e próxima ação.`
          }
        ],
        temperature: 0.1,
        max_tokens: 200
      });

      const content = response.choices[0]?.message?.content || '';
      
      return {
        content,
        model: 'gpt-4o-mini',
        tokensUsed: response.usage?.total_tokens || 0,
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      console.error('Erro no resumo rápido:', error);
      throw error;
    }
  }

  // Análise completa orquestrada
  async analyzeComplete(
    context: AnalysisContext,
    guidelines?: { script?: string; icp?: string }
  ): Promise<{
    report: FullAnalysisReport;
    stats: {
      totalTokens: number;
      processingTime: number;
      modelsUsed: string[];
    };
  }> {
    const startTime = Date.now();
    let totalTokens = 0;
    const modelsUsed: string[] = [];

    try {
      console.log('🔄 Iniciando análise multi-modelo...');

      // 1. Análises em paralelo para otimizar tempo
      const [scriptResult, icpResult, objectionsResult] = await Promise.all([
        this.analyzeScript(context, guidelines?.script),
        this.analyzeICP(context, guidelines?.icp),
        this.analyzeObjections(context)
      ]);

      totalTokens += scriptResult.tokensUsed + icpResult.tokensUsed + objectionsResult.tokensUsed;
      modelsUsed.push(scriptResult.model, icpResult.model, objectionsResult.model);

      // 2. Consolidação final
      const finalResult = await this.generateFinalReport(
        parseModelJSON(scriptResult.content, 'análise script'),
        parseModelJSON(icpResult.content, 'análise ICP'),
        parseModelJSON(objectionsResult.content, 'análise objeções'),
        context
      );

      totalTokens += finalResult.tokensUsed;
      modelsUsed.push(finalResult.model);

      const report = parseModelJSON<FullAnalysisReport>(
        finalResult.content,
        'relatório consolidado'
      );

      console.log('✅ Análise multi-modelo concluída');

      return {
        report,
        stats: {
          totalTokens,
          processingTime: Date.now() - startTime,
          modelsUsed: [...new Set(modelsUsed)]
        }
      };
    } catch (error) {
      console.error('❌ Erro na análise multi-modelo:', error);
      throw error;
    }
  }

  // Utilidades privadas
  private buildContextContent(context: AnalysisContext, maxLength?: number): string {
    let content = '=== TRECHOS RELEVANTES DA REUNIÃO ===\n\n';
    
    context.relevantChunks.forEach((chunk, index) => {
      const timestamp = this.formatTimestamp(chunk.startTime);
      content += `[${timestamp}] ${chunk.dominantSpeaker}:\n${chunk.content}\n\n`;
    });

    if (maxLength && content.length > maxLength) {
      content = content.substring(0, maxLength) + '...\n\n[CONTEÚDO TRUNCADO]';
    }

    return content;
  }

  private formatTimestamp(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // Testa disponibilidade dos modelos
  async testModels(): Promise<{ openai: boolean; gemini: boolean }> {
    const tests = {
      openai: false,
      gemini: false
    };

    try {
      await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1
      });
      tests.openai = true;
    } catch (error) {
      console.error('OpenAI não disponível:', error);
    }

    if (this.geminiClient) {
      try {
        const model = this.geminiClient.getGenerativeModel({ model: GEMINI_PRO_MODEL });
        await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: 'test' }] }],
          generationConfig: { maxOutputTokens: 1 }
        });
        tests.gemini = true;
      } catch (error) {
        console.error('Gemini não disponível:', error);
      }
    }

    return tests;
  }
}

// Factory function
export function createMultiModelEngine(): MultiModelEngine | null {
  const openAIKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!openAIKey) {
    console.error('OPENAI_API_KEY não configurada');
    return null;
  }

  return new MultiModelEngine({
    openAIKey,
    geminiKey,
    useGeminiForDeepAnalysis: !!geminiKey,
    fallbackToOpenAI: true
  });
}

export { MultiModelEngine, type AnalysisContext, type ModelResponse };
