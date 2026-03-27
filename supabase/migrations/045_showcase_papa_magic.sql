-- Migration 045: Add showcase story "아빠는 마법이 서툴러!"

INSERT INTO stories (
  user_id, title, scenes, story_type,
  illustration_urls, is_public, status, author_alias, cover_image
) VALUES (
  '78dffc67-0150-4824-9799-2cad2195a81c',
  '아빠는 마법이 서툴러!',
  '[
    {"sceneNumber": 1, "title": "아빠의 아침", "text": "아침 해가 살금살금 창문으로 들어왔어요\n\n\"일어나렴\" 하고 아빠의 커다란 손이\n이불 속 작은 등을 토닥토닥\n\n아빠 손은 참 커서\n아이의 등이 푹신한 베개처럼 느껴졌대요\n\n\"아빠 손 따뜻해!\"\n아이가 눈도 안 뜨고 까르르 웃었어요"},
    {"sceneNumber": 2, "title": "서투른 마법사", "text": "사실 아빠 손에는 마법이 있었어요\n\n근데 좀... 서툴렀어요\n\n단추를 끼우면 하나가 삐뚤\n신발을 신기면 왼쪽 오른쪽이 바뀌고\n우유를 따르면 꼭 한 방울이 탁자 위에 떨어졌어요\n\n\"아빠는 마법사인데 마법이 서투른 마법사야!\"\n아이가 손뼉을 치며 말했어요"},
    {"sceneNumber": 3, "title": "머리 묶기 대소동", "text": "오늘은 아빠가 머리를 묶어주겠다고 했어요\n\n고무줄을 잡았는데 — 똑!\n끊어졌어요\n\n다시! 잡았는데 — 또 똑!\n\n아이의 머리카락은 살랑살랑 도망치고\n아빠의 커다란 손가락은 허공을 잡았어요\n\n\"으으으\" 아빠가 혀를 내밀며 집중했어요"},
    {"sceneNumber": 4, "title": "엄마의 미소", "text": "엄마가 문 앞에서 커피를 들고 서 있었어요\n\n아빠의 서투른 손을 보며\n입꼬리가 슬쩍 올라갔어요\n\n\"도와줄까?\"\n\"아니야! 나 할 수 있어!\"\n\n아빠의 목소리가 아이보다 더 떼쓰는 것 같았어요\n엄마는 커피를 한 모금 마시며 피식 웃었어요"},
    {"sceneNumber": 5, "title": "아이의 작은 손", "text": "아이가 아빠 무릎 앞에 쪼그려 앉았어요\n\n작은 손으로 아빠의 커다란 손가락을 잡더니\n\"아빠 내가 알려줄게!\"\n\n아이의 손이 아빠 손 위에 올라갔어요\n아빠 손가락 하나가 아이 손 전체만 했어요\n\n\"이렇게... 이렇게 하는 거야\"\n아이가 아빠 손가락을 하나씩 접어주었어요"},
    {"sceneNumber": 6, "title": "함께 만드는 마법", "text": "아이 손이 아빠 손을 이끌었어요\n\n\"여기를 잡고... 빙글빙글...\"\n\n커다란 손과 작은 손이 함께\n머리카락을 모으고 고무줄을 감았어요\n\n아빠 손이 떨렸지만\n아이 손이 꼭 잡아주니까 괜찮았어요\n\n\"아빠 떨지 마! 내가 잡고 있잖아!\""},
    {"sceneNumber": 7, "title": "삐뚤빼뚤 완성", "text": "\"다 됐다!\"\n\n아이의 머리가 완성되었어요\n\n...삐뚤빼뚤했어요\n한쪽은 높고 한쪽은 낮고\n머리카락 세 가닥이 비죽 튀어나왔어요\n\n하지만 아이가 거울을 보더니\n두 눈이 동그래졌어요\n\n\"와아! 세상에서 제일 예쁜 머리야!\""},
    {"sceneNumber": 8, "title": "가족의 거울", "text": "엄마가 다가와서 아빠 옆에 섰어요\n\n거울 속에 세 사람이 보였어요\n\n삐뚤 머리의 아이\n뿌듯한 아빠\n피식 웃는 엄마\n\n아이가 양손을 벌려 엄마 아빠를 안으며 말했어요\n\"우리 집이 제일 좋아!\"\n\n그 순간 거울 속에 작은 빛이 반짝했어요"},
    {"sceneNumber": 9, "title": "서투른 마법이 가장 따뜻해", "text": "그날 밤 아이가 이불 속에서 말했어요\n\n\"아빠\"\n\"응?\"\n\"아빠 마법은 서툴러도 제일 따뜻해\"\n\n아빠의 커다란 손이 아이의 작은 손을 감쌌어요\n엄마의 손이 그 위에 살포시 올라갔어요\n\n세 개의 손이 포개진 그곳에서\n작고 따뜻한 빛이 피어났어요\n\n서투른 마법이 가장 따뜻한 법이니까요"}
  ]'::jsonb,
  'showcase',
  ARRAY[
    '/images/showcase/papa-magic/cover.png',
    '/images/showcase/papa-magic/1.png',
    '/images/showcase/papa-magic/2.png',
    '/images/showcase/papa-magic/3.png',
    '/images/showcase/papa-magic/4.png',
    '/images/showcase/papa-magic/5.png',
    '/images/showcase/papa-magic/6.png',
    '/images/showcase/papa-magic/7.png',
    '/images/showcase/papa-magic/8.png'
  ],
  true,
  'completed',
  'mamastale',
  '/images/showcase/papa-magic/cover.png'
);
