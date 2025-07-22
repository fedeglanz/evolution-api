-- ================================================
-- 009_fix_rag_function_types.sql
-- HOTFIX: Corregir tipos de datos en funciones RAG
-- Error: "structure of query does not match function result type"
-- ================================================

-- Drop existing functions first (required to change return types)
DROP FUNCTION IF EXISTS whatsapp_bot.search_knowledge_embeddings(uuid,vector,double precision,integer);
DROP FUNCTION IF EXISTS whatsapp_bot.search_bot_knowledge_embeddings(uuid,vector,double precision,integer);

-- Fix search_knowledge_embeddings function with correct data types
CREATE FUNCTION whatsapp_bot.search_knowledge_embeddings(
  p_company_id UUID,
  p_query_embedding vector(1536),
  p_similarity_threshold FLOAT DEFAULT 0.7,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  embedding_id UUID,
  knowledge_item_id UUID,
  knowledge_title VARCHAR(200),  -- 🔧 FIX: Match actual column type
  content_type VARCHAR(50),      -- 🔧 FIX: Match actual column type
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
    ewc.content_chunk as chunk_text,  -- 🔧 FIX: Use content_chunk but alias as chunk_text
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

-- Fix search_bot_knowledge_embeddings function with correct data types
CREATE FUNCTION whatsapp_bot.search_bot_knowledge_embeddings(
  p_bot_id UUID,
  p_query_embedding vector(1536),
  p_similarity_threshold FLOAT DEFAULT 0.7,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  embedding_id UUID,
  knowledge_item_id UUID,
  knowledge_title VARCHAR(200),  -- 🔧 FIX: Match actual column type
  content_type VARCHAR(50),      -- 🔧 FIX: Match actual column type
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
    ewc.content_chunk as chunk_text,  -- 🔧 FIX: Use content_chunk but alias as chunk_text
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION whatsapp_bot.search_knowledge_embeddings TO PUBLIC;
GRANT EXECUTE ON FUNCTION whatsapp_bot.search_bot_knowledge_embeddings TO PUBLIC;

-- Add comment for documentation
COMMENT ON FUNCTION whatsapp_bot.search_bot_knowledge_embeddings IS 'Fixed data types to match actual table schema: VARCHAR(200) for knowledge_title and content_type'; 