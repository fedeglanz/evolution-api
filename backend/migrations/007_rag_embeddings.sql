-- ================================================
-- 007_rag_embeddings.sql
-- RAG (Retrieval Augmented Generation) System Implementation
-- Adds pgvector extension, updates embeddings table, and RAG functions
-- ================================================

-- Install pgvector extension for vector operations
CREATE EXTENSION IF NOT EXISTS vector;

-- Update knowledge_embeddings table to use proper vector type
-- (Replace the temporary JSONB field with actual vector)
ALTER TABLE whatsapp_bot.knowledge_embeddings 
  DROP COLUMN IF EXISTS embedding_data;

ALTER TABLE whatsapp_bot.knowledge_embeddings
  ADD COLUMN embedding_data vector(1536) NULL;

-- Add new columns for RAG metadata
ALTER TABLE whatsapp_bot.knowledge_embeddings
  ADD COLUMN IF NOT EXISTS embedding_provider VARCHAR(50) DEFAULT 'openai',
  ADD COLUMN IF NOT EXISTS embedding_model VARCHAR(100) DEFAULT 'text-embedding-3-small',
  ADD COLUMN IF NOT EXISTS chunk_tokens INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS chunk_hash VARCHAR(64) NULL;

-- Add performance and security indexes
CREATE INDEX IF NOT EXISTS idx_embeddings_vector_cosine 
  ON whatsapp_bot.knowledge_embeddings 
  USING ivfflat (embedding_data vector_cosine_ops) 
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_embeddings_company_active 
  ON whatsapp_bot.knowledge_embeddings (company_id, is_active) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_embeddings_provider_model 
  ON whatsapp_bot.knowledge_embeddings (embedding_provider, embedding_model);

CREATE INDEX IF NOT EXISTS idx_embeddings_hash 
  ON whatsapp_bot.knowledge_embeddings (chunk_hash) 
  WHERE chunk_hash IS NOT NULL;

-- Add company_id to embeddings for multi-tenant security
-- (Get it from the parent knowledge_item)
CREATE OR REPLACE VIEW whatsapp_bot.embeddings_with_company AS
SELECT 
  e.*,
  ki.company_id,
  ki.title as knowledge_title,
  ki.content_type,
  ki.tags,
  ki.is_active as knowledge_active
FROM whatsapp_bot.knowledge_embeddings e
JOIN whatsapp_bot.knowledge_items ki ON e.knowledge_item_id = ki.id;

-- ================================================
-- RAG UTILITY FUNCTIONS
-- ================================================

-- Function to safely search embeddings by company (prevents cross-tenant access)
CREATE OR REPLACE FUNCTION whatsapp_bot.search_knowledge_embeddings(
  p_company_id UUID,
  p_query_embedding vector(1536),
  p_similarity_threshold FLOAT DEFAULT 0.7,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  embedding_id UUID,
  knowledge_item_id UUID,
  knowledge_title TEXT,
  content_type VARCHAR(50),
  chunk_text TEXT,
  chunk_index INTEGER,
  similarity_score FLOAT,
  tags TEXT[]
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ewc.id as embedding_id,
    ewc.knowledge_item_id,
    ewc.knowledge_title,
    ewc.content_type,
    ewc.chunk_text,
    ewc.chunk_index,
    (1 - (ewc.embedding_data <=> p_query_embedding)) as similarity_score,
    ewc.tags
  FROM whatsapp_bot.embeddings_with_company ewc
  WHERE 
    ewc.company_id = p_company_id
    AND ewc.knowledge_active = true
    AND ewc.embedding_data IS NOT NULL
    AND (1 - (ewc.embedding_data <=> p_query_embedding)) >= p_similarity_threshold
  ORDER BY 
    ewc.embedding_data <=> p_query_embedding ASC
  LIMIT p_limit;
END;
$$;

-- Function to search embeddings for a specific bot (includes bot assignments)
CREATE OR REPLACE FUNCTION whatsapp_bot.search_bot_knowledge_embeddings(
  p_bot_id UUID,
  p_query_embedding vector(1536),
  p_similarity_threshold FLOAT DEFAULT 0.7,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  embedding_id UUID,
  knowledge_item_id UUID,
  knowledge_title TEXT,
  content_type VARCHAR(50),
  chunk_text TEXT,
  chunk_index INTEGER,
  similarity_score FLOAT,
  priority INTEGER,
  tags TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ewc.id as embedding_id,
    ewc.knowledge_item_id,
    ewc.knowledge_title,
    ewc.content_type,
    ewc.chunk_text,
    ewc.chunk_index,
    (1 - (ewc.embedding_data <=> p_query_embedding)) as similarity_score,
    bka.priority,
    ewc.tags
  FROM whatsapp_bot.embeddings_with_company ewc
  JOIN whatsapp_bot.bot_knowledge_assignments bka ON ewc.knowledge_item_id = bka.knowledge_item_id
  WHERE 
    bka.bot_id = p_bot_id
    AND bka.is_active = true
    AND ewc.knowledge_active = true
    AND ewc.embedding_data IS NOT NULL
    AND (1 - (ewc.embedding_data <=> p_query_embedding)) >= p_similarity_threshold
  ORDER BY 
    bka.priority ASC,
    ewc.embedding_data <=> p_query_embedding ASC
  LIMIT p_limit;
END;
$$;

-- Function to get embedding statistics by company
CREATE OR REPLACE FUNCTION whatsapp_bot.get_embeddings_stats(p_company_id UUID)
RETURNS TABLE (
  total_embeddings BIGINT,
  embeddings_by_provider JSONB,
  embeddings_by_type JSONB,
  avg_chunk_tokens FLOAT,
  knowledge_items_with_embeddings BIGINT,
  total_tokens BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_embeddings,
    jsonb_object_agg(ewc.embedding_provider, provider_count) as embeddings_by_provider,
    jsonb_object_agg(ewc.content_type, type_count) as embeddings_by_type,
    AVG(ewc.chunk_tokens)::FLOAT as avg_chunk_tokens,
    COUNT(DISTINCT ewc.knowledge_item_id) as knowledge_items_with_embeddings,
    SUM(ewc.chunk_tokens) as total_tokens
  FROM whatsapp_bot.embeddings_with_company ewc
  JOIN (
    SELECT embedding_provider, COUNT(*) as provider_count
    FROM whatsapp_bot.embeddings_with_company
    WHERE company_id = p_company_id
    GROUP BY embedding_provider
  ) pc ON ewc.embedding_provider = pc.embedding_provider
  JOIN (
    SELECT content_type, COUNT(*) as type_count
    FROM whatsapp_bot.embeddings_with_company  
    WHERE company_id = p_company_id
    GROUP BY content_type
  ) tc ON ewc.content_type = tc.content_type
  WHERE ewc.company_id = p_company_id;
END;
$$;

-- ================================================
-- KNOWLEDGE PROCESSING FUNCTIONS
-- ================================================

-- Function to chunk text into optimal sizes for embeddings
CREATE OR REPLACE FUNCTION whatsapp_bot.chunk_text_for_embeddings(
  p_text TEXT,
  p_max_chunk_size INTEGER DEFAULT 1000,
  p_overlap_size INTEGER DEFAULT 200
)
RETURNS TABLE (
  chunk_index INTEGER,
  chunk_text TEXT,
  chunk_start INTEGER,
  chunk_end INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  text_length INTEGER;
  current_start INTEGER := 1;
  current_chunk INTEGER := 0;
  chunk_content TEXT;
  actual_end INTEGER;
BEGIN
  text_length := LENGTH(p_text);
  
  WHILE current_start <= text_length LOOP
    current_chunk := current_chunk + 1;
    
    -- Calculate actual end position
    actual_end := LEAST(current_start + p_max_chunk_size - 1, text_length);
    
    -- Extract chunk
    chunk_content := SUBSTRING(p_text FROM current_start FOR (actual_end - current_start + 1));
    
    -- Return chunk data
    chunk_index := current_chunk;
    chunk_text := TRIM(chunk_content);
    chunk_start := current_start;
    chunk_end := actual_end;
    
    RETURN NEXT;
    
    -- Move to next chunk (with overlap)
    current_start := actual_end - p_overlap_size + 1;
    
    -- Prevent infinite loop
    IF actual_end = text_length THEN
      EXIT;
    END IF;
  END LOOP;
END;
$$;

-- ================================================
-- UPDATED TRIGGERS
-- ================================================

-- Update updated_at trigger for embeddings
CREATE OR REPLACE FUNCTION whatsapp_bot.update_embeddings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_embeddings_updated_at ON whatsapp_bot.knowledge_embeddings;
CREATE TRIGGER update_embeddings_updated_at
  BEFORE UPDATE ON whatsapp_bot.knowledge_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION whatsapp_bot.update_embeddings_updated_at();

-- ================================================
-- RAG USAGE ANALYTICS
-- ================================================

-- Table to track RAG search usage for optimization
CREATE TABLE IF NOT EXISTS whatsapp_bot.rag_search_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES whatsapp_bot.companies(id) ON DELETE CASCADE,
  bot_id UUID REFERENCES whatsapp_bot.bots(id) ON DELETE CASCADE,
  
  -- Search metadata
  query_text TEXT NOT NULL,
  query_embedding_hash VARCHAR(64),
  
  -- Results metadata  
  results_count INTEGER DEFAULT 0,
  avg_similarity_score FLOAT,
  max_similarity_score FLOAT,
  
  -- Performance metrics
  search_duration_ms INTEGER,
  embedding_generation_ms INTEGER,
  
  -- Context
  used_in_response BOOLEAN DEFAULT false,
  response_quality_score FLOAT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rag_analytics_company_date 
  ON whatsapp_bot.rag_search_analytics (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rag_analytics_bot_date 
  ON whatsapp_bot.rag_search_analytics (bot_id, created_at DESC) 
  WHERE bot_id IS NOT NULL;

-- ================================================
-- GRANT PERMISSIONS
-- ================================================

-- Grant necessary permissions for RAG functions
GRANT USAGE ON SCHEMA whatsapp_bot TO PUBLIC;
GRANT SELECT ON whatsapp_bot.embeddings_with_company TO PUBLIC;
GRANT EXECUTE ON FUNCTION whatsapp_bot.search_knowledge_embeddings TO PUBLIC;
GRANT EXECUTE ON FUNCTION whatsapp_bot.search_bot_knowledge_embeddings TO PUBLIC;
GRANT EXECUTE ON FUNCTION whatsapp_bot.get_embeddings_stats TO PUBLIC;
GRANT EXECUTE ON FUNCTION whatsapp_bot.chunk_text_for_embeddings TO PUBLIC;

-- ================================================
-- COMMENTS FOR DOCUMENTATION
-- ================================================

COMMENT ON EXTENSION vector IS 'pgvector extension for vector similarity search in RAG system';
COMMENT ON COLUMN whatsapp_bot.knowledge_embeddings.embedding_data IS 'OpenAI text-embedding-3-small (1536 dimensions)';
COMMENT ON COLUMN whatsapp_bot.knowledge_embeddings.chunk_hash IS 'SHA256 hash of chunk_text for deduplication';
COMMENT ON FUNCTION whatsapp_bot.search_knowledge_embeddings IS 'Secure multi-tenant vector similarity search';
COMMENT ON FUNCTION whatsapp_bot.search_bot_knowledge_embeddings IS 'Bot-specific knowledge search with priority ordering';
COMMENT ON TABLE whatsapp_bot.rag_search_analytics IS 'Analytics for RAG system performance and usage tracking';

-- ================================================
-- OPTIONAL: EXAMPLE DATA SEEDING
-- ================================================

-- Insert example usage analytics (commented out for production)
-- INSERT INTO whatsapp_bot.rag_search_analytics (company_id, query_text, results_count, avg_similarity_score) 
-- VALUES ('00000000-0000-0000-0000-000000000000', 'ejemplo', 0, 0.0) 
-- ON CONFLICT DO NOTHING;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'RAG embeddings migration completed successfully!';
  RAISE NOTICE 'pgvector extension installed and configured';
  RAISE NOTICE 'Vector similarity functions ready for use';
  RAISE NOTICE 'Multi-tenant security enforced';
  RAISE NOTICE 'Next step: Install openai package and implement EmbeddingService';
END $$; 