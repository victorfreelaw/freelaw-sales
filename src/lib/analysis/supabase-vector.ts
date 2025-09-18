// Integração com Supabase para armazenamento vetorial
// Implementação real das operações com pgvector

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ChunkEmbedding, EmbeddingSearchResult } from './embeddings';

interface SupabaseConfig {
  url: string;
  serviceKey: string;
}

interface SearchFilters {
  timeRange?: { start: number; end: number };
  speakers?: string[];
  topics?: string[];
  minSimilarity?: number;
}

class SupabaseVectorStore {
  private supabase: SupabaseClient;

  constructor(config: SupabaseConfig) {
    this.supabase = createClient(config.url, config.serviceKey);
  }

  // Armazena embeddings de chunks no Supabase
  async storeChunkEmbeddings(embeddings: ChunkEmbedding[]): Promise<boolean> {
    try {
      const records = embeddings.map(embedding => ({
        chunk_id: embedding.chunkId,
        meeting_id: embedding.meetingId,
        content: embedding.content,
        embedding: embedding.embedding,
        start_time: embedding.startTime,
        end_time: embedding.endTime,
        speakers: embedding.speakers,
        dominant_speaker: embedding.dominantSpeaker,
        token_count: embedding.tokenCount,
        topics: embedding.topics || [],
        created_at: embedding.createdAt.toISOString()
      }));

      const { error } = await this.supabase
        .from('transcript_chunks')
        .upsert(records, { 
          onConflict: 'meeting_id,chunk_id',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error('Erro ao armazenar embeddings:', error);
        return false;
      }

      console.log(`✅ ${embeddings.length} embeddings armazenados com sucesso`);
      return true;
    } catch (error) {
      console.error('Erro ao armazenar embeddings:', error);
      return false;
    }
  }

  // Busca semântica usando a função SQL otimizada
  async searchSimilarChunks(
    queryEmbedding: number[],
    meetingId: string,
    limit: number = 10,
    minSimilarity: number = 0.7,
    filters?: SearchFilters
  ): Promise<EmbeddingSearchResult[]> {
    try {
      const { data, error } = await this.supabase.rpc('search_transcript_chunks', {
        query_embedding: queryEmbedding,
        target_meeting_id: meetingId,
        similarity_threshold: minSimilarity,
        max_results: limit,
        time_start: filters?.timeRange?.start || null,
        time_end: filters?.timeRange?.end || null,
        target_speakers: filters?.speakers || null,
        target_topics: filters?.topics || null
      });

      if (error) {
        console.error('Erro na busca semântica:', error);
        return [];
      }

      return data.map((row: any) => ({
        chunkId: row.chunk_id,
        content: row.content,
        similarity: row.similarity,
        startTime: row.start_time,
        endTime: row.end_time,
        speakers: row.speakers,
        dominantSpeaker: row.dominant_speaker
      }));
    } catch (error) {
      console.error('Erro na busca semântica:', error);
      return [];
    }
  }

  // Busca chunks por range temporal
  async getChunksByTimeRange(
    meetingId: string,
    startTime: number,
    endTime: number
  ): Promise<EmbeddingSearchResult[]> {
    try {
      const { data, error } = await this.supabase.rpc('get_chunks_by_time_range', {
        target_meeting_id: meetingId,
        time_start: startTime,
        time_end: endTime
      });

      if (error) {
        console.error('Erro na busca temporal:', error);
        return [];
      }

      return data.map((row: any) => ({
        chunkId: row.chunk_id,
        content: row.content,
        similarity: 1.0, // Não aplicável para busca temporal
        startTime: row.start_time,
        endTime: row.end_time,
        speakers: row.speakers,
        dominantSpeaker: row.dominant_speaker
      }));
    } catch (error) {
      console.error('Erro na busca temporal:', error);
      return [];
    }
  }

  // Busca chunks por speaker
  async getChunksBySpeaker(
    meetingId: string,
    speaker: string
  ): Promise<EmbeddingSearchResult[]> {
    try {
      const { data, error } = await this.supabase.rpc('get_chunks_by_speaker', {
        target_meeting_id: meetingId,
        target_speaker: speaker
      });

      if (error) {
        console.error('Erro na busca por speaker:', error);
        return [];
      }

      return data.map((row: any) => ({
        chunkId: row.chunk_id,
        content: row.content,
        similarity: 1.0,
        startTime: row.start_time,
        endTime: row.end_time,
        speakers: row.speakers,
        dominantSpeaker: row.dominant_speaker
      }));
    } catch (error) {
      console.error('Erro na busca por speaker:', error);
      return [];
    }
  }

  // Busca chunks por tópicos
  async getChunksByTopics(
    meetingId: string,
    topics: string[]
  ): Promise<EmbeddingSearchResult[]> {
    try {
      const { data, error } = await this.supabase.rpc('get_chunks_by_topics', {
        target_meeting_id: meetingId,
        target_topics: topics
      });

      if (error) {
        console.error('Erro na busca por tópicos:', error);
        return [];
      }

      return data.map((row: any) => ({
        chunkId: row.chunk_id,
        content: row.content,
        similarity: 1.0,
        startTime: row.start_time,
        endTime: row.end_time,
        speakers: row.speakers,
        dominantSpeaker: row.dominant_speaker
      }));
    } catch (error) {
      console.error('Erro na busca por tópicos:', error);
      return [];
    }
  }

  // Remove chunks de uma reunião específica
  async deleteChunksForMeeting(meetingId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('transcript_chunks')
        .delete()
        .eq('meeting_id', meetingId);

      if (error) {
        console.error('Erro ao deletar chunks:', error);
        return false;
      }

      console.log(`✅ Chunks da reunião ${meetingId} removidos`);
      return true;
    } catch (error) {
      console.error('Erro ao deletar chunks:', error);
      return false;
    }
  }

  // Armazena cache de análise RAG
  async storeCacheAnalysis(
    meetingId: string,
    analysisType: string,
    queryHash: string,
    relevantChunks: EmbeddingSearchResult[],
    analysisResult?: any
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('rag_analysis_cache')
        .upsert({
          meeting_id: meetingId,
          analysis_type: analysisType,
          query_hash: queryHash,
          relevant_chunks: relevantChunks,
          analysis_result: analysisResult
        }, {
          onConflict: 'meeting_id,analysis_type,query_hash'
        });

      if (error) {
        console.error('Erro ao armazenar cache:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao armazenar cache:', error);
      return false;
    }
  }

  // Recupera cache de análise RAG
  async getCachedAnalysis(
    meetingId: string,
    analysisType: string,
    queryHash: string
  ): Promise<{ chunks: EmbeddingSearchResult[]; result?: any } | null> {
    try {
      const { data, error } = await this.supabase
        .from('rag_analysis_cache')
        .select('relevant_chunks, analysis_result')
        .eq('meeting_id', meetingId)
        .eq('analysis_type', analysisType)
        .eq('query_hash', queryHash)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !data) {
        return null;
      }

      return {
        chunks: data.relevant_chunks,
        result: data.analysis_result
      };
    } catch (error) {
      console.error('Erro ao recuperar cache:', error);
      return null;
    }
  }

  // Limpa cache expirado
  async cleanupExpiredCache(): Promise<number> {
    try {
      const { data, error } = await this.supabase.rpc('cleanup_expired_cache');

      if (error) {
        console.error('Erro ao limpar cache:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
      return 0;
    }
  }

  // Estatísticas do armazenamento
  async getStorageStats(meetingId?: string): Promise<{
    totalChunks: number;
    totalMeetings: number;
    avgChunkSize: number;
    storageUsed: number;
  }> {
    try {
      let query = this.supabase
        .from('transcript_chunks')
        .select('meeting_id, token_count', { count: 'exact' });

      if (meetingId) {
        query = query.eq('meeting_id', meetingId);
      }

      const { data, count, error } = await query;

      if (error) {
        console.error('Erro ao obter estatísticas:', error);
        return { totalChunks: 0, totalMeetings: 0, avgChunkSize: 0, storageUsed: 0 };
      }

      const totalChunks = count || 0;
      const uniqueMeetings = new Set(data?.map(d => d.meeting_id)).size;
      const totalTokens = data?.reduce((sum, d) => sum + (d.token_count || 0), 0) || 0;
      const avgChunkSize = totalChunks > 0 ? Math.round(totalTokens / totalChunks) : 0;

      return {
        totalChunks,
        totalMeetings: uniqueMeetings,
        avgChunkSize,
        storageUsed: totalTokens * 4 // Estimativa aproximada em bytes
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      return { totalChunks: 0, totalMeetings: 0, avgChunkSize: 0, storageUsed: 0 };
    }
  }

  // Testa conectividade com Supabase
  async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('transcript_chunks')
        .select('count', { count: 'exact', head: true });

      return !error;
    } catch (error) {
      console.error('Erro ao testar conexão:', error);
      return false;
    }
  }
}

// Factory para criar instância do Supabase Vector Store
export function createSupabaseVectorStore(): SupabaseVectorStore | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Configuração do Supabase não encontrada');
    return null;
  }

  // Se são valores fake, retorna null para usar fallback
  if (supabaseUrl.includes('fake') || supabaseServiceKey.includes('fake')) {
    console.warn('Usando configuração fake do Supabase - Vector Store desabilitado');
    return null;
  }

  return new SupabaseVectorStore({
    url: supabaseUrl,
    serviceKey: supabaseServiceKey
  });
}

export { SupabaseVectorStore, type SearchFilters };