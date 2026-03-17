/**
 * 선생님 모드 — PDF 공유 유틸리티
 *
 * teacher-activity-sheet.ts, teacher-reading-guide.ts에서 중복되는 함수들을 추출.
 *
 * @module teacher-pdf-utils
 */

/** HTML 특수문자 이스케이프 */
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** 스프레드 → 3막 구조 라벨 */
export function getActLabel(num: number): string {
  if (num <= 4) return "도입";
  if (num <= 11) return "전개";
  return "결말";
}

/** 스프레드 → 3막 구조 색상 */
export function getActColor(num: number): string {
  if (num <= 4) return "#7FBFB0";
  if (num <= 11) return "#E07A5F";
  return "#8B6AAF";
}

/** 연령 그룹 → 한국어 라벨 */
export const AGE_LABELS: Record<string, string> = {
  infant: "영아반 (0-2세)",
  toddler: "유아반 (3-4세)",
  kindergarten: "유치반 (5-7세)",
  mixed: "혼합연령반",
};
