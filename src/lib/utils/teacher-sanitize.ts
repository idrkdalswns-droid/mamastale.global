/**
 * 선생님 모드 — 사용자 입력 위생처리 (sanitize)
 *
 * 3-레이어 인젝션 방어 중 Layer 2(프롬프트)와 Layer 3(추출)에서 공유.
 * 시스템 텍스트에는 절대 적용하지 않습니다 — 사용자 유래 필드만 대상.
 *
 * @module teacher-sanitize
 */

/**
 * 사용자 입력을 위생처리하여 프롬프트 인젝션을 방어합니다.
 *
 * 처리 순서:
 * 1. 개행 → 공백 (프롬프트 구조 탈출 방지)
 * 2. 대괄호 태그 패턴 제거 ([GENERATE_READY], [SP01], [/READING_GUIDE] 등)
 * 3. HTML/XML 태그 제거
 * 4. trim + 길이 제한
 *
 * @param input 사용자 입력 문자열
 * @param maxLen 최대 허용 길이
 * @returns 위생처리된 문자열 (빈 값이면 "미정")
 */
export function sanitizeUserInput(
  input: string | undefined | null,
  maxLen: number
): string {
  if (!input) return "미정";
  let s = String(input);
  s = s.replace(/[\n\r]+/g, " "); // 개행 → 공백
  s = s.replace(/\[\/?\w+(?:_\w+)*\]/g, ""); // 대괄호 태그 패턴 모두 제거
  s = s.replace(/<[^>]+>/g, ""); // HTML/XML 태그
  s = s.trim().slice(0, maxLen);
  return s || "미정";
}
