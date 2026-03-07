# /crisis-test — 위기감지 시스템 회귀 테스트

위기감지 시스템의 3단계(HIGH/MEDIUM/LOW) 분류가 정상 작동하는지 검증합니다.

## 순서

1. `src/lib/anthropic/system-prompt.ts` 파일을 읽고 현재 위기 키워드 목록 확인
2. 각 심각도별 대표 키워드로 `screenForCrisis()` 함수 호출 테스트:
   - **HIGH**: "죽고싶", "자살", "유서를 써" → severity=HIGH, CSSRS Level 4-5 확인
   - **MEDIUM**: "살고싶지않", "희망이없어" → severity=MEDIUM, CSSRS Level 2-3 확인
   - **LOW**: "잠을못자", "계속울어" → severity=LOW, CSSRS Level 1 확인
3. **False positive 테스트**: "웃겨죽겠", "배꼽빠지게", "killing it" → severity=null 확인
4. **다국어 테스트**: 일본어("死にたい"), 중국어("不想活了") 키워드 감지 확인
5. `src/lib/anthropic/output-safety.ts`의 `validateOutputSafety()` 테스트:
   - 독성 긍정 문장 감지: "괜찮아질 거예요", "시간이 약이에요"
   - 의료 조언 감지: "약을 드세요", "진단"
6. 테스트 결과를 요약 보고

## 주의사항

- 위기 키워드를 절대 임의로 수정하지 마세요 (임상 검증 필요)
- 테스트 실패 시 즉시 보고하고, 수정은 plan.md를 먼저 작성하세요
