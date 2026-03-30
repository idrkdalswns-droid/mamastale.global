-- Migration 052: Add showcase story "엄마 귀에 울린 작은 종소리"

INSERT INTO stories (
  user_id, title, scenes, story_type,
  illustration_urls, is_public, status, author_alias, cover_image
) VALUES (
  '78dffc67-0150-4824-9799-2cad2195a81c',
  '엄마 귀에 울린 작은 종소리',
  '[
    {"sceneNumber": 1, "title": "달빛 아래 잠든 아기", "text": "달빛이 사르르 창문으로 들어오던 밤\n엄마가 작은 아기를 팔에 안고 있었어\n\n토닥토닥 새근새근\n\n엄마의 심장 소리에 맞춰 눈을 스르르 감았지\n\"잘 자 우리 아가\"\n엄마가 속삭이자 아기의 입꼬리가 살짝 올라갔어"},
    {"sceneNumber": 2, "title": "살금살금 방문 밖으로", "text": "엄마가 아기를 이불 위에 사뿐히 내려놓았어\n손끝으로 보드라운 볼을 쓸어주고\n살금살금 발끝으로 방문을 나섰지\n삐걱... 문이 작게 소리를 냈어\n엄마가 숨을 멈추고 뒤를 봤지만\n아기는 여전히 새근새근 꿈나라에 있었어"},
    {"sceneNumber": 3, "title": "안개 괴물의 등장", "text": "거실에 나오자 모든 게 조용했어\n쉬이이... 바람 소리도 없는 고요함\n그때 거실 구석에서 뭔가가 스물스물 올라왔어\n회색빛 안개가 소리 없이 번지기 시작했지\n소파 위로 탁자 위로 사르르르\n조용한 안개 괴물이 거실을 가득 채워갔어"},
    {"sceneNumber": 4, "title": "무거워지는 마음", "text": "안개가 엄마의 발끝부터 감싸 올라왔어\n마음이 점점 무거워지고\n가슴 속에 차가운 바람이 불었지\n엄마는 소파에 앉아 두 손을 꼭 모았어\n안개가 속삭이자 엄마의 어깨가 점점 작아졌어"},
    {"sceneNumber": 5, "title": "작은 종소리", "text": "그때였어!\n아주 작은 소리가 멀리서 들려왔어\n\n마치 아주 작은 종이 울리는 것 같았어\n엄마가 고개를 들고 귀를 기울였지\n안개 괴물이 잠깐 흠칫 멈췄어"},
    {"sceneNumber": 6, "title": "금빛 웃음소리", "text": "엄마가 벌떡 일어나 방으로 달려갔어\n타다다다 발소리가 복도를 울렸지\n문을 열자 아기가 엄마를 보고\n두 팔을 쫙 벌리며 더 크게 웃었어\n까르르르르!\n그 웃음에 방 안 가득 금빛 종소리가 울렸어"},
    {"sceneNumber": 7, "title": "아기의 환한 웃음", "text": ""},
    {"sceneNumber": 8, "title": "엄마의 작은 종", "text": "엄마가 아기를 번쩍 안아 올렸어\n볼에 볼을 비비고 코에 코를 대고\n아기의 작은 손이 엄마 머리카락을 꼭 잡았지\n\"네가 엄마의 작은 종이구나\"\n까르르... 아기가 또 웃었어\n그 밤 거실의 안개는 다시는 돌아오지 않았어"}
  ]'::jsonb,
  'showcase',
  ARRAY[
    '/images/showcase/bell-mama/cover.png',
    '/images/showcase/bell-mama/1.png',
    '/images/showcase/bell-mama/2.png',
    '/images/showcase/bell-mama/3.png',
    '/images/showcase/bell-mama/4.png',
    '/images/showcase/bell-mama/5.png',
    '/images/showcase/bell-mama/6.png',
    '/images/showcase/bell-mama/7.png',
    '/images/showcase/bell-mama/8.png'
  ],
  true,
  'completed',
  'mamastale',
  '/images/showcase/bell-mama/cover.png'
);
