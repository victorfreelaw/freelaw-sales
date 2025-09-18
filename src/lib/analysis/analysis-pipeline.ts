// Pipeline de Análise Completa em 4 Camadas
// Orquestra todo o sistema RAG + Multi-modelo para análises de reuniões longas

import { createRAGService, RAGService, RAGProcessResult } from './rag-service';
import { createMultiModelEngine, MultiModelEngine, AnalysisContext } from './multi-model-engine';
import { EmbeddingSearchResult } from './embeddings';
import type { FullAnalysisReport } from '@/types/analysis';

interface PipelineConfig {
  meetingId: string;
  rawTranscript: string;
  analysisTypes?: ('script' | 'icp' | 'objections' | 'summary')[];
  enableRAGCaching?: boolean;
  useAnthropicForDeepAnalysis?: boolean;
}

interface PipelineResult {
  success: boolean;
  meetingId: string;
  report: FullAnalysisReport;
  processingStats: {
    totalTokens: number;
    processingTime: number;
    modelsUsed: string[];
    ragStats: RAGProcessResult;
  };
  rawAnalyses: {
    script?: any;
    icp?: any;
    objections?: any;
  };
}

class AnalysisPipeline {
  private ragService: RAGService;
  private multiModelEngine: MultiModelEngine;

  constructor(ragService: RAGService, multiModelEngine: MultiModelEngine) {
    this.ragService = ragService;
    this.multiModelEngine = multiModelEngine;
  }

  // CAMADA 1: Processamento e Indexação RAG
  async layer1_ProcessAndIndex(
    meetingId: string, 
    rawTranscript: string
  ): Promise<RAGProcessResult> {
    console.log('🔄 CAMADA 1: Processamento RAG iniciado...');
    
    const ragResult = await this.ragService.processTranscript(meetingId, rawTranscript);
    
    console.log(`✅ CAMADA 1: ${ragResult.totalChunks} chunks processados em ${ragResult.processingTime}ms`);
    return ragResult;
  }

  // CAMADA 2: Análises Especializadas com RAG
  async layer2_SpecializedAnalyses(
    meetingId: string,
    analysisTypes: ('script' | 'icp' | 'objections')[]
  ): Promise<{
    relevantChunks: Record<string, EmbeddingSearchResult[]>;
    analyses: Record<string, any>;
    tokensUsed: number;
    modelsUsed: string[];
  }> {
    console.log('🔄 CAMADA 2: Análises especializadas iniciadas...');
    
    const relevantChunks: Record<string, EmbeddingSearchResult[]> = {};
    const analyses: Record<string, any> = {};
    let totalTokens = 0;
    const modelsUsed: string[] = [];

    // Busca RAG para cada tipo de análise
    for (const analysisType of analysisTypes) {
      console.log(`🔍 Buscando chunks relevantes para análise: ${analysisType}`);
      
      let chunks: EmbeddingSearchResult[] = [];
      
      switch (analysisType) {
        case 'script':
          const scriptChunks = await this.ragService.searchForScriptAnalysis(meetingId);
          chunks = Object.values(scriptChunks).flat();
          break;
        case 'icp':
          const icpChunks = await this.ragService.searchForICPAnalysis(meetingId);
          chunks = Object.values(icpChunks).flat();
          break;
        case 'objections':
          chunks = await this.ragService.searchForObjectionsAnalysis(meetingId);
          break;
      }

      relevantChunks[analysisType] = chunks;

      // Análise com modelo especializado
      if (chunks.length > 0) {
        const context: AnalysisContext = {
          meetingId,
          relevantChunks: chunks,
          analysisType
        };

        let result;
        switch (analysisType) {
          case 'script':
            result = await this.multiModelEngine.analyzeScript(context);
            break;
          case 'icp':
            result = await this.multiModelEngine.analyzeICP(context);
            break;
          case 'objections':
            result = await this.multiModelEngine.analyzeObjections(context);
            break;
        }

        analyses[analysisType] = JSON.parse(result.content);
        totalTokens += result.tokensUsed;
        
        if (!modelsUsed.includes(result.model)) {
          modelsUsed.push(result.model);
        }

        console.log(`✅ ${analysisType} análise concluída (${result.tokensUsed} tokens)`);
      }
    }

    console.log(`✅ CAMADA 2: Todas as análises concluídas (${totalTokens} tokens)`);
    
    return {
      relevantChunks,
      analyses,
      tokensUsed: totalTokens,
      modelsUsed
    };
  }

  // CAMADA 3: Consolidação e Relatório Final
  async layer3_ConsolidateReport(
    analyses: Record<string, any>,
    meetingId: string,
    allRelevantChunks: Record<string, EmbeddingSearchResult[]>
  ): Promise<{ report: FullAnalysisReport; tokensUsed: number; model: string }> {
    console.log('🔄 CAMADA 3: Consolidação do relatório iniciada...');

    // Combina todos os chunks relevantes para contexto da consolidação
    const combinedChunks = Object.values(allRelevantChunks).flat();
    const uniqueChunks = this.deduplicateChunks(combinedChunks);

    const context: AnalysisContext = {
      meetingId,
      relevantChunks: uniqueChunks,
      analysisType: 'summary'
    };

    const consolidationResult = await this.multiModelEngine.generateFinalReport(
      analyses.script || {},
      analyses.icp || {},
      analyses.objections || {},
      context
    );

    const report = JSON.parse(consolidationResult.content) as FullAnalysisReport;

    console.log(`✅ CAMADA 3: Relatório consolidado (${consolidationResult.tokensUsed} tokens)`);

    return {
      report,
      tokensUsed: consolidationResult.tokensUsed,
      model: consolidationResult.model
    };
  }

  // CAMADA 4: Preparação para Chat RAG
  async layer4_PrepareRAGChat(
    meetingId: string,
    report: FullAnalysisReport
  ): Promise<{ 
    chatReady: boolean; 
    indexedChunks: number;
    quickSummary: string;
  }> {
    console.log('🔄 CAMADA 4: Preparação do chat RAG iniciada...');

    // Verifica se o RAG está pronto para consultas
    const stats = await this.ragService.getStats(meetingId);
    const chatReady = stats.totalChunks > 0;

    // Gera resumo rápido para o chat
    const context: AnalysisContext = {
      meetingId,
      relevantChunks: [], // Chat usará busca dinâmica
      analysisType: 'summary'
    };

    const summaryResult = await this.multiModelEngine.quickSummary(context);

    console.log(`✅ CAMADA 4: Chat RAG preparado (${stats.totalChunks} chunks indexados)`);

    return {
      chatReady,
      indexedChunks: stats.totalChunks,
      quickSummary: summaryResult.content
    };
  }

  // Pipeline Completo
  async executeFullPipeline(config: PipelineConfig): Promise<PipelineResult> {
    const startTime = Date.now();
    const {
      meetingId,
      rawTranscript,
      analysisTypes = ['script', 'icp', 'objections'],
      enableRAGCaching = true,
      useAnthropicForDeepAnalysis = true
    } = config;

    console.log(`🚀 Iniciando pipeline completo para reunião ${meetingId}`);
    console.log(`📋 Tipos de análise: ${analysisTypes.join(', ')}`);

    try {
      // CAMADA 1: Processamento RAG
      const ragResult = await this.layer1_ProcessAndIndex(meetingId, rawTranscript);

      // CAMADA 2: Análises Especializadas
      const layer2Result = await this.layer2_SpecializedAnalyses(meetingId, analysisTypes);

      // CAMADA 3: Consolidação
      const layer3Result = await this.layer3_ConsolidateReport(
        layer2Result.analyses,
        meetingId,
        layer2Result.relevantChunks
      );

      // CAMADA 4: Preparação Chat
      const layer4Result = await this.layer4_PrepareRAGChat(meetingId, layer3Result.report);

      const totalProcessingTime = Date.now() - startTime;
      const totalTokens = layer2Result.tokensUsed + layer3Result.tokensUsed;
      const allModelsUsed = [...layer2Result.modelsUsed, layer3Result.model];

      const result: PipelineResult = {
        success: true,
        meetingId,
        report: layer3Result.report,
        processingStats: {
          totalTokens,
          processingTime: totalProcessingTime,
          modelsUsed: [...new Set(allModelsUsed)],
          ragStats: ragResult
        },
        rawAnalyses: layer2Result.analyses
      };

      console.log('🎉 Pipeline completo executado com sucesso!');
      console.log(`📊 Stats: ${totalTokens} tokens, ${totalProcessingTime}ms, ${allModelsUsed.length} modelos`);

      return result;

    } catch (error) {
      console.error('❌ Erro no pipeline de análise:', error);
      
      return {
        success: false,
        meetingId,
        report: {} as FullAnalysisReport,
        processingStats: {
          totalTokens: 0,
          processingTime: Date.now() - startTime,
          modelsUsed: [],
          ragStats: {} as RAGProcessResult
        },
        rawAnalyses: {}
      };
    }
  }

  // Pipeline Rápido (só resumo)
  async executeQuickAnalysis(meetingId: string, rawTranscript: string): Promise<{
    success: boolean;
    summary: string;
    processingTime: number;
  }> {
    const startTime = Date.now();

    try {
      console.log(`⚡ Executando análise rápida para ${meetingId}`);

      // Processa RAG primeiro
      await this.layer1_ProcessAndIndex(meetingId, rawTranscript);

      // Busca trechos mais relevantes para resumo
      const relevantChunks = await this.ragService.searchForAnalysis(
        meetingId,
        'resumo pontos principais decisões próximos passos',
        { maxResults: 10, minSimilarity: 0.6 }
      );

      const context: AnalysisContext = {
        meetingId,
        relevantChunks,
        analysisType: 'summary'
      };

      const summaryResult = await this.multiModelEngine.quickSummary(context);

      return {
        success: true,
        summary: summaryResult.content,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('❌ Erro na análise rápida:', error);
      return {
        success: false,
        summary: 'Erro ao processar análise rápida',
        processingTime: Date.now() - startTime
      };
    }
  }

  // Chat RAG em tempo real
  async chatWithMeeting(
    meetingId: string,
    question: string,
    maxResults: number = 5
  ): Promise<{
    answer: string;
    relevantChunks: EmbeddingSearchResult[];
    processingTime: number;
  }> {
    const startTime = Date.now();

    try {
      // Busca chunks relevantes para a pergunta
      const relevantChunks = await this.ragService.searchForChat(meetingId, question, maxResults);

      if (relevantChunks.length === 0) {
        return {
          answer: 'Não encontrei informações relevantes sobre essa pergunta na reunião.',
          relevantChunks: [],
          processingTime: Date.now() - startTime
        };
      }

      // Gera resposta baseada nos chunks encontrados
      const context: AnalysisContext = {
        meetingId,
        relevantChunks,
        analysisType: 'general'
      };

      // Usa o modelo mais rápido para chat
      const chatResult = await this.multiModelEngine.quickSummary(context);

      return {
        answer: chatResult.content,
        relevantChunks,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('❌ Erro no chat RAG:', error);
      return {
        answer: 'Erro ao processar sua pergunta.',
        relevantChunks: [],
        processingTime: Date.now() - startTime
      };
    }
  }

  // Utilidades
  private deduplicateChunks(chunks: EmbeddingSearchResult[]): EmbeddingSearchResult[] {
    const seen = new Set<string>();
    return chunks.filter(chunk => {
      if (seen.has(chunk.chunkId)) return false;
      seen.add(chunk.chunkId);
      return true;
    });
  }

  // Diagnósticos do sistema
  async getSystemHealth(): Promise<{
    ragService: boolean;
    multiModel: boolean;
    totalMeetingsIndexed: number;
    storageStats: any;
  }> {
    try {
      const ragHealth = await this.ragService.testConnection();
      const modelHealth = await this.multiModelEngine.testModels();
      const stats = await this.ragService.getStats();

      return {
        ragService: ragHealth,
        multiModel: modelHealth.openai && (modelHealth.anthropic || true), // Anthropic é opcional
        totalMeetingsIndexed: stats.totalMeetings || 0,
        storageStats: stats
      };
    } catch (error) {
      console.error('❌ Erro ao verificar saúde do sistema:', error);
      return {
        ragService: false,
        multiModel: false,
        totalMeetingsIndexed: 0,
        storageStats: {}
      };
    }
  }
}

// Factory function para criar pipeline
export function createAnalysisPipeline(): AnalysisPipeline | null {
  const ragService = createRAGService();
  const multiModelEngine = createMultiModelEngine();

  if (!ragService || !multiModelEngine) {
    console.error('❌ Não foi possível inicializar o pipeline de análise');
    return null;
  }

  console.log('✅ Pipeline de análise inicializado com sucesso');
  return new AnalysisPipeline(ragService, multiModelEngine);
}

export {
  AnalysisPipeline,
  type PipelineConfig,
  type PipelineResult
};