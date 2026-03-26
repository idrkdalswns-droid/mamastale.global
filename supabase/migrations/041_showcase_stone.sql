-- Migration 041: Add showcase story "엄마, 여기 무거워"
-- Run AFTER uploading optimized images to public/images/showcase/stone/

-- NOTE: Replace 'ADMIN_USER_ID_HERE' with actual admin profile UUID
-- Find via: SELECT id FROM profiles WHERE email = 'your-admin-email' LIMIT 1;

INSERT INTO stories (
  user_id,
  title,
  scenes,
  story_type,
  illustration_urls,
  is_public,
  status,
  author_alias,
  cover_image
) VALUES (
  'ADMIN_USER_ID_HERE',
  '엄마, 여기 무거워',
  '[
    {"sceneNumber": 1, "title": "엄마의 작은 정원", "text": "엄마의 가슴 안에는 작은 정원이 있었어요. 따뜻한 봄바람이 살랑살랑 불면 꽃들이 방긋방긋 웃었지요. 아침마다 아이가 \"엄마!\" 하고 부르면 정원에 햇살이 쏟아졌어요. 반짝반짝 온 세상이 환해지는 것 같았어요."},
    {"sceneNumber": 2, "title": "굴러 들어온 돌멩이", "text": "그런데 어느 날 엄마가 화를 냈어요. 엄마 목소리가 쿵! 하고 울리자 가슴 안 정원에 회색 돌멩이 하나가 데구르르 굴러 들어왔어요. 무겁고 차갑고 딱딱한 돌. 꽃 하나가 고개를 숙였어요."},
    {"sceneNumber": 3, "title": "점점 무거워지는 가슴", "text": "엄마가 한숨을 쉬면 — 돌멩이 하나. 엄마가 인상을 쓰면 — 돌멩이 또 하나. 엄마가 \"피곤해...\" 하면 — 돌멩이 또또 하나. 데굴데굴 또르르 딱딱딱. 돌멩이가 점점 쌓여서 엄마 가슴이 너무너무 무거워졌어요. 정원의 꽃들이 하나둘 시들기 시작했어요."},
    {"sceneNumber": 4, "title": "엄마 여기 무거워?", "text": "그날 밤 아이가 엄마 옆에 누웠어요. 아이가 작은 손으로 엄마 가슴을 톡톡 두드렸어요. 엄마는 깜짝 놀랐어요. 아이가 고개를 가웃했어요. \"엄마 여기 무거워?\""},
    {"sceneNumber": 5, "title": "내가 들어줄게", "text": "아이가 벌떡 일어났어요. 아이가 두 팔을 걷어붙이고 엄마 가슴 위의 돌멩이를 끄응— 하고 들어올렸어요. 작은 손가락에 힘이 잔뜩 들어갔어요. 볼이 빵빵하게 부풀었어요. \"내가 들어줄게!\""},
    {"sceneNumber": 6, "title": "금빛 조약돌", "text": "그런데 신기한 일이 일어났어요! 아이의 따뜻한 손이 닿자 차갑던 돌멩이가 보르르 떨리더니 반짝반짝 빛나기 시작했어요. 회색이었던 돌이 금빛 조약돌로 변했어요!"},
    {"sceneNumber": 7, "title": "다시 피어나는 꽃", "text": "아이가 돌멩이를 하나씩 만질 때마다 회색 돌이 금빛 조약돌로 바뀌었어요. 하나 둘 셋 넷... 조약돌이 빛날 때마다 엄마 가슴 안 정원에 꽃이 하나씩 다시 피어올랐어요."},
    {"sceneNumber": 8, "title": "엄마도 내 정원이야", "text": "그날 밤 엄마가 아이를 꼭 안아주었어요. 아이가 엄마 품에서 살살 잠이 들며 말했어요. \"엄마도 내 정원이야...\" 쿨쿨 잠든 아이의 작은 주먹 안에 금빛 조약돌 하나가 반짝이고 있었어요. 엄마의 가슴 안 정원에는 다시 봄바람이 살랑살랑 불었어요."},
    {"sceneNumber": 9, "title": "빛나는 돌을 들어올린 아이", "text": "이제 엄마는 알았어요. 가슴이 무거울 때 아이의 작은 손이 닿으면 차가운 돌멩이도 금빛 보물이 된다는 것을. 아이가 두 손을 높이 들어 금빛 조약돌을 하늘로 올렸어요. 엄마가 놀란 눈으로 바라보았어요. 정원에는 꽃들이 환하게 피어 있었어요."}
  ]'::jsonb,
  'showcase',
  ARRAY[
    '/images/showcase/stone/cover.png',
    '/images/showcase/stone/1.png',
    '/images/showcase/stone/2.png',
    '/images/showcase/stone/3.png',
    '/images/showcase/stone/4.png',
    '/images/showcase/stone/5.png',
    '/images/showcase/stone/6.png',
    '/images/showcase/stone/7.png',
    '/images/showcase/stone/8.png'
  ],
  true,
  'completed',
  'mamastale',
  '/images/showcase/stone/cover.png'
);
