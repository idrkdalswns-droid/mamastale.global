-- 029: teacher_stories에 cover_image 컬럼 추가
-- 선생님 모드 동화 생성 시 Gemini로 표지 이미지를 자동 생성하여 저장
ALTER TABLE teacher_stories ADD COLUMN IF NOT EXISTS cover_image TEXT;
