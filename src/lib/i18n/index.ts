export { t, type ErrorKey, type MessageKey } from "./errors";
// tc는 여기서 re-export하지 않음 — 서버 번들 오염 방지
// 클라이언트: import { tc } from "@/lib/i18n/client"
