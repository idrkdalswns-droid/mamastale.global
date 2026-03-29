/**
 * 딸깍 동화 — 세션 상태 머신
 * 유효한 상태 전이만 허용
 */

export type TQSessionStatus =
  | 'in_progress'
  | 'generating'
  | 'completed'
  | 'failed'
  | 'crisis_stopped'
  | 'abandoned';

const VALID_TRANSITIONS: Record<string, TQSessionStatus[]> = {
  in_progress: ['generating', 'crisis_stopped', 'abandoned'],
  generating: ['completed', 'failed'],
  failed: ['generating'],
  // completed, crisis_stopped, abandoned → terminal (no transitions)
};

const TERMINAL_STATES: TQSessionStatus[] = ['completed', 'crisis_stopped', 'abandoned'];

export function validateTransition(
  current: TQSessionStatus,
  next: TQSessionStatus,
): boolean {
  return VALID_TRANSITIONS[current]?.includes(next) ?? false;
}

