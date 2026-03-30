-- 딸깍 동화 결과 OG 메타데이터용 공개 뷰
-- tq_sessions RLS = 소유자만 SELECT → 소셜 공유 메타데이터는 anon 조회 필요
-- 노출 필드: id, primary_emotion, cover_url (3개만)
-- 미노출: generated_story, emotion_scores, user_id, responses 등 개인정보

CREATE OR REPLACE VIEW public.tq_public_metadata AS
SELECT
  id,
  primary_emotion,
  cover_url
FROM public.tq_sessions
WHERE status = 'completed';

-- anon key로 조회 가능하도록 권한 부여
GRANT SELECT ON public.tq_public_metadata TO anon;
GRANT SELECT ON public.tq_public_metadata TO authenticated;

COMMENT ON VIEW public.tq_public_metadata IS
  'Public-facing metadata for dalkkak results OG tags. Exposes only emotion + cover, no story content.';
