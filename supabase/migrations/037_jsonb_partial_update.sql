-- Migration 037: JSONB partial update RPC
-- Prevents metadata spread overwrite (lost update) when concurrent requests
-- modify different fields in profiles.metadata.
--
-- Bug Bounty Fix 1-1: processed_orders 소실 방지
-- 기존 코드: { metadata: { ...metadata, last_ticket_used_at: ... } }
-- 문제: 동시 요청 시 다른 필드(processed_orders 등)가 덮어쓰여 소실
-- 해결: JSONB || 연산자로 개별 필드만 업데이트 (나머지 보존)

CREATE OR REPLACE FUNCTION update_profile_metadata_field(
  p_user_id UUID,
  p_key TEXT,
  p_value JSONB
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(p_key, p_value),
      updated_at = NOW()
  WHERE id = p_user_id;
END;
$$;
