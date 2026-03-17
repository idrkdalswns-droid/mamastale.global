# 기술 부채 평가 기준

## 등급 산출 공식

```
기술부채비율 = (추정 수정 비용) / (추정 재개발 비용) × 100

A등급: 0~5%    — 깨끗. 정기 유지보수만으로 충분.
B등급: 5~10%   — 양호. 분기별 리팩토링 시간 확보 권장.
C등급: 10~20%  — 주의. 신규 기능 개발 속도 저하 시작.
D등급: 20~50%  — 위험. 버그 수정이 새 버그를 생성하는 단계.
E등급: 50%+    — 재작성 고려. 유지보수 비용 > 재개발 비용.
```

## 측정 항목별 스캔

### 1. 코드 복잡도 (목표: 파일당 200줄 이하, 함수당 30줄 이하)
```bash
# 200줄 이상 파일
find src/ -name '*.ts' -o -name '*.tsx' | xargs wc -l 2>/dev/null | sort -rn | awk '$1 > 200 {print}'

# 복잡한 컴포넌트 (조건부 렌더링 과다)
for f in $(find src/components -name '*.tsx' 2>/dev/null); do
  ternaries=$(grep -c '?' "$f" 2>/dev/null || echo 0)
  lines=$(wc -l < "$f")
  if [ "$ternaries" -gt 8 ] || [ "$lines" -gt 200 ]; then
    echo "⚠️ 복잡도: ${lines}줄, 삼항${ternaries}개 — $f"
  fi
done
```

### 2. 기술 부채 마커 (목표: 100줄당 0.5개 이하)
```bash
total_lines=$(find src/ -name '*.ts' -o -name '*.tsx' | xargs cat 2>/dev/null | wc -l)
markers=$(grep -rn 'TODO\|FIXME\|HACK\|XXX\|WORKAROUND\|TEMP\|DEPRECATED' src/ --include='*.ts' --include='*.tsx' | wc -l)
density=$(echo "scale=2; $markers * 100 / $total_lines" | bc 2>/dev/null || echo "N/A")
echo "마커 밀도: ${markers}개 / ${total_lines}줄 = 100줄당 ${density}개"
```

### 3. 테스트 커버리지 (목표: 핵심 로직 80%+)
```bash
# 테스트 파일 목록
test_files=$(find src/ -name '*.test.*' -o -name '*.spec.*' | wc -l)
source_files=$(find src/ -name '*.ts' -o -name '*.tsx' | grep -v test | grep -v spec | grep -v node_modules | wc -l)
echo "테스트 비율: $test_files / $source_files"

# 핵심 로직 중 테스트 없는 파일 (자동 탐색)
# API 라우트, 유틸 함수, 핵심 훅에 대응하는 .test.ts 파일 존재 여부 확인
for f in $(find src/lib src/app/api -name '*.ts' | grep -v test | grep -v node_modules); do
  test_file="${f%.ts}.test.ts"
  [ ! -f "$test_file" ] && echo "⚠️ 테스트 없음: $f"
done
```

### 4. 의존성 건강 (목표: outdated 20% 이하, 취약점 0)
```bash
npm outdated --json 2>/dev/null | head -50
npm audit --json 2>/dev/null | head -100
```

### 5. 코드 중복 (목표: 유사 패턴 3회 이상 반복 0건)
```bash
# 동일 패턴 반복 횟수
grep -rn 'createServerClient\|createRouteHandlerClient\|createClientComponentClient' src/ --include='*.ts' -l | wc -l

# 에러 응답 패턴 반복
grep -rn 'NextResponse.json.*error\|NextResponse.json.*500\|Response.json.*error' src/app/api/ --include='*.ts' | wc -l
```

## 확장성 병목 체크포인트

```
□ DB 동시 연결: 사용 중인 DB 서비스의 플랜별 한도
□ API Rate Limit: 외부 API(AI, 결제 등)의 분당 요청 한도
□ Runtime 메모리: Edge/Serverless 환경의 메모리 제한
□ 정적 자산: CDN 캐싱 설정, Cache-Control 헤더
□ DB 테이블 크기: 핵심 테이블의 사용자 증가 시 행 수 예측
```
