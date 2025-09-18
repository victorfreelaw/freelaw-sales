// Sistema de embeddings e armazenamento vetorial para RAG
// Integração com Supabase Vector + OpenAI Embeddings

import OpenAI from 'openai';
import { TranscriptChunk } from './chunking';

interface ChunkEmbedding {
  chunkId: string;
  meetingId: string;
  content: string;
  embedding: number[];
  startTime: number;
  endTime: number;
  speakers: string[];
  dominantSpeaker: string;
  tokenCount: number;
  topics?: string[];
  createdAt: Date;
}

interface EmbeddingSearchResult {
  chunkId: string;
  content: string;
  similarity: number;
  startTime: number;
  endTime: number;
  speakers: string[];
  dominantSpeaker: string;
}

class EmbeddingService {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  // Gera embeddings para um chunk
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small', // Modelo mais eficiente e barato
        input: text,
        encoding_format: 'float'
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Erro ao gerar embedding:', error);
      throw new Error('Falha ao gerar embedding');
    }
  }

  // Processa chunks em batch para embeddings
  async generateEmbeddingsForChunks(chunks: TranscriptChunk[]): Promise<ChunkEmbedding[]> {
    const embeddings: ChunkEmbedding[] = [];

    // Processa em batches para otimizar API calls
    const batchSize = 20;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      
      // Gera embeddings para o batch
      const batchPromises = batch.map(async (chunk) => {
        const embedding = await this.generateEmbedding(chunk.content);
        return {
          chunkId: chunk.id,
          meetingId: '', // Será preenchido na camada superior
          content: chunk.content,
          embedding,
          startTime: chunk.startTime,
          endTime: chunk.endTime,
          speakers: chunk.speakers,
          dominantSpeaker: chunk.metadata.dominantSpeaker,
          tokenCount: chunk.tokenCount,
          topics: chunk.metadata.topics,
          createdAt: new Date()
        } as ChunkEmbedding;
      });

      const batchResults = await Promise.all(batchPromises);
      embeddings.push(...batchResults);

      // Rate limiting: pequena pausa entre batches
      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return embeddings;
  }

  // Busca semântica por similaridade
  async searchSimilarChunks(
    query: string, 
    meetingId: string, 
    limit: number = 5,
    minSimilarity: number = 0.7
  ): Promise<EmbeddingSearchResult[]> {
    try {
      // Gera embedding da query
      const queryEmbedding = await this.generateEmbedding(query);

      // Busca no Supabase usando pgvector
      // TODO: Implementar chamada real para Supabase
      const searchResults = await this.searchInSupabase(queryEmbedding, meetingId, limit, minSimilarity);
      
      return searchResults;
    } catch (error) {
      console.error('Erro na busca semântica:', error);
      return [];
    }
  }

  // Busca contextual com filtros
  async searchChunksWithContext(
    query: string,
    meetingId: string,
    filters?: {
      timeRange?: { start: number; end: number };
      speakers?: string[];
      topics?: string[];
      minSimilarity?: number;
    }
  ): Promise<EmbeddingSearchResult[]> {
    const limit = 10;
    const minSimilarity = filters?.minSimilarity || 0.7;

    try {
      const queryEmbedding = await this.generateEmbedding(query);
      
      // Busca com filtros contextuais
      const results = await this.searchInSupabaseWithFilters(
        queryEmbedding, 
        meetingId, 
        limit, 
        minSimilarity,
        filters
      );

      return results;
    } catch (error) {
      console.error('Erro na busca contextual:', error);
      return [];
    }
  }

  // Implementação mock da busca no Supabase (substituir por implementação real)
  private async searchInSupabase(
    queryEmbedding: number[],
    meetingId: string,
    limit: number,
    minSimilarity: number
  ): Promise<EmbeddingSearchResult[]> {
    // TODO: Implementar integração real com Supabase
    // Por enquanto, retorna resultados mock
    return [];
  }

  private async searchInSupabaseWithFilters(
    queryEmbedding: number[],
    meetingId: string,
    limit: number,
    minSimilarity: number,
    filters?: any
  ): Promise<EmbeddingSearchResult[]> {
    // TODO: Implementar integração real com Supabase com filtros
    return [];
  }
}

// Extrator de tópicos usando OpenAI
class TopicExtractor {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  async extractTopics(text: string): Promise<string[]> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Extraia os tópicos principais deste trecho de reunião de vendas B2B.
            Retorne uma lista de tópicos relevantes, focando em:
            - Objeções mencionadas
            - Produtos/serviços discutidos  
            - Benefícios apresentados
            - Preocupações do cliente
            - Próximos passos
            
            Retorne apenas tópicos específicos e relevantes, máximo 5 por trecho.
            Formato: lista simples separada por vírgulas.`
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.1,
        max_tokens: 200
      });

      const topicsText = response.choices[0]?.message?.content?.trim() || '';
      return topicsText.split(',').map(topic => topic.trim()).filter(Boolean);
    } catch (error) {
      console.error('Erro ao extrair tópicos:', error);
      return [];
    }
  }

  // Processa múltiplos chunks para extrair tópicos
  async extractTopicsFromChunks(chunks: TranscriptChunk[]): Promise<Record<string, string[]>> {
    const results: Record<string, string[]> = {};

    for (const chunk of chunks) {
      const topics = await this.extractTopics(chunk.content);
      results[chunk.id] = topics;
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }
}

// Serviço de busca RAG otimizado
class RAGSearchService {
  private embeddingService: EmbeddingService;
  private topicExtractor: TopicExtractor;

  constructor(apiKey: string) {
    this.embeddingService = new EmbeddingService(apiKey);
    this.topicExtractor = new TopicExtractor(apiKey);
  }

  // Busca específica para análise de script
  async searchForScriptAnalysis(meetingId: string): Promise<EmbeddingSearchResult[]> {
    const scriptQueries = [
      'abertura da reunião introdução apresentação inicial',
      'exploração do cenário atual dores do cliente problemas',
      'apresentação da empresa solução produto freelaw',
      'benefícios para o escritório vantagens ROI resultados',
      'metodologia como funciona processo delegação',
      'plano ideal proposta comercial preços valores',
      'encerramento próximos passos follow up'
    ];

    const allResults: EmbeddingSearchResult[] = [];
    
    for (const query of scriptQueries) {
      const results = await this.embeddingService.searchSimilarChunks(meetingId, query, 3, 0.6);
      allResults.push(...results);
    }

    // Remove duplicatas e ordena por relevância
    const uniqueResults = this.deduplicateResults(allResults);
    return uniqueResults.sort((a, b) => b.similarity - a.similarity);
  }

  // Busca específica para análise de ICP
  async searchForICPAnalysis(meetingId: string): Promise<EmbeddingSearchResult[]> {
    const icpQueries = [
      'tamanho do escritório quantos advogados funcionários',
      'faturamento receita mensal volume financeiro',
      'área de atuação especialização direito',
      'dores sobrecarga trabalho prazos perdidos',
      'decisor dono sócio quem decide compras'
    ];

    const allResults: EmbeddingSearchResult[] = [];
    
    for (const query of icpQueries) {
      const results = await this.embeddingService.searchSimilarChunks(meetingId, query, 3, 0.6);
      allResults.push(...results);
    }

    return this.deduplicateResults(allResults);
  }

  // Busca específica para análise de objeções
  async searchForObjectionsAnalysis(meetingId: string): Promise<EmbeddingSearchResult[]> {
    const objectionQueries = [
      'preço muito caro valor alto orçamento',
      'não precisa não vejo necessidade',
      'já tenho solução sistema atual',
      'vou pensar preciso avaliar consultar',
      'não confio não conheço experiência',
      'não é o momento timing errado'
    ];

    const allResults: EmbeddingSearchResult[] = [];
    
    for (const query of objectionQueries) {
      const results = await this.embeddingService.searchSimilarChunks(meetingId, query, 3, 0.6);
      allResults.push(...results);
    }

    return this.deduplicateResults(allResults);
  }

  private deduplicateResults(results: EmbeddingSearchResult[]): EmbeddingSearchResult[] {
    const seen = new Set<string>();
    return results.filter(result => {
      if (seen.has(result.chunkId)) {
        return false;
      }
      seen.add(result.chunkId);
      return true;
    });
  }
}

export {
  EmbeddingService,
  TopicExtractor,
  RAGSearchService,
  type ChunkEmbedding,
  type EmbeddingSearchResult
};