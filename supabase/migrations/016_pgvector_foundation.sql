-- ============================================================
-- Migration 016: pgvector RAG Foundation
-- Vector search infrastructure for therapeutic content retrieval
-- ============================================================

-- Enable pgvector extension (Supabase supports natively)
CREATE EXTENSION IF NOT EXISTS vector;

-- Embeddings table for therapeutic content
CREATE TABLE IF NOT EXISTS public.therapeutic_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL CHECK (
    content_type IN ('cbt_technique', 'mindfulness_script', 'clinical_guideline', 'metaphor_template')
  ),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  locale TEXT DEFAULT 'ko',
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.therapeutic_embeddings ENABLE ROW LEVEL SECURITY;

-- Therapeutic content is public (not user-specific)
CREATE POLICY "anyone_read_embeddings" ON public.therapeutic_embeddings
  FOR SELECT USING (true);

CREATE POLICY "service_write_embeddings" ON public.therapeutic_embeddings
  FOR INSERT WITH CHECK (true);

CREATE INDEX idx_embeddings_type ON public.therapeutic_embeddings(content_type);
CREATE INDEX idx_embeddings_locale ON public.therapeutic_embeddings(locale);

-- Note: IVFFlat vector index should be created after populating with >1000 records:
-- CREATE INDEX idx_embeddings_vector ON public.therapeutic_embeddings
--   USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
