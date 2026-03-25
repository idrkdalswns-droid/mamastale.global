-- Migration 035: Add showcase story "구두야, 엄마 데리고 가!"
-- Run AFTER uploading optimized images to public/images/showcase/

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
  '구두야, 엄마 데리고 가!',
  '[
    {"sceneNumber": 1, "title": "반짝이던 구두", "text": "옛날에 금빛 구두가 있었어요. 엄마 발에 꼭 안겨서 또각또각 노래했어요. 바람 부는 길도, 음악이 흐르는 밤도 함께 걸었어요. 구두는 매일 밤 속삭였어요. \"나는 세상에서 제일 행복한 구두야!\""},
    {"sceneNumber": 2, "title": "엄마와 함께 걷던 날들", "text": "아침이면 엄마가 현관에 와서 구두를 신었어요. \"오늘도 같이 가자!\" 사각사각 봄길, 사르르 카페, 또각또각 저녁 귀갓길. 구두는 엄마 발의 온기가 참 좋았어요. 매일이 따뜻했어요."},
    {"sceneNumber": 3, "title": "구두가 잠든 날", "text": "어느 날부터 엄마가 구두를 신지 않았어요. 현관에 빨간 운동화, 노란 장화, 토끼 슬리퍼가 놓이고 엄마 발엔 낡은 슬리퍼만 찰칵찰칵. 구두는 구석으로 밀려나 먼지가 뽀드득 쌓였어요. \"엄마, 나 여기 있는데…\" 작은 목소리는 아무에게도 닿지 않았어요."},
    {"sceneNumber": 4, "title": "엄마의 한숨 비", "text": "엄마는 요즘 자꾸 한숨을 쉬었어요. 밥 먹이다 후우, 빨래 개다 후우, 거울 보다 후우. 한숨 쉴 때마다 구두 위에 먼지가 톡, 톡 내렸어요. 작은 비처럼요. 구두의 금빛이 점점 보이지 않았어요."},
    {"sceneNumber": 5, "title": "아이가 구두를 발견하다", "text": "아이가 현관에서 신발 쌓기 놀이를 하고 있었어요. 그때 구석에서 뭔가 반짝! 아이가 먼지를 후— 불자 퐁! 금빛이 깜빡깜빡. \"와! 엄마, 이 구두 반짝여!\" 아이가 눈을 동그랗게 떴어요. \"이거 보물이야?\""},
    {"sceneNumber": 6, "title": "구두야, 엄마 데리고 가!", "text": "아이가 구두를 두 손으로 꼭 안고 뒤뚱뒤뚱 엄마한테 갔어요. \"엄마! 이거 엄마 거지? 진짜 예쁘다!\" 아이가 엄마 발 앞에 쪼그려 앉았어요. 작은 손으로 구두를 끙끙끙 신겨주며 소리쳤어요. \"구두야, 엄마 데리고 가!\" 엄마 눈에 뭔가 반짝이는 게 맺혔어요."},
    {"sceneNumber": 7, "title": "마법이 시작됐어요", "text": "아이가 구두를 신겨주자 놀라운 일이 일어났어요! 구두에서 금빛 가루가 퐁퐁퐁! 바닥에 작은 꽃들이 피어나고 현관문이 스르르 열렸어요. 바깥에서 따뜻한 바람이 살랑살랑. \"엄마! 구두가 엄마 부르고 있어! 빨리 가자!\" 아이가 엄마 손을 있는 힘껏 잡아당겼어요."},
    {"sceneNumber": 8, "title": "엄마와 구두의 모험", "text": "또각또각! 구두가 다시 노래했어요! 아이가 엄마 손 꼭 잡고 깔깔깔 웃으며 함께 걸었어요. 바람이 사르르, 꽃이 살랑살랑, 하늘에서 금빛 가루가 쏟아졌어요. \"엄마, 구두가 웃고 있어!\" 정말이었어요. 엄마도 웃고 있었거든요."},
    {"sceneNumber": 9, "title": "나란히 놓인 구두", "text": "집에 돌아온 엄마가 구두를 벗어 아이 운동화 바로 옆에 나란히 놓았어요. 이번엔 구석이 아니었어요. 가장 잘 보이는 자리. 아이가 구두를 토닥토닥 두드렸어요. \"구두야, 오늘 고마워.\" \"다음에 또 엄마 데리고 가줘!\" 구두가 반짝, 하고 웃었어요."}
  ]'::jsonb,
  'showcase',
  ARRAY[
    '/images/showcase/구두야, 엄마 데리고 가!/구두야, 엄마 데려가!.png',
    '/images/showcase/구두야, 엄마 데리고 가!/구두야, 엄마 데려가!(1).png',
    '/images/showcase/구두야, 엄마 데리고 가!/구두야, 엄마 데려가!(2).png',
    '/images/showcase/구두야, 엄마 데리고 가!/구두야, 엄마 데려가!(3).png',
    '/images/showcase/구두야, 엄마 데리고 가!/구두야, 엄마 데려가!(4).png',
    '/images/showcase/구두야, 엄마 데리고 가!/구두야, 엄마 데려가!(5).png',
    '/images/showcase/구두야, 엄마 데리고 가!/구두야, 엄마 데려가!(6).png',
    '/images/showcase/구두야, 엄마 데리고 가!/구두야, 엄마 데려가!(7).png',
    '/images/showcase/구두야, 엄마 데리고 가!/구두야, 엄마 데려가!(8).png'
  ],
  true,
  'completed',
  'mamastale',
  '/images/showcase/구두야, 엄마 데리고 가!/구두야, 엄마 데려가!.png'
);
