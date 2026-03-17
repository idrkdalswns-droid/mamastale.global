---
name: review-orchestrator
description: "7-Pass 직렬 코드 리뷰 파이프라인 오케스트레이터. 보안→백엔드→프론트→UX→아키텍처→비즈니스→통합 순서로 7개 전문 에이전트를 순차 실행한다. 각 패스는 이전 패스의 findings.json을 읽고 교차 분석한다."
---

# /review — 7-Pass 직렬 코드 리뷰 파이프라인

> mamastale 전용. 7개 전문 검수관이 순차적으로 코드를 분석하고, 파일 기반으로 컨텍스트를 전달한다.

## STEP 0: 초기화

```bash
mkdir -p .review/pass-{1..7}
echo '{"pipeline_version":"2.0","start_time":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","project":"mamastale"}' > .review/config.json
```

## STEP 1~7: 순차 실행

각 패스를 **순서대로** 실행한다. 병렬 실행 금지 — 이전 패스의 findings.json이 다음 패스의 입력이다.

| 순서 | 슬래시 커맨드 | 역할 | 출력 |
|------|-------------|------|------|
| 1 | `/review-security` | OWASP + 프롬프트 인젝션 + 결제 | `.review/pass-1/findings.json` |
| 2 | `/review-backend` | API + DB + 에러 핸들링 + AI 파이프라인 | `.review/pass-2/findings.json` |
| 3 | `/review-frontend` | WCAG + CWV + 상태 관리 + 반응형 | `.review/pass-3/findings.json` |
| 4 | `/review-ux` | Nielsen 10 + 페르소나 3명 + 감정 디자인 | `.review/pass-4/findings.json` |
| 5 | `/review-architecture` | 근본 원인 + 확장성 + 기술 부채 등급 | `.review/pass-5/findings.json` |
| 6 | `/review-business` | Devil's Advocate + Monte Carlo + Pre-mortem | `.review/pass-6/findings.json` |
| 7 | `/review-integration` | 교차 레이어 + 런치 판정 + 최종 리포트 | `.review/pass-7/findings.json` |

## 실행 방법

### 전체 파이프라인

```
/review
```

7개 패스를 순차 실행. 약 30~60분 소요.

### 개별 패스

```
/review-security      # 1차만
/review-backend       # 2차만 (1차 findings 필요)
/review-integration   # 7차만 (1~6차 findings 필요)
```

## 게이트 정책

각 패스 완료 후 게이트 체크:

- **CRITICAL ≥ 1** → 🔴 HALT (이후 패스 중단, 즉시 수정 필요)
- **HIGH ≥ 3** → 🟡 WARN (경고 후 계속 진행)
- 그 외 → 🟢 PASS

## Finding ID 체계

```
F{pass}-{seq}
예: F1-001 (1차 보안 검수 첫 번째 발견), F7-003 (7차 통합 검수 세 번째 발견)
```

## 최종 판정 (7차에서 산출)

| 판정 | 조건 |
|------|------|
| 🟢 **SHIP** | CRITICAL 0, HIGH ≤ 2, 교차 레이어 CRITICAL 0 |
| 🟡 **FIX** | CRITICAL 0, HIGH 3~5 또는 교차 레이어 HIGH 존재 |
| 🔴 **HALT** | CRITICAL ≥ 1 또는 HIGH ≥ 6 |

## 참조 파일

모든 참조 문서는 `.claude/commands/review-refs/`에 위치:

| 파일 | 용도 |
|------|------|
| `execution-protocol.md` | findings.json 스키마, 스캔 전략, 심각도 기준 |
| `cross-layer-matrix.md` | 12개 교차 레이어 패턴 |
| `security-scan.md` | 보안 스캔 명령 + mamastale 파일 우선순위 |
| `backend-scan.md` | API 센서스 + N+1 패턴 |
| `frontend-scan.md` | 접근성 + 성능 스캔 |
| `heuristic-checklist.md` | Nielsen 10 + 페르소나 + 감정 디자인 |
| `tech-debt-criteria.md` | 기술 부채 A~E 등급 |
| `revenue-model.md` | 단위 경제학 + Monte Carlo 변수 |

## 출력 구조

```
.review/
├── config.json              # 파이프라인 메타데이터
├── pass-1/
│   ├── findings.json        # 보안 검수 결과
│   └── scan-log.txt         # 스캔 로그
├── pass-2/ ~ pass-6/        # 각 패스 동일 구조
└── pass-7/
    ├── findings.json        # 통합 검수 결과
    └── final-report.md      # 최종 리포트 (판정 + 통계 + 로드맵)
```
