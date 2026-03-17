# 실행 프로토콜 상세

## findings.json 규격

모든 에이전트가 출력하는 findings의 표준 스키마:

```json
{
  "pass": 1,
  "agent": "security",
  "started_at": "2026-03-17T14:30:00Z",
  "completed_at": "2026-03-17T14:38:22Z",
  "target_files_scanned": 47,
  "summary": {
    "critical": 0, "high": 2, "medium": 3, "low": 1, "info": 0
  },
  "findings": [
    {
      "id": "F1-001",
      "severity": "HIGH",
      "category": "secret_exposure",
      "title": "서버 전용 API 키가 클라이언트 번들 경로에 노출 가능",
      "file": "src/lib/anthropic/client.ts",
      "line": 3,
      "code_snippet": "import Anthropic from '@anthropic-ai/sdk';",
      "evidence": "이 파일이 'use client' 컴포넌트에서 간접 import될 경우 API KEY가 번들에 포함됨",
      "impact": "공격자가 브라우저 DevTools에서 API 키를 추출하여 무제한 API 호출 가능",
      "fix": {
        "description": "파일 상단에 import 'server-only' 추가",
        "code": "import 'server-only';",
        "effort": "5분"
      },
      "confidence": 0.9,
      "scan_method": "grep + import chain trace",
      "related_findings": []
    }
  ],
  "cross_references": [
    {
      "my_finding": "F2-003",
      "references": "F1-003",
      "relationship": "extends",
      "detail": "1차에서 발견한 이슈의 백엔드 관점 추가 분석"
    }
  ],
  "scan_commands_executed": [],
  "files_deep_reviewed": [],
  "pass_verdict": "CONTINUE"
}
```

## 코드 스캐닝 전략 (모든 에이전트 공통)

### Phase 1: 지형 파악 (2분)
```bash
# 프로젝트 구조 파악
find src/ -type f -name '*.ts' -o -name '*.tsx' | head -50
wc -l src/**/*.ts src/**/*.tsx 2>/dev/null | sort -rn | head -20

# 진입점 파악
cat src/app/layout.tsx 2>/dev/null | head -30
cat src/app/page.tsx 2>/dev/null | head -50
cat src/middleware.ts 2>/dev/null | head -30

# 의존성 파악
cat package.json | grep -A 50 '"dependencies"'
```

### Phase 2: 위험 표면 식별 (3분)
```bash
# API 라우트 전수 목록
find src/app/api -name 'route.ts' 2>/dev/null | sort

# 인증이 필요한 라우트 vs 공개 라우트
grep -rn 'createRouteHandlerClient\|getUser\|auth\|getSession' src/app/api/ --include='*.ts' -l 2>/dev/null

# 외부 API 호출 지점
grep -rn 'fetch(\|axios\|\.from(' src/ --include='*.ts' -l 2>/dev/null

# 환경변수 사용 지점
grep -rn 'process\.env\.' src/ --include='*.ts' | grep -v node_modules
```

### Phase 3: 심층 분석 (에이전트별 특화)
각 에이전트의 references/ 에 정의된 전문 스캔 수행.

## 심각도 판정 기준

### CRITICAL — 서비스 불능 또는 데이터 침해
**질문**: "이 이슈가 악용되면 서비스가 멈추거나 사용자 데이터가 유출되는가?"
- 예: SQL Injection, 인증 우회, API 키 하드코딩, 무한 루프
- **증거 기준**: 공격 벡터를 구체적으로 재현 가능해야 CRITICAL. 이론적 가능성만으로는 HIGH.

### HIGH — 주요 기능 장애 또는 심각한 품질 결함
**질문**: "이 이슈가 사용자 10명 중 1명 이상에게 영향을 주는가?"
- 예: N+1 쿼리로 3초+ 로딩, 결제 후 포인트 미지급, 접근성 미달
- **증거 기준**: 파일:라인 + 코드 스니펫 + 영향 범위 정량화

### MEDIUM — 부분적 영향 또는 모범 사례 위반
**질문**: "이 이슈가 서비스 품질을 저하시키지만 핵심 기능은 작동하는가?"
- 예: 에러 메시지 불친절, 로딩 스켈레톤 누락, TypeScript any 사용

### LOW — 코드 품질 개선
- 예: 네이밍 개선, 미사용 import, 주석 부재

## 재검수(Re-review) 프로토콜

```bash
# 1. 변경 파일 식별
git diff --name-only HEAD~1 > .review/changed-files.txt

# 2. 변경에 영향받는 패스 결정
#    보안 관련 파일 변경 → 1차부터
#    API/DB 변경 → 2차부터
#    컴포넌트 변경 → 3차부터
#    비즈니스 로직 변경 → 6차부터

# 3. 이전 findings에서 해결된 것 표시
#    findings.json의 각 항목에 "status": "RESOLVED" | "OPEN" | "REGRESSION" 추가

# 4. 해당 패스부터 재실행
```

## 발견 ID 체계

```
F{패스}-{순번}     일반 발견     F1-001, F3-007
F{패스}-C{순번}    교차 발견     F2-C01 (1차 발견과 교차)
F7-X{순번}         크로스레이어   F7-X01 (7차 통합에서만)
```
