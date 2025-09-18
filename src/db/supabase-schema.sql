-- Esquema Supabase para armazenamento vetorial de chunks de transcrições
-- Utiliza pgvector para busca semântica

-- Habilitar extensão pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Tabela para armazenar chunks de transcrições com embeddings
CREATE TABLE IF NOT EXISTS transcript_chunks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chunk_id TEXT NOT NULL,
  meeting_id TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(1536), -- OpenAI text-embedding-3-small produz 1536 dimensões
  start_time INTEGER NOT NULL,
  end_time INTEGER NOT NULL,
  speakers TEXT[] NOT NULL DEFAULT '{}',
  dominant_speaker TEXT,
  token_count INTEGER NOT NULL,
  topics TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Índices para otimização
  CONSTRAINT unique_chunk_per_meeting UNIQUE (meeting_id, chunk_id)
);

-- Índice para busca vetorial usando cosine similarity
CREATE INDEX IF NOT EXISTS transcript_chunks_embedding_idx 
ON transcript_chunks USING ivfflat (embedding vector_cosine_ops);

-- Índice para busca por meeting_id
CREATE INDEX IF NOT EXISTS transcript_chunks_meeting_idx 
ON transcript_chunks (meeting_id);

-- Índice para busca temporal
CREATE INDEX IF NOT EXISTS transcript_chunks_time_idx 
ON transcript_chunks (meeting_id, start_time, end_time);

-- Índice para busca por speaker
CREATE INDEX IF NOT EXISTS transcript_chunks_speaker_idx 
ON transcript_chunks USING GIN (speakers);

-- Índice para busca por tópicos
CREATE INDEX IF NOT EXISTS transcript_chunks_topics_idx 
ON transcript_chunks USING GIN (topics);

-- Função para busca semântica com filtros
CREATE OR REPLACE FUNCTION search_transcript_chunks(
  query_embedding VECTOR(1536),
  target_meeting_id TEXT,
  similarity_threshold FLOAT DEFAULT 0.7,
  max_results INTEGER DEFAULT 10,
  time_start INTEGER DEFAULT NULL,
  time_end INTEGER DEFAULT NULL,
  target_speakers TEXT[] DEFAULT NULL,
  target_topics TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  chunk_id TEXT,
  content TEXT,
  similarity FLOAT,
  start_time INTEGER,
  end_time INTEGER,
  speakers TEXT[],
  dominant_speaker TEXT,
  topics TEXT[]
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tc.chunk_id,
    tc.content,
    (1 - (tc.embedding <=> query_embedding)) AS similarity,
    tc.start_time,
    tc.end_time,
    tc.speakers,
    tc.dominant_speaker,
    tc.topics
  FROM transcript_chunks tc
  WHERE 
    tc.meeting_id = target_meeting_id
    AND (1 - (tc.embedding <=> query_embedding)) >= similarity_threshold
    AND (time_start IS NULL OR tc.start_time >= time_start)
    AND (time_end IS NULL OR tc.end_time <= time_end)
    AND (target_speakers IS NULL OR tc.speakers && target_speakers)
    AND (target_topics IS NULL OR tc.topics && target_topics)
  ORDER BY similarity DESC
  LIMIT max_results;
END;
$$;

-- Função para busca de chunks por range temporal
CREATE OR REPLACE FUNCTION get_chunks_by_time_range(
  target_meeting_id TEXT,
  time_start INTEGER,
  time_end INTEGER
)
RETURNS TABLE (
  chunk_id TEXT,
  content TEXT,
  start_time INTEGER,
  end_time INTEGER,
  speakers TEXT[],
  dominant_speaker TEXT,
  topics TEXT[]
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tc.chunk_id,
    tc.content,
    tc.start_time,
    tc.end_time,
    tc.speakers,
    tc.dominant_speaker,
    tc.topics
  FROM transcript_chunks tc
  WHERE 
    tc.meeting_id = target_meeting_id
    AND tc.start_time <= time_end 
    AND tc.end_time >= time_start
  ORDER BY tc.start_time;
END;
$$;

-- Função para busca de chunks por speaker
CREATE OR REPLACE FUNCTION get_chunks_by_speaker(
  target_meeting_id TEXT,
  target_speaker TEXT
)
RETURNS TABLE (
  chunk_id TEXT,
  content TEXT,
  start_time INTEGER,
  end_time INTEGER,
  speakers TEXT[],
  dominant_speaker TEXT,
  topics TEXT[]
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tc.chunk_id,
    tc.content,
    tc.start_time,
    tc.end_time,
    tc.speakers,
    tc.dominant_speaker,
    tc.topics
  FROM transcript_chunks tc
  WHERE 
    tc.meeting_id = target_meeting_id
    AND (target_speaker = ANY(tc.speakers) OR tc.dominant_speaker = target_speaker)
  ORDER BY tc.start_time;
END;
$$;

-- Função para busca por tópicos
CREATE OR REPLACE FUNCTION get_chunks_by_topics(
  target_meeting_id TEXT,
  target_topics TEXT[]
)
RETURNS TABLE (
  chunk_id TEXT,
  content TEXT,
  start_time INTEGER,
  end_time INTEGER,
  speakers TEXT[],
  dominant_speaker TEXT,
  topics TEXT[]
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tc.chunk_id,
    tc.content,
    tc.start_time,
    tc.end_time,
    tc.speakers,
    tc.dominant_speaker,
    tc.topics
  FROM transcript_chunks tc
  WHERE 
    tc.meeting_id = target_meeting_id
    AND tc.topics && target_topics
  ORDER BY tc.start_time;
END;
$$;

-- Tabela para cache de análises RAG
CREATE TABLE IF NOT EXISTS rag_analysis_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id TEXT NOT NULL,
  analysis_type TEXT NOT NULL, -- 'script', 'icp', 'objections'
  query_hash TEXT NOT NULL,
  relevant_chunks JSONB NOT NULL,
  analysis_result JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  
  CONSTRAINT unique_analysis_cache UNIQUE (meeting_id, analysis_type, query_hash)
);

-- Índice para limpeza automática de cache
CREATE INDEX IF NOT EXISTS rag_cache_expires_idx 
ON rag_analysis_cache (expires_at);

-- Função para limpeza automática de cache expirado
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM rag_analysis_cache 
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Política RLS (Row Level Security) - opcional
ALTER TABLE transcript_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_analysis_cache ENABLE ROW LEVEL SECURITY;

-- Política de acesso (ajustar conforme necessário)
CREATE POLICY "Allow authenticated users" ON transcript_chunks
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated users" ON rag_analysis_cache
  FOR ALL TO authenticated USING (true);

-- Comentários para documentação
COMMENT ON TABLE transcript_chunks IS 'Armazena chunks de transcrições com embeddings para busca semântica';
COMMENT ON COLUMN transcript_chunks.embedding IS 'Vetor de embedding gerado pelo OpenAI text-embedding-3-small (1536 dimensões)';
COMMENT ON COLUMN transcript_chunks.start_time IS 'Tempo de início do chunk em segundos';
COMMENT ON COLUMN transcript_chunks.end_time IS 'Tempo de fim do chunk em segundos';
COMMENT ON FUNCTION search_transcript_chunks IS 'Busca semântica de chunks com filtros opcionais';
COMMENT ON TABLE rag_analysis_cache IS 'Cache de análises RAG para otimização de performance';