/**
 * 햅틱 피드백 유틸리티
 * iOS Safari에서는 navigator.vibrate 미지원이므로 조용히 무시
 */

export function hapticLight() {
  try {
    navigator.vibrate?.(10);
  } catch {
    // Not supported — silently ignore
  }
}

export function hapticMedium() {
  try {
    navigator.vibrate?.(25);
  } catch {
    // Not supported
  }
}

export function hapticSuccess() {
  try {
    navigator.vibrate?.([15, 50, 15]);
  } catch {
    // Not supported
  }
}

export function hapticError() {
  try {
    navigator.vibrate?.([30, 30, 30]);
  } catch {
    // Not supported
  }
}
