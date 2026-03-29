/**
 * 공유 API 에러 메시지 상수.
 * 48개 API 라우트에서 반복 사용되는 에러 메시지를 한 곳에서 관리합니다.
 */
export const API_ERRORS = {
  DB_NOT_CONFIGURED: { error: "시스템 설정 오류입니다." } as const,
  AUTH_REQUIRED: { error: "로그인이 필요합니다." } as const,
  INVALID_JSON: { error: "잘못된 요청 형식입니다." } as const,
  RATE_LIMITED: { error: "요청이 너무 많습니다." } as const,
  NOT_FOUND: { error: "찾을 수 없습니다." } as const,
  INTERNAL: { error: "서버 오류가 발생했습니다." } as const,
} as const;
