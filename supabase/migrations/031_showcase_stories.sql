-- 031: 완성 동화 갤러리 (showcase stories)
-- 수작업 완성 동화를 커뮤니티에 올려서 오프라인 클래스 유입 유도

-- story_type: 'user' (기존 엄마 동화) | 'showcase' (완성 동화)
ALTER TABLE stories ADD COLUMN IF NOT EXISTS story_type TEXT DEFAULT 'user';

-- 장면별 이미지 URL 배열 (public/ 정적 경로)
ALTER TABLE stories ADD COLUMN IF NOT EXISTS illustration_urls TEXT[];

-- session_id를 nullable로 (showcase 동화는 세션 없이 직접 INSERT)
ALTER TABLE stories ALTER COLUMN session_id DROP NOT NULL;

-- 인덱스: showcase 필터링 성능
CREATE INDEX IF NOT EXISTS idx_stories_story_type ON stories (story_type) WHERE is_public = true;
