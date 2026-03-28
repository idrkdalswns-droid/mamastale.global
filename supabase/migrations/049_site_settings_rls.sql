-- 049: site_settings 테이블 RLS 활성화
-- Nightwatch F-002: anon/authenticated 사용자의 직접 접근 차단
-- get_blind_config() RPC는 SECURITY DEFINER이므로 영향 없음

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only" ON site_settings
  FOR ALL USING (false);
