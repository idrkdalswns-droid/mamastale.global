-- Migration 038: Stripe webhook event deduplication table
-- Provides cross-isolate idempotency for Edge Runtime deployments.
--
-- Bug Bounty Fix 2-9: Edge isolate 재시작 시 인메모리 Map 소실 → 이중 처리 방지
-- 기존: per-isolate in-memory Map만으로 중복 방지 (isolate 재시작 시 무효)
-- 해결: DB 레벨 PRIMARY KEY 제약으로 cross-isolate 멱등성 보장

CREATE TABLE IF NOT EXISTS stripe_processed_events (
  event_id TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cleanup index: 오래된 이벤트 정리용 (cron 또는 수동)
CREATE INDEX IF NOT EXISTS idx_stripe_events_processed_at
  ON stripe_processed_events(processed_at);
