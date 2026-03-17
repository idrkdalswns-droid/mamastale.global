/**
 * 선생님 모드 — 14스프레드 파서
 *
 * AI 생성 출력에서 14개 스프레드 + 4개 부가자료 섹션을 파싱합니다.
 * 기존 story-parser.ts의 cleanSceneText() 재사용.
 *
 * 파싱 전략 (우선순위):
 *   1. [SP01] ~ [SP14] 태그 (권장)
 *   2. [스프레드 1] ~ [스프레드 14] 한국어 태그 (폴백)
 *   3. 번호 기반 (최종 폴백)
 *
 * @module teacher-story-parser
 */

import { cleanSceneText } from "./story-parser";

export interface TeacherSpread {
  spreadNumber: number;
  title: string;
  text: string;
}

export interface TeacherMetadata {
  readingGuide?: string;
  illustPrompts?: string;
  nuriMapping?: string;
  devReview?: string;
}

export interface TeacherParseResult {
  spreads: TeacherSpread[];
  metadata: TeacherMetadata;
  parseWarnings: string[];
}

// ─── 부가자료 파싱 ───

const METADATA_PATTERNS: Record<string, RegExp> = {
  readingGuide: /\[READING_GUIDE\]([\s\S]*?)\[\/READING_GUIDE\]/i,
  illustPrompts: /\[ILLUST_PROMPTS\]([\s\S]*?)\[\/ILLUST_PROMPTS\]/i,
  nuriMapping: /\[NURI_MAP\]([\s\S]*?)\[\/NURI_MAP\]/i,
  devReview: /\[DEV_REVIEW\]([\s\S]*?)\[\/DEV_REVIEW\]/i,
};

function parseMetadata(text: string): TeacherMetadata {
  const result: TeacherMetadata = {};
  for (const [key, regex] of Object.entries(METADATA_PATTERNS)) {
    const match = text.match(regex);
    if (match) {
      result[key as keyof TeacherMetadata] = match[1].trim();
    }
  }
  return result;
}

// ─── 부가자료 제거 헬퍼 ───

/** 4개 부가자료 태그를 본문에서 제거 (paired → 미닫힘 fallback) */
function stripMetadataSections(text: string): string {
  const tags = ["READING_GUIDE", "ILLUST_PROMPTS", "NURI_MAP", "DEV_REVIEW"];
  let result = text;
  for (const tag of tags) {
    // 1차: paired tag (닫힘 태그 있음)
    result = result.replace(
      new RegExp(`\\[${tag}\\][\\s\\S]*?\\[\\/${tag}\\]`, "gi"),
      ""
    );
    // 2차 fallback: 미닫힘 (닫힘 태그 없이 끝까지)
    result = result.replace(
      new RegExp(`\\[${tag}\\](?![\\s\\S]*\\[\\/${tag}\\])[\\s\\S]*$`, "gi"),
      ""
    );
  }
  return result;
}

// ─── 스프레드 파싱 전략 ───

/** 전략 1: [SP01] ~ [SP14] 영문 태그 (메인) */
function parseWithSPTags(text: string): TeacherSpread[] {
  const spreads: TeacherSpread[] = [];

  // 부가자료 섹션 제거 (paired + 미닫힘 fallback)
  const mainText = stripMetadataSections(text);

  const pattern = /\[SP\s*0?(\d{1,2})\]\s*([\s\S]*?)(?=\[SP\s*0?\d{1,2}\]|$)/gi;

  let match;
  while ((match = pattern.exec(mainText)) !== null) {
    const num = parseInt(match[1], 10);
    if (num < 1 || num > 14) continue;

    const block = match[2].trim();
    if (!block) continue;

    const lines = block.split("\n").filter((l) => l.trim());
    const title = (lines[0] || `스프레드 ${num}`)
      .replace(/^#+\s*/, "")
      .replace(/^\*\*(.+)\*\*$/, "$1")
      .trim();
    const body = lines.length > 1 ? lines.slice(1).join("\n").trim() : title;

    spreads.push({
      spreadNumber: num,
      title: cleanSceneText(title),
      text: cleanSceneText(body),
    });
  }

  return spreads;
}

/** 전략 2: [스프레드 1] ~ [스프레드 14] 한국어 태그 */
function parseWithKoreanTags(text: string): TeacherSpread[] {
  const spreads: TeacherSpread[] = [];

  const mainText = stripMetadataSections(text);

  // [스프레드 1], 스프레드 1:, **스프레드 1** 등
  const pattern = /(?:\[스프레드\s*(\d{1,2})\]|스프레드\s*(\d{1,2})\s*:|^\*\*스프레드\s*(\d{1,2})\*\*)\s*([\s\S]*?)(?=(?:\[스프레드\s*\d|스프레드\s*\d{1,2}\s*:|\*\*스프레드\s*\d)|$)/gim;

  let match;
  while ((match = pattern.exec(mainText)) !== null) {
    const num = parseInt(match[1] || match[2] || match[3], 10);
    if (num < 1 || num > 14) continue;

    const block = match[4].trim();
    if (!block) continue;

    const lines = block.split("\n").filter((l) => l.trim());
    const title = (lines[0] || `스프레드 ${num}`)
      .replace(/^#+\s*/, "")
      .replace(/^\*\*(.+)\*\*$/, "$1")
      .trim();
    const body = lines.length > 1 ? lines.slice(1).join("\n").trim() : title;

    spreads.push({
      spreadNumber: num,
      title: cleanSceneText(title),
      text: cleanSceneText(body),
    });
  }

  return spreads;
}

/** 전략 3: 번호 기반 폴백 (1. ~ 14.) */
function parseWithNumberedList(text: string): TeacherSpread[] {
  const spreads: TeacherSpread[] = [];

  const mainText = stripMetadataSections(text);

  const pattern = /^(\d{1,2})[.)]\s*([\s\S]*?)(?=^\d{1,2}[.)]\s|$)/gm;

  let match;
  while ((match = pattern.exec(mainText)) !== null) {
    const num = parseInt(match[1], 10);
    if (num < 1 || num > 14) continue;

    const block = match[2].trim();
    if (!block) continue;

    const lines = block.split("\n").filter((l) => l.trim());
    const title = (lines[0] || `스프레드 ${num}`)
      .replace(/^#+\s*/, "")
      .trim();
    const body = lines.length > 1 ? lines.slice(1).join("\n").trim() : title;

    spreads.push({
      spreadNumber: num,
      title: cleanSceneText(title),
      text: cleanSceneText(body),
    });
  }

  return spreads;
}

// ─── 메인 파서 ───

/**
 * AI 생성 텍스트에서 14스프레드 + 부가자료를 파싱합니다.
 *
 * @param rawText - AI 응답 전문
 * @returns 파싱된 스프레드, 메타데이터, 경고 목록
 */
export function parseTeacherStory(rawText: string): TeacherParseResult {
  const warnings: string[] = [];
  const metadata = parseMetadata(rawText);

  // 전략 1: [SP01] 태그
  let spreads = parseWithSPTags(rawText);
  if (spreads.length >= 10) {
    if (spreads.length < 14) {
      warnings.push(
        `14개 중 ${spreads.length}개만 파싱되었습니다. 일부 스프레드가 누락되었을 수 있어요.`
      );
    }
    return { spreads, metadata, parseWarnings: warnings };
  }

  // 전략 2: 한국어 태그
  spreads = parseWithKoreanTags(rawText);
  if (spreads.length >= 10) {
    warnings.push("한국어 태그로 파싱되었습니다.");
    if (spreads.length < 14) {
      warnings.push(
        `14개 중 ${spreads.length}개만 파싱되었습니다.`
      );
    }
    return { spreads, metadata, parseWarnings: warnings };
  }

  // 전략 3: 번호 리스트
  spreads = parseWithNumberedList(rawText);
  if (spreads.length >= 5) {
    warnings.push("번호 목록으로 파싱되었습니다. 정확도가 낮을 수 있어요.");
    return { spreads, metadata, parseWarnings: warnings };
  }

  // 모든 전략 실패 — SP 태그로 파싱된 것이 있으면 그나마 반환
  const lastResort = parseWithSPTags(rawText);
  if (lastResort.length > 0) {
    warnings.push(
      `${lastResort.length}개 스프레드만 파싱되었습니다. 다시 생성을 시도해주세요.`
    );
    return { spreads: lastResort, metadata, parseWarnings: warnings };
  }

  warnings.push("스프레드를 파싱할 수 없습니다. 다시 생성해주세요.");
  return { spreads: [], metadata, parseWarnings: warnings };
}

/**
 * 스프레드에서 제목(동화 제목)을 추출합니다.
 * SP01의 제목을 기반으로 동화 전체 제목을 추론합니다.
 */
export function extractStoryTitle(
  spreads: TeacherSpread[],
  topic?: string | null
): string {
  // SP01 제목을 우선, 제네릭 제목이면 topic fallback
  const firstTitle = spreads[0]?.title;
  if (firstTitle && !/^스프레드\s*\d+$/.test(firstTitle)) {
    return firstTitle;
  }
  if (topic) return `${topic} 이야기`;
  return "새 동화";
}
