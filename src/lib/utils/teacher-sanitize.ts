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
/** Control tags that must never pass through to AI prompts */
const CONTROL_TAG_PREFIXES = [
  "PHASE", "GENERATE", "EXTRACTION", "INTRO", "CONFLICT",
  "ATTEMPT", "RESOLUTION", "WISDOM", "SP", "READING_GUIDE",
  "SCENE", "STORY_COMPLETE",
];
const CONTROL_TAG_PATTERN = new RegExp(
  `\\[\\/?\\s*(?:${CONTROL_TAG_PREFIXES.join("|")})\\b[^\\]]*\\]`,
  "gi"
);

export function sanitizeUserInput(
  input: string | undefined | null,
  maxLen: number
): string {
  if (!input) return "미정";
  let s = String(input);
  // BugBounty-FIX: Decode HTML entities first to prevent double-encoding bypass
  s = s.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
  s = s.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  s = s.replace(/[\n\r]+/g, " "); // 개행 → 공백
  // BugBounty-FIX: Blocklist control tags only (allows normal brackets like [오늘의 목표])
  s = s.replace(CONTROL_TAG_PATTERN, "");
  s = s.replace(/\[\/?\w+(?:_\w+)*\]/g, ""); // Legacy: remaining bracketed tags
  s = s.replace(/<[^>]+>/g, ""); // HTML/XML 태그
  s = s.trim().slice(0, maxLen);
  return s || "미정";
}
