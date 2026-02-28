-- 005_referral.sql: 추천인 시스템
-- 추천 링크로 가입 시 추천인 + 신규 가입자 각각 티켓 1장 지급

-- profiles 테이블에 추천 코드 컬럼 추가
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code VARCHAR(8) UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(id);

-- 추천 기록 테이블
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referrer_rewarded BOOLEAN DEFAULT false,
  referred_rewarded BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(referred_id)  -- 한 유저는 한 번만 추천받을 수 있음
);

-- RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- 본인의 추천 기록만 조회 가능
CREATE POLICY "referrals_read_own" ON public.referrals
  FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);
