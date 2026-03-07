# 마마스테일 3D 몰입형 UI 디자인 컨셉

> 최종 업데이트: 2026-03-07
> 상태: **프리뷰 테스트 완료, 실서비스 적용 대기**

---

## 1. 핵심 방향성

마마스테일의 4단계 심리치료 엔진의 "혼돈에서 질서로, 상처에서 예술 작품으로의 승화" 과정을
3D 웹 공간에서 시각적으로 구현한다.

**한 줄 요약**: 새벽의 희망에서 시작해 아름다운 해질녘으로 마무리되는 3D 동화 숲 스크롤리텔링

---

## 2. 디자인 3대 원칙

### 2.1 클레이모피즘 (Claymorphism)
- 둥글고 폭신한 3D UI — 점토로 빚은 듯한 볼륨감
- Inner shadow 2개 (상단 밝음 + 하단 어두움) + 외부 그림자
- 날카로운 모서리 대신 border-radius 32px+
- **심리학적 근거**: 유기적 둥근 형태가 편도체 자극을 줄여 심리적 무장 해제 유도

### 2.2 새벽→해질녘 시간 전환 (Dawn to Sunset)
- 스크롤 진행에 따라 하늘색이 7단계로 변화
- Phase 1(공감) = 새벽, Phase 4(동화 완성) = 황금빛 석양
- 치유 여정의 시간적 흐름을 시각적으로 체화

### 2.3 NPR 수채화 질감 (Non-Photorealistic Rendering)
- 완전한 CG가 아닌 아날로그 수작업 느낌
- 3D 모델에 수채화 텍스처 맵핑
- "엄마가 손수 아이를 위해 그려준 듯한" 온기

---

## 3. 컬러 팔레트

### 선명한 파스텔 (Vivid Pastel — 탁하지 않은 밝고 깨끗한 색상)

| 이름 | HEX | 용도 |
|------|------|------|
| Lilac | `#C58AF9` | Phase 3 은유, 엄마 캐릭터 드레스 |
| Lilac Soft | `#E8D5FA` | 나무 잎사귀, 배경 요소 |
| Pistachio | `#81C995` | Phase 1 공감, 자연 요소 |
| Pistachio Soft | `#C8F0D4` | 나무 잎사귀 |
| Sky | `#8EBEF9` | Phase 2 소크라테스, 아이 캐릭터 옷 |
| Sky Soft | `#C5DDFA` | 크리스탈, 배경 |
| Coral | `#F2836B` | CTA 버튼, 버섯 |
| Coral Soft | `#FBBFB0` | 나무 잎사귀 |
| Gold | `#F5C563` | Phase 4 동화, 피날레 CTA |
| Gold Soft | `#FDE8A8` | 나무 잎사귀 |
| Off-white | `#F9F9F9` | 카드 배경 |
| Charcoal | `#2D2D2D` | 본문 텍스트 |
| Warm Gray | `#6B5E52` | 서브 텍스트 |

### 시간대별 하늘색 (Dawn → Sunset)

| 단계 | 상단(Top) | 하단(Bottom) | 안개(Fog) |
|------|----------|------------|---------|
| 여명 | `#D6E6F9` | `#FDE8D8` | `#E8EFF8` |
| 이른 아침 | `#C0DFF5` | `#E0F0DA` | `#DAE8E0` |
| 늦은 아침 | `#A8D4F0` | `#EDF5E8` | `#D5E5DD` |
| 골든아워 | `#F0D8B0` | `#FEE8C0` | `#F2E0C8` |
| 늦은 골든 | `#F0C090` | `#F8D0A0` | `#F0D0A5` |
| 석양 절정 | `#E8837C` | `#F5C563` | `#F0A880` |
| 딥 석양 | `#D06A70` | `#E8A050` | `#D89068` |

---

## 4. Phase별 UI/UX 매핑

| Phase | 임상 기반 | 시간대 | 3D 요소 | UI 스타일 |
|-------|---------|--------|--------|---------|
| **1. 공감적 치유자** | Pennebaker 표현적 글쓰기 | 새벽 | 미니멀, 부드러운 안개 | 다크/소프트 모드, 여백 극대화 |
| **2. 소크라테스식 철학자** | 소크라테스식 질문법 | 아침 | 클레이모피즘 카드, 유체 모션 | 둥글고 폭신한 3D 카드 UI |
| **3. 은유의 마법사** | Michael White 내러티브 테라피 | 골든아워 | 수채화 텍스처 3D 캐릭터 | NPR 렌더링, 인터랙티브 몬스터 |
| **4. 동화 편집장** | Louise DeSalvo 치유의 글쓰기 | 해질녘 | 3D 스크롤리텔링 | 카메라 관통 장면 전환 |

---

## 5. 3D 오브젝트 목록

### 5.1 환경
- **스타일라이즈 나무**: 3단 구체 잎사귀 + 원기둥 줄기, 6가지 파스텔 색상
- **버섯**: 반구 캡 + 원기둥 줄기, 코랄 톤
- **동화 집**: 원기둥 본체 + 원뿔 지붕, 창문 발광
- **떠다니는 크리스탈**: 8면체, 반투명 발광, 회전 애니메이션
- **반딧불이**: 120개 파티클, 6색 혼합, Additive Blending
- **구릉지 지면**: PlaneGeometry + sin/cos 변형

### 5.2 캐릭터
- **엄마**: 라일락 드레스 + 살색 머리/팔 + 갈색 올림머리(번), Low-poly
- **아이**: 스카이블루 옷 + 살색 머리/팔 + 밝은갈색 양갈래, Low-poly
- 2쌍 배치 (히어로 근처 + 중반부)
- 부드러운 흔들림/바운스 애니메이션

---

## 6. 기술 스택 (실서비스 적용 시)

### 프론트엔드
| 기술 | 용도 |
|------|------|
| **React Three Fiber (R3F)** | Three.js의 React 선언적 래퍼 |
| **@react-three/drei** | useScroll, ScrollControls, MeshTransmissionMaterial 등 |
| **GSAP (GreenSock)** | 스크롤 기반 카메라/오브젝트 애니메이션 |
| **@react-three/postprocessing** | Bloom, Vignette 등 후처리 |
| **Draco Compression** | 3D 모델 파일 용량 최소화 |

### 성능 최적화
- Low-poly 디자인 (의도적 폴리곤 수 제한)
- Draco 압축으로 gltf/glb 용량 최소화
- 디바이스 감지 → 저사양 기기는 3D 비활성화, 2D 폴백
- 스켈레톤 스크린 + 심호흡 유도 로딩 UX

### 접근성
- `prefers-reduced-motion` 미디어 쿼리 존중
- 3D 비활성화 시에도 모든 콘텐츠 접근 가능
- 키보드 내비게이션 지원

---

## 7. 프리뷰 파일

| 파일 | 설명 |
|------|------|
| `preview/3d-fairytale-concept.html` | v1 — 초기 컨셉 (탁한 파스텔, 플랫 카드) |
| `preview/3d-fairytale-v2.html` | **v2 — 최종 컨셉** (선명 파스텔, 클레이모피즘, 새벽→해질녘, 3D 캐릭터) |

### 프리뷰 실행 방법
```bash
cd /Users/minjunekang/Desktop/엄마엄마동화/mamastale/preview
python3 -m http.server 3334
# 브라우저에서 http://localhost:3334/3d-fairytale-v2.html
```

---

## 8. 피드백 히스토리

### v1 → v2 변경사항 (2026-03-07)

| 피드백 | v1 | v2 적용 |
|--------|-----|--------|
| 파스텔 톤이 탁하다 | `#7FBFB0` 민트 등 | `#C58AF9` 라일락, `#81C995` 피스타치오 등 선명 파스텔 |
| 시간대 변화 없음 | 단일 크림 배경 | 7단계 Dawn→Sunset 하늘색 전환 |
| 카드가 저렴해 보인다 | 글래스모피즘 플랫 카드 | 클레이모피즘 (inner shadow + 입체 그림자) |
| 내용이 부실하다 | 3줄 요약 | 임상 이론명 + 핵심 메커니즘 + 기대 효과 + 기능 pill |
| 안전성 미어필 | 없음 | "완벽하게 설계된 안전 시스템" 섹션 (CSSRS, 출력 안전 검증, 데이터 보호, LLM 옵저버빌리티) |
| 3D 캐릭터 없음 | 환경만 | 엄마(라일락) + 아이(스카이블루) 2쌍, 바운스 애니메이션 |

---

## 9. PDF 보고서 핵심 적용사항

참고 문서: `/Users/minjunekang/Desktop/엄마엄마동화/3D 웹 디자인 레퍼런스 요청.pdf`

### 적용 완료
- [x] 클레이모피즘 UI (Section 3.1)
- [x] 스크롤리텔링 (Section 3.3)
- [x] 선명 파스텔 팔레트 (Section 3.1 — #C58AF9 라일락, #81C995 피스타치오)
- [x] 세리프 폰트 (Noto Serif KR)
- [x] Phase별 UI/UX 매핑 전략 (Section 2 테이블)
- [x] Low-poly 3D 캐릭터

### 실서비스 적용 시 추가 구현 필요
- [ ] 수채화 텍스처 맵핑 NPR 3D (Section 3.2)
- [ ] GSAP + R3F useScroll 연동 (Section 6.1)
- [ ] Spline 에셋 도입 검토 (Section 6.2)
- [ ] 감정 몬스터 3D 캐릭터 (Phase 3 — Section 5.1 #3 Lennnie 참고)
- [ ] Sound-Enhanced UX — 앰비언트 사운드/효과음 (Section 5.2 #6 Locomotive 참고)
- [ ] Draco 압축 + 디바이스별 성능 최적화 (Section 6.3)
- [ ] 스켈레톤 스크린 + 심호흡 유도 로딩 UX (Section 6.3)

---

## 10. 레퍼런스 사이트

| 사이트 | 카테고리 | 참고 포인트 |
|--------|---------|----------|
| Vibrant Wellness | 웰니스 3D | 파스텔 톤 + 3D 전환 효과 |
| Echo Mental Wellness | 웰니스 감성 | 뉴트럴 톤 + 미니멀 레이아웃 |
| Lennnie | 캐릭터 인터랙션 | 기괴+귀여운 캐릭터 외재화 |
| Nomadic Tribe | 스크롤리텔링 | Awwwards SOTY, 4챕터 서사 |
| Immersive Garden | 마우스 반응 3D | 파티클 인터랙션 |
| Aimee's Papercraft | NPR 수채화 | R3F + Blender + Krita 수채화 |
| Peter Tarka | 3D 히어로 | Matcaps + 타이포그래피 |
| Epic Agency | 키네틱 타이포 | 여백 + 타이포 애니메이션 |

### 플랫폼
- **Awwwards**: `3D` + `Storytelling` 필터
- **Lapa Ninja**: `3D Websites` 카테고리
- **Spline Community**: 클레이모피즘 + 인터랙티브 템플릿
- **Dribbble**: `Mental Health 3D`, `Claymorphism` 키워드
