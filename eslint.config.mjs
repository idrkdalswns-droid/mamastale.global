// @ts-check
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals"),
  {
    rules: {
      // ─── Nathan LeClaire: "슬롭 계수 방지" 핵심 규칙 ───

      // 사용하지 않는 변수 경고 (언더스코어 prefix 허용)
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      }],

      // console.log 경고 (error/warn은 허용)
      "no-console": ["warn", { allow: ["warn", "error"] }],

      // any 타입 사용 경고
      "@typescript-eslint/no-explicit-any": "warn",

      // 빈 함수 경고 (catch 블록 허용)
      "no-empty": ["warn", { allowEmptyCatch: true }],

      // 중첩 깊이 제한 (최대 4단계)
      "max-depth": ["warn", 4],

      // 함수 파라미터 수 제한
      "max-params": ["warn", 5],

      // == 대신 === 강제
      "eqeqeq": ["error", "always"],

      // var 금지 (let/const 사용)
      "no-var": "error",

      // const 선호
      "prefer-const": "warn",

      // 화살표 함수 본문 스타일
      "arrow-body-style": ["warn", "as-needed"],

      // React hooks 규칙 강제
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    // 테스트 파일은 규칙 완화
    files: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "no-console": "off",
      "max-depth": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    // 마이그레이션/스크립트는 console 허용
    files: ["scripts/**/*", "supabase/**/*"],
    rules: {
      "no-console": "off",
    },
  },
];

export default eslintConfig;
