// Serviço RAG integrado para análise inteligente de reuniões
// Combina chunking, embeddings e busca semântica

import { 
  processTranscriptForAnalysis, 
  TranscriptChunk, 
  findChunksByTimeRange,
  findChunksBySpeaker 
} from './chunking';
import { 
  EmbeddingService, 
  TopicExtractor, 
  ChunkEmbedding, 
  EmbeddingSearchResult 
} from './embeddings';
import { 
  createSupabaseVectorStore, 
  SupabaseVectorStore,
  SearchFilters 
} from './supabase-vector';
import crypto from 'crypto';

interface RAGProcessResult {
  meetingId: string;
  totalChunks: number;
  processedEmbeddings: number;
  processingTime: number;
  stats: {
    totalTokens: number;
    speakers: string[];
    duration: number;
    avgChunkSize: number;
  };
}

interface RAGSearchOptions {
  analysisType?: 'script' | 'icp' | 'objections' | 'general';
  timeRange?: { start: number; end: number };
  speakers?: string[];
  topics?: string[];
  maxResults?: number;
  minSimilarity?: number;
  useCache?: boolean;
}

class RAGService {
  private embeddingService: EmbeddingService;
  private topicExtractor: TopicExtractor;
  private vectorStore: SupabaseVectorStore | null;
  private devModeCache: Map<string, any> = new Map();

  constructor(openAIKey: string) {
    this.embeddingService = new EmbeddingService(openAIKey);
    this.topicExtractor = new TopicExtractor(openAIKey);
    this.vectorStore = createSupabaseVectorStore();
  }

  // Processa transcrição completa e armazena embeddings
  async processTranscript(meetingId: string, rawTranscript: string): Promise<RAGProcessResult> {
    const startTime = Date.now();
    
    console.log(`🔄 Iniciando processamento RAG para reunião ${meetingId}`);

    try {
      // 1. Chunking inteligente
      const { chunks, stats } = processTranscriptForAnalysis(rawTranscript);
      console.log(`✅ Criados ${chunks.length} chunks (${stats.totalTokens} tokens)`);

      // 2. Extração de tópicos (em paralelo para otimizar)
      console.log('🔄 Extraindo tópicos...');
      const topicsMap = await this.topicExtractor.extractTopicsFromChunks(chunks);

      // 3. Geração de embeddings
      console.log('🔄 Gerando embeddings...');
      const embeddings = await this.embeddingService.generateEmbeddingsForChunks(chunks);
      
      // Adiciona tópicos aos embeddings
      embeddings.forEach(embedding => {
        embedding.meetingId = meetingId;
        embedding.topics = topicsMap[embedding.chunkId] || [];
      });

      console.log(`✅ Gerados ${embeddings.length} embeddings`);

      // 4. Armazenamento
      let storedCount = 0;
      if (this.vectorStore) {
        const success = await this.vectorStore.storeChunkEmbeddings(embeddings);
        storedCount = success ? embeddings.length : 0;
        console.log(`✅ Armazenados ${storedCount} embeddings no Supabase`);
      } else {
        // Fallback: armazenar em cache local para dev
        this.devModeCache.set(`embeddings_${meetingId}`, {
          embeddings,
          chunks,
          stats,
          createdAt: new Date()
        });
        storedCount = embeddings.length;
        console.log(`✅ Armazenados ${storedCount} embeddings em cache local (dev mode)`);
      }

      const processingTime = Date.now() - startTime;

      return {
        meetingId,
        totalChunks: chunks.length,
        processedEmbeddings: storedCount,
        processingTime,
        stats: {
          totalTokens: stats.totalTokens,
          speakers: stats.speakers,
          duration: stats.duration,
          avgChunkSize: stats.averageChunkSize
        }
      };
    } catch (error) {
      console.error('❌ Erro no processamento RAG:', error);
      throw new Error(`Falha no processamento RAG: ${error}`);
    }
  }

  // Busca contextual para análises específicas
  async searchForAnalysis(
    meetingId: string, 
    query: string, 
    options: RAGSearchOptions = {}
  ): Promise<EmbeddingSearchResult[]> {
    const {
      analysisType = 'general',
      timeRange,
      speakers,
      topics,
      maxResults = 10,
      minSimilarity = 0.7,
      useCache = true
    } = options;

    try {
      // Verifica cache se habilitado
      if (useCache) {
        const cached = await this.getCachedSearchResult(meetingId, analysisType, query, options);
        if (cached) {
          console.log(`📋 Cache hit para ${analysisType} analysis`);
          return cached;
        }
      }

      let results: EmbeddingSearchResult[] = [];

      if (this.vectorStore) {
        // Busca no Supabase
        const queryEmbedding = await this.embeddingService.generateEmbedding(query);
        
        const filters: SearchFilters = {
          timeRange,
          speakers,
          topics,
          minSimilarity
        };

        results = await this.vectorStore.searchSimilarChunks(
          queryEmbedding,
          meetingId,
          maxResults,
          minSimilarity,
          filters
        );
      } else {
        // Fallback: busca em cache local
        results = await this.searchInDevCache(meetingId, query, options);
      }

      // Salva resultado em cache
      if (useCache && results.length > 0) {
        await this.cacheSearchResult(meetingId, analysisType, query, options, results);
      }

      console.log(`🔍 Encontrados ${results.length} chunks relevantes para "${query}"`);
      return results;
    } catch (error) {
      console.error('❌ Erro na busca RAG:', error);
      return [];
    }
  }

  // Buscas especializadas para diferentes tipos de análise
  async searchForScriptAnalysis(meetingId: string): Promise<Record<string, EmbeddingSearchResult[]>> {
    const scriptQueries = {
      abertura: 'abertura introdução apresentação inicial saudação',
      exploracao: 'exploração cenário atual dores problemas desafios',
      apresentacao: 'apresentação freelaw empresa solução produto serviço',
      beneficios: 'benefícios vantagens ROI resultados economia tempo',
      metodologia: 'metodologia como funciona processo delegação workflow',
      planeideal: 'plano ideal proposta comercial preços valores investimento',
      encerramento: 'encerramento próximos passos follow up fechamento'
    };

    const results: Record<string, EmbeddingSearchResult[]> = {};

    for (const [stage, query] of Object.entries(scriptQueries)) {
      results[stage] = await this.searchForAnalysis(meetingId, query, {
        analysisType: 'script',
        maxResults: 5,
        minSimilarity: 0.6
      });
    }

    return results;
  }

  async searchForICPAnalysis(meetingId: string): Promise<Record<string, EmbeddingSearchResult[]>> {
    const icpQueries = {
      tamanho: 'tamanho escritório quantos advogados funcionários pessoas equipe',
      faturamento: 'faturamento receita mensal volume financeiro lucro',
      area: 'área atuação especialização direito segmento nicho',
      dores: 'dores sobrecarga trabalho prazos perdidos demanda volume',
      decisor: 'decisor dono sócio quem decide compras investimentos'
    };

    const results: Record<string, EmbeddingSearchResult[]> = {};

    for (const [criteria, query] of Object.entries(icpQueries)) {
      results[criteria] = await this.searchForAnalysis(meetingId, query, {
        analysisType: 'icp',
        maxResults: 5,
        minSimilarity: 0.6
      });
    }

    return results;
  }

  async searchForObjectionsAnalysis(meetingId: string): Promise<EmbeddingSearchResult[]> {
    const objectionQueries = [
      'preço caro valor alto orçamento custo investimento',
      'não preciso necessidade urgência prioridade',
      'já tenho solução sistema atual ferramenta',
      'vou pensar avaliar consultar decidir',
      'não confio conheço experiência referência',
      'não é momento timing época período'
    ];

    const allResults: EmbeddingSearchResult[] = [];

    for (const query of objectionQueries) {
      const results = await this.searchForAnalysis(meetingId, query, {
        analysisType: 'objections',
        maxResults: 3,
        minSimilarity: 0.65
      });
      allResults.push(...results);
    }

    // Remove duplicatas e retorna top 10
    const uniqueResults = this.deduplicateResults(allResults);
    return uniqueResults.slice(0, 10);
  }

  // Busca por range temporal
  async searchByTimeRange(
    meetingId: string, 
    startTime: number, 
    endTime: number
  ): Promise<EmbeddingSearchResult[]> {
    if (this.vectorStore) {
      return await this.vectorStore.getChunksByTimeRange(meetingId, startTime, endTime);
    } else {
      // Fallback para dev cache
      const cached = this.devModeCache.get(`embeddings_${meetingId}`);
      if (cached) {
        const relevantChunks = findChunksByTimeRange(cached.chunks, startTime, endTime);
        return this.chunksToSearchResults(relevantChunks);
      }
      return [];
    }
  }

  // Busca por speaker
  async searchBySpeaker(meetingId: string, speaker: string): Promise<EmbeddingSearchResult[]> {
    if (this.vectorStore) {
      return await this.vectorStore.getChunksBySpeaker(meetingId, speaker);
    } else {
      // Fallback para dev cache
      const cached = this.devModeCache.get(`embeddings_${meetingId}`);
      if (cached) {
        const relevantChunks = findChunksBySpeaker(cached.chunks, speaker);
        return this.chunksToSearchResults(relevantChunks);
      }
      return [];
    }
  }

  // Busca livre para chat
  async searchForChat(
    meetingId: string, 
    question: string, 
    maxResults: number = 5
  ): Promise<EmbeddingSearchResult[]> {
    return await this.searchForAnalysis(meetingId, question, {
      analysisType: 'general',
      maxResults,
      minSimilarity: 0.6,
      useCache: false // Chat sempre busca em tempo real
    });
  }

  // Utilidades privadas
  private async searchInDevCache(
    meetingId: string, 
    query: string, 
    options: RAGSearchOptions
  ): Promise<EmbeddingSearchResult[]> {
    const cached = this.devModeCache.get(`embeddings_${meetingId}`);
    if (!cached) return [];

    // Busca simples por palavras-chave em dev mode
    const queryWords = query.toLowerCase().split(' ');
    const relevantChunks = cached.chunks.filter((chunk: TranscriptChunk) => {
      const content = chunk.content.toLowerCase();
      return queryWords.some(word => content.includes(word));
    });

    return this.chunksToSearchResults(relevantChunks.slice(0, options.maxResults || 10));
  }

  private chunksToSearchResults(chunks: TranscriptChunk[]): EmbeddingSearchResult[] {
    return chunks.map(chunk => ({
      chunkId: chunk.id,
      content: chunk.content,
      similarity: 0.8, // Mock similarity
      startTime: chunk.startTime,
      endTime: chunk.endTime,
      speakers: chunk.speakers,
      dominantSpeaker: chunk.metadata.dominantSpeaker
    }));
  }

  private deduplicateResults(results: EmbeddingSearchResult[]): EmbeddingSearchResult[] {
    const seen = new Set<string>();
    return results.filter(result => {
      if (seen.has(result.chunkId)) return false;
      seen.add(result.chunkId);
      return true;
    });
  }

  private generateCacheKey(
    meetingId: string, 
    analysisType: string, 
    query: string, 
    options: RAGSearchOptions
  ): string {
    const optionsStr = JSON.stringify(options);
    return crypto.createHash('md5').update(`${meetingId}_${analysisType}_${query}_${optionsStr}`).digest('hex');
  }

  private async getCachedSearchResult(
    meetingId: string,
    analysisType: string,
    query: string,
    options: RAGSearchOptions
  ): Promise<EmbeddingSearchResult[] | null> {
    if (!this.vectorStore) return null;

    const queryHash = this.generateCacheKey(meetingId, analysisType, query, options);
    const cached = await this.vectorStore.getCachedAnalysis(meetingId, analysisType, queryHash);
    
    return cached?.chunks || null;
  }

  private async cacheSearchResult(
    meetingId: string,
    analysisType: string,
    query: string,
    options: RAGSearchOptions,
    results: EmbeddingSearchResult[]
  ): Promise<void> {
    if (!this.vectorStore) return;

    const queryHash = this.generateCacheKey(meetingId, analysisType, query, options);
    await this.vectorStore.storeCacheAnalysis(meetingId, analysisType, queryHash, results);
  }

  // Estatísticas e diagnósticos
  async getStats(meetingId?: string): Promise<any> {
    if (this.vectorStore) {
      return await this.vectorStore.getStorageStats(meetingId);
    } else {
      const cache = meetingId ? 
        this.devModeCache.get(`embeddings_${meetingId}`) : 
        Array.from(this.devModeCache.values());
      
      return {
        totalChunks: Array.isArray(cache) ? cache.length : (cache?.chunks?.length || 0),
        totalMeetings: this.devModeCache.size,
        mode: 'dev_cache'
      };
    }
  }

  async testConnection(): Promise<boolean> {
    if (this.vectorStore) {
      return await this.vectorStore.testConnection();
    }
    return true; // Dev cache sempre disponível
  }
}

// Factory function
export function createRAGService(): RAGService | null {
  const openAIKey = process.env.OPENAI_API_KEY;
  
  if (!openAIKey) {
    console.error('OPENAI_API_KEY não configurada para RAG Service');
    return null;
  }

  return new RAGService(openAIKey);
}

export { RAGService, type RAGProcessResult, type RAGSearchOptions };