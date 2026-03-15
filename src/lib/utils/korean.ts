/**
 * 한글 이름에 맞는 조사를 붙이는 유틸리티
 *
 * 한글 유니코드 범위(0xAC00~0xD7A3)에서 받침 여부를 판별하여
 * 적절한 조사를 선택합니다.
 *
 * @example
 * nameWithParticle("서연", "이를", "를")   → "서연이를"
 * nameWithParticle("민준", "이를", "를")   → "민준이를"
 * nameWithParticle("서연", "이에게", "에게") → "서연이에게"
 * nameWithParticle("서연", "이의", "의")   → "서연이의"
 */
export function nameWithParticle(
  name: string,
  withFinal: string,
  withoutFinal: string,
): string {
  if (!name) return "";
  const lastChar = name.charCodeAt(name.length - 1);
  // 한글 유니코드 범위 밖이면 withoutFinal 기본 적용
  if (lastChar < 0xAC00 || lastChar > 0xD7A3) return name + withoutFinal;
  const hasFinal = (lastChar - 0xAC00) % 28 !== 0;
  return name + (hasFinal ? withFinal : withoutFinal);
}
