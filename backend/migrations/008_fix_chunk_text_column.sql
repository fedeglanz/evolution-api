-- ================================================
-- 008_fix_chunk_text_column.sql
-- HOTFIX: Corregir referencias a chunk_text → content_chunk
-- ================================================

-- Fix search_knowledge_embeddings function
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

-- Fix search_bot_knowledge_embeddings function
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

-- Fix embeddings_with_company view to include content_chunk alias
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

-- Add comment for documentation
COMMENT ON VIEW whatsapp_bot.embeddings_with_company IS 'View that joins embeddings with their company context for multi-tenant security'; 