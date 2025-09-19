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


interface DevCacheEntry {
  chunks: TranscriptChunk[];
  stats: RAGProcessResult['stats'];
  cachedAt: Date;
  embeddings?: ChunkEmbedding[];
}

type StorageStats = {
  totalChunks: number;
  totalMeetings: number;
  avgChunkSize: number;
  storageUsed: number;
  mode: 'supabase' | 'dev_cache';
};

class RAGService {
  private embeddingService: EmbeddingService;
  private topicExtractor: TopicExtractor;
  private vectorStore: SupabaseVectorStore | null;
  private devModeCache: Map<string, DevCacheEntry> = new Map();

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
      chunks.forEach(chunk => {
        if (chunk.metadata) {
          chunk.metadata.topics = topicsMap[chunk.id] || [];
        }
      });

      // 3. Geração de embeddings
      console.log('🔄 Gerando embeddings...');
      const embeddings = await this.embeddingService.generateEmbeddingsForChunks(chunks);
      
      // Adiciona tópicos aos embeddings
      embeddings.forEach(embedding => {
        embedding.meetingId = meetingId;
        embedding.topics = topicsMap[embedding.chunkId] || [];
      });

      const cacheEntry: DevCacheEntry = {
        chunks,
        stats,
        cachedAt: new Date()
      };

      if (!this.vectorStore) {
        cacheEntry.embeddings = embeddings;
      }

      this.devModeCache.set(`embeddings_${meetingId}`, cacheEntry);

      console.log(`✅ Gerados ${embeddings.length} embeddings`);

      // 4. Armazenamento
      let storedCount = 0;
      if (this.vectorStore) {
        const success = await this.vectorStore.storeChunkEmbeddings(embeddings);
        storedCount = success ? embeddings.length : 0;
        console.log(`✅ Armazenados ${storedCount} embeddings no Supabase`);
      } else {
        // Fallback: armazenar em cache local para dev
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
      let resultSource: 'vector' | 'dev-cache' = 'vector';

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

        if (results.length === 0) {
          const fallbackResults = await this.searchInDevCache(meetingId, query, options);
          if (fallbackResults.length > 0) {
            console.warn(`RAG fallback: usando cache local para "${query}" (meeting ${meetingId})`);
            results = fallbackResults;
            resultSource = 'dev-cache';
          }
        }
      } else {
        // Fallback: busca em cache local
        results = await this.searchInDevCache(meetingId, query, options);
        if (results.length > 0) {
          resultSource = 'dev-cache';
        }
      }

      // Salva resultado em cache
      if (useCache && results.length > 0 && this.vectorStore && resultSource === 'vector') {
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
    return this.searchCachedChunks(meetingId, query, options);
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

  private searchCachedChunks(
    meetingId: string,
    query: string,
    options: RAGSearchOptions
  ): EmbeddingSearchResult[] {
    const cached = this.devModeCache.get(`embeddings_${meetingId}`);
    if (!cached?.chunks?.length) return [];

    const maxResults = options.maxResults || 10;
    let candidateChunks: TranscriptChunk[] = cached.chunks;

    if (options.timeRange) {
      const { start, end } = options.timeRange;
      candidateChunks = candidateChunks.filter(chunk =>
        chunk.startTime <= end && chunk.endTime >= start
      );
    }

    if (options.speakers?.length) {
      const speakerSet = new Set(options.speakers.map(s => this.normalizeText(s)));
      candidateChunks = candidateChunks.filter(chunk =>
        chunk.speakers.some(speaker => speakerSet.has(this.normalizeText(speaker)))
      );
    }

    if (options.topics?.length) {
      const topicSet = new Set(options.topics.map(topic => this.normalizeText(topic)));
      candidateChunks = candidateChunks.filter(chunk => {
        const topics = chunk.metadata?.topics || [];
        return topics.some(topic => topicSet.has(this.normalizeText(topic)));
      });
    }

    if (candidateChunks.length === 0) {
      return [];
    }

    const ranked = this.rankChunksByQuery(candidateChunks, query);

    if (ranked.length > 0) {
      return this.chunksToSearchResults(ranked.slice(0, maxResults).map(item => item.chunk));
    }

    const fallbackChunks = candidateChunks.slice(0, maxResults);
    if (fallbackChunks.length > 0) {
      console.warn(`RAG fallback: usando primeiros ${fallbackChunks.length} chunks para "${query}" (meeting ${meetingId})`);
      return this.chunksToSearchResults(fallbackChunks);
    }

    return [];
  }

  private rankChunksByQuery(
    chunks: TranscriptChunk[],
    query: string
  ): Array<{ chunk: TranscriptChunk; score: number }> {
    const normalizedWords = this.normalizeText(query)
      .split(/\s+/)
      .map(word => word.trim())
      .filter(word => word.length > 2);

    if (normalizedWords.length === 0) {
      return [];
    }

    const total = Math.max(chunks.length, 1);

    return chunks
      .map((chunk, index) => {
        const content = this.normalizeText(chunk.content);
        let score = 0;

        for (const word of normalizedWords) {
          if (content.includes(word)) {
            score += 3;
          } else if (word.length > 4) {
            const stemLength = Math.max(3, Math.floor(word.length * 0.6));
            const stem = word.slice(0, stemLength);
            if (content.includes(stem)) {
              score += 1;
            }
          }
        }

        const positionBoost = 1 - index / total;
        score += positionBoost * 0.2;

        return { chunk, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.chunk.startTime - b.chunk.startTime;
      });
  }

  private normalizeText(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
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
  async getStats(meetingId?: string): Promise<StorageStats> {
    if (this.vectorStore) {
      const stats = await this.vectorStore.getStorageStats(meetingId);
      return { ...stats, mode: 'supabase' };
    }

    if (meetingId) {
      const cache = this.devModeCache.get(`embeddings_${meetingId}`);
      if (!cache) {
        return {
          totalChunks: 0,
          totalMeetings: 0,
          avgChunkSize: 0,
          storageUsed: 0,
          mode: 'dev_cache'
        };
      }

      const totalChunks = cache.chunks.length;
      const totalTokens = cache.stats.totalTokens;
      const avgChunkSize = totalChunks > 0 ? Math.round(totalTokens / totalChunks) : 0;

      return {
        totalChunks,
        totalMeetings: 1,
        avgChunkSize,
        storageUsed: totalTokens * 4,
        mode: 'dev_cache'
      };
    }

    const entries = Array.from(this.devModeCache.values());
    if (entries.length === 0) {
      return {
        totalChunks: 0,
        totalMeetings: 0,
        avgChunkSize: 0,
        storageUsed: 0,
        mode: 'dev_cache'
      };
    }

    const totals = entries.reduce(
      (acc, entry) => {
        acc.totalChunks += entry.chunks.length;
        acc.totalTokens += entry.stats.totalTokens;
        return acc;
      },
      { totalChunks: 0, totalTokens: 0 }
    );

    const avgChunkSize = totals.totalChunks > 0
      ? Math.round(totals.totalTokens / totals.totalChunks)
      : 0;

    return {
      totalChunks: totals.totalChunks,
      totalMeetings: entries.length,
      avgChunkSize,
      storageUsed: totals.totalTokens * 4,
      mode: 'dev_cache'
    };
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