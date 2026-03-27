-- Migration 046: DIY free save with 3-day lock

-- stories 테이블에 만료일 컬럼 추가
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON public.stories (expires_at) WHERE expires_at IS NOT NULL;

-- profiles 테이블에 구매 이력 플래그 추가
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_purchased BOOLEAN DEFAULT FALSE;
