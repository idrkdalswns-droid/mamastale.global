# /simplify — 코드 간소화 (Boris Cherny 패턴)

> Cherny: "구현 후 code-simplifier를 돌려 불필요한 복잡도를 제거"

최근 변경된 파일들의 코드를 간소화합니다.

## 수행 작업

1. `git diff --name-only HEAD~1`로 최근 변경 파일 확인
2. 각 파일에 대해:
   - 불필요한 추상화 제거
   - 중복 코드 통합
   - 복잡한 조건문 단순화
   - 미사용 import 제거
   - 과도한 주석 정리
3. `npm run build && npm test`로 검증
4. 변경 내역 요약

## 규칙

- 동작 변경 없음 (리팩토링만)
- 🔴 민감 영역 파일은 건드리지 않음
- 테스트 깨지면 즉시 revert
