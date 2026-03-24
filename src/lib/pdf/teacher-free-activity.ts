/**
 * 선생님 모드 — 무료 아이들용 활동지 (HTML 기반)
 *
 * 5페이지 A4 구성:
 *   1p: 표지 (동화 제목, 연령, 누리과정, 이름칸)
 *   2p: 감정 표현 (도입 장면 기반)
 *   3p: 이야기 활동 (절정 장면 기반)
 *   4p: 종합 활동 (결말 장면 기반)
 *   5p: 나의 동화
 *
 * AI 호출 없음 — 스프레드 데이터에서 즉시 생성.
 * 동적 캐릭터 이름 추출로 동화별 맞춤 질문.
 *
 * @module teacher-free-activity
 */

import type { TeacherSpread, TeacherStoryMetadata } from "@/lib/types/teacher";
import { escapeHtml, getActColor, AGE_LABELS } from "./teacher-pdf-utils";

// ─── 3막 배경색 ───

function getActBg(num: number): string {
  if (num <= 4) return "#EEF6F3";
  if (num <= 11) return "#FFF4ED";
  return "#F3EDF7";
}

// ─── 핵심 3장면 선택 ───

function selectThreeScenes(spreads: TeacherSpread[]): {
  intro: TeacherSpread;
  climax: TeacherSpread;
  ending: TeacherSpread;
} {
  const len = spreads.length;
  if (len === 0) {
    const empty: TeacherSpread = { spreadNumber: 1, title: "", text: "" };
    return { intro: empty, climax: empty, ending: empty };
  }
  if (len <= 3) {
    return {
      intro: spreads[0],
      climax: spreads[Math.min(1, len - 1)],
      ending: spreads[len - 1],
    };
  }

  // 14 스프레드 기준: SP02(캐릭터 소개), SP08(갈등 최고조), SP13(해결)
  const findSP = (n: number) => spreads.find((s) => s.spreadNumber === n);
  return {
    intro: findSP(2) || spreads[1] || spreads[0],
    climax: findSP(8) || spreads[Math.floor(len / 2)],
    ending: findSP(13) || spreads[len - 2] || spreads[len - 1],
  };
}

// ─── 동적 캐릭터 이름 추출 ───

function extractCharacterName(text: string): string {
  // 1. 따옴표 안 이름: '솜사탕 곰', "작은 토끼"
  const quoted = text.match(/[''"]([가-힣a-zA-Z\s]{1,10})[''""]/);
  if (quoted) return quoted[1].trim();

  // 2. ~은/는/이/가 패턴에서 첫 명사: "솜사탕 엄마 곰은"
  const subjectMatch = text.match(/([가-힣]{1,8}(?:\s[가-힣]{1,4}){0,2})[은는이가]/);
  if (subjectMatch) {
    const name = subjectMatch[1].trim();
    // 일반적인 단어 제외
    const skipWords = ["오늘", "그날", "어느", "모든", "우리", "나는", "저는", "여기", "거기", "이것", "그것"];
    if (!skipWords.includes(name) && name.length >= 2) return name;
  }

  return "주인공";
}

// ─── 핵심 문장 추출 (첫 문장) ───

function getKeyLine(text: string): string {
  const firstSentence = text.split(/[.!?]\s/)[0];
  if (!firstSentence) return text.slice(0, 80);
  return firstSentence.length > 100 ? firstSentence.slice(0, 97) + "..." : firstSentence;
}

// ─── 연령별 줄 간격 ───

function getLineHeight(ageGroup: string): string {
  if (ageGroup === "infant") return "2.5em";
  if (ageGroup === "toddler") return "2.2em";
  return "2.0em";
}

function getWritingLineCount(ageGroup: string): number {
  if (ageGroup === "infant") return 2;
  if (ageGroup === "toddler") return 3;
  return 4;
}

// ─── 메인 HTML 생성 ───

export interface FreeActivityParams {
  title: string;
  spreads: TeacherSpread[];
  metadata: TeacherStoryMetadata;
  ageGroup?: string;
  kindergartenName?: string;
}

export function generateFreeActivityHtml(params: FreeActivityParams): string {
  const {
    title,
    spreads,
    metadata,
    ageGroup = "toddler",
    kindergartenName = "",
  } = params;

  const ageLabel = AGE_LABELS[ageGroup] || AGE_LABELS.toddler;
  const { intro, climax, ending } = selectThreeScenes(spreads);
  const lineH = getLineHeight(ageGroup);
  const lineCount = getWritingLineCount(ageGroup);

  // 각 장면에서 캐릭터 이름 추출
  const charIntro = extractCharacterName(intro.text);
  const charClimax = extractCharacterName(climax.text);
  const charEnding = extractCharacterName(ending.text);

  // 누리과정 영역 (메타데이터에서 추출하거나 기본값)
  const nuriDomain = metadata.nuriMapping
    ? metadata.nuriMapping.split("\n")[0]?.slice(0, 30) || "사회관계"
    : "사회관계";

  const safeTitle = escapeHtml(title);
  const safeKg = escapeHtml(kindergartenName);

  // 쓰기 줄 생성
  const writingLines = (count: number) =>
    Array.from({ length: count }, () =>
      `<div style="border-bottom: 1.5px dashed #D0D0D0; height: ${lineH};"></div>`
    ).join("");

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle} — 활동지</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap">
  <style>
    @page { size: A4 portrait; margin: 15mm 18mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Noto Sans KR', sans-serif;
      font-size: 14px;
      color: #5A3E2B;
      line-height: 1.6;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .page {
      page-break-after: always;
      min-height: 100vh;
      padding: 0;
    }
    .page:last-child { page-break-after: auto; }

    .accent-bar {
      height: 6px;
      border-radius: 0 0 3px 3px;
      margin-bottom: 20px;
    }
    .section-title {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .scene-quote {
      font-size: 13px;
      font-weight: 300;
      color: #8B6B57;
      padding: 10px 14px;
      background: rgba(0,0,0,0.02);
      border-left: 3px solid;
      border-radius: 0 8px 8px 0;
      margin-bottom: 12px;
      font-style: italic;
    }
    .activity-label {
      display: inline-block;
      font-size: 11px;
      font-weight: 500;
      padding: 3px 10px;
      border-radius: 10px;
      margin-bottom: 8px;
    }
    .instruction {
      font-size: 15px;
      font-weight: 500;
      margin-bottom: 8px;
    }
    .drawing-area {
      border: 2px dashed #D0D0D0;
      border-radius: 12px;
      background: rgba(255,255,255,0.5);
    }
    .circle-draw {
      border: 2px dashed #D0D0D0;
      border-radius: 50%;
      background: rgba(255,255,255,0.3);
    }
    .speech-bubble {
      position: relative;
      background: #FAFAF6;
      border: 1.5px solid #E0D8CC;
      border-radius: 16px;
      padding: 12px 14px;
    }
    .speech-bubble::after {
      content: '';
      position: absolute;
      bottom: -8px;
      left: 24px;
      width: 16px;
      height: 16px;
      background: #FAFAF6;
      border-right: 1.5px solid #E0D8CC;
      border-bottom: 1.5px solid #E0D8CC;
      transform: rotate(45deg);
    }
    .letter-area {
      border: 2px solid #E0D8CC;
      border-radius: 12px;
      padding: 16px;
      background: linear-gradient(to bottom, #FFFDF8, #FFF9F0);
    }
    .letter-header {
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 12px;
      color: #8B6B57;
    }
    .promise-item {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 8px;
    }
    .checkbox {
      width: 20px;
      height: 20px;
      border: 2px solid #D0D0D0;
      border-radius: 4px;
      flex-shrink: 0;
    }

    @media print and (monochrome) {
      .accent-bar { background: #333 !important; }
      .activity-label { border: 1px solid #666; background: transparent !important; color: #333 !important; }
    }
    @media print {
      body { font-size: 13px; }
      .page { min-height: auto; }
    }
  </style>
</head>
<body>

<!-- ════════════════════════════════════════
     PAGE 1: 표지
     ════════════════════════════════════════ -->
<div class="page">
  <div class="accent-bar" style="background: linear-gradient(90deg, #7FBFB0, #E07A5F, #8B6AAF);"></div>

  <div style="text-align: center; padding-top: 32px;">
    <div style="font-size: 12px; font-weight: 500; color: #7FBFB0; letter-spacing: 2px; margin-bottom: 16px;">
      오늘의 동화 활동지
    </div>
    <h1 style="font-size: 28px; font-weight: 700; line-height: 1.4; margin-bottom: 20px;">
      ${safeTitle}
    </h1>
    ${safeKg ? `<div style="font-size: 13px; color: #8B6B57; margin-bottom: 8px;">${safeKg}</div>` : ""}
    <div style="font-size: 13px; color: #8B6B57; margin-bottom: 32px;">${escapeHtml(ageLabel)}</div>

    <div style="display: inline-block; padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 500; background: ${getActBg(1)}; color: ${getActColor(1)}; border: 1px solid ${getActColor(1)}30;">
      🎯 ${escapeHtml(nuriDomain)}
    </div>
  </div>

  <div style="margin-top: 80px; text-align: center;">
    <div style="display: inline-block; width: 280px; text-align: left;">
      <div style="font-size: 12px; color: #8B6B57; margin-bottom: 6px;">이름</div>
      <div style="border-bottom: 2px solid #D0D0D0; height: 36px;"></div>
      <div style="font-size: 12px; color: #8B6B57; margin-top: 16px; margin-bottom: 6px;">날짜</div>
      <div style="border-bottom: 2px solid #D0D0D0; height: 36px;"></div>
    </div>
  </div>

</div>

<!-- ════════════════════════════════════════
     PAGE 2: 감정 표현 (도입 장면)
     ════════════════════════════════════════ -->
<div class="page">
  <div class="accent-bar" style="background: ${getActColor(intro.spreadNumber)};"></div>

  <div class="activity-label" style="background: ${getActBg(intro.spreadNumber)}; color: ${getActColor(intro.spreadNumber)};">
    SP${String(intro.spreadNumber).padStart(2, "0")} · ${getActColor(intro.spreadNumber) === "#7FBFB0" ? "도입" : "전개"}
  </div>

  <div class="scene-quote" style="border-color: ${getActColor(intro.spreadNumber)};">
    "${escapeHtml(getKeyLine(intro.text))}"
  </div>

  <div class="section-title">💭 ${escapeHtml(charIntro)}${charIntro.endsWith("요") || charIntro.endsWith("다") ? "의" : "은(는)"} 어떤 기분일까?</div>

  <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px;">
    ${["😊 기쁨", "😢 슬픔", "😠 화남", "😨 무서움"].map((label) => `
      <div style="text-align: center;">
        <div class="circle-draw" style="width: 100px; height: 100px; margin: 0 auto 6px;"></div>
        <div style="font-size: 11px; font-weight: 500;">${label}</div>
      </div>
    `).join("")}
  </div>

  <div class="instruction">💬 나는 언제 이런 기분이 들었을까?</div>
  <div class="speech-bubble" style="min-height: 80px;">
    ${writingLines(lineCount)}
  </div>

</div>

<!-- ════════════════════════════════════════
     PAGE 3: 이야기 활동 (절정 장면)
     ════════════════════════════════════════ -->
<div class="page">
  <div class="accent-bar" style="background: ${getActColor(climax.spreadNumber)};"></div>

  <div class="activity-label" style="background: ${getActBg(climax.spreadNumber)}; color: ${getActColor(climax.spreadNumber)};">
    SP${String(climax.spreadNumber).padStart(2, "0")} · 전개
  </div>

  <div class="scene-quote" style="border-color: ${getActColor(climax.spreadNumber)};">
    "${escapeHtml(getKeyLine(climax.text))}"
  </div>

  <div class="section-title">🌟 내가 ${escapeHtml(charClimax)}라면?</div>
  <div class="drawing-area" style="min-height: 280px; margin-bottom: 8px;"></div>
  ${writingLines(lineCount)}

  <div style="margin-top: 24px;">
    <div class="section-title">🎭 친구와 역할놀이 해봐요!</div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
      <div>
        <div style="font-size: 12px; font-weight: 500; color: #E07A5F; margin-bottom: 6px;">나</div>
        <div class="speech-bubble" style="min-height: 80px;">
          ${writingLines(2)}
        </div>
      </div>
      <div>
        <div style="font-size: 12px; font-weight: 500; color: #7FBFB0; margin-bottom: 6px;">친구</div>
        <div class="speech-bubble" style="min-height: 80px;">
          ${writingLines(2)}
        </div>
      </div>
    </div>
  </div>

</div>

<!-- ════════════════════════════════════════
     PAGE 4: 종합 활동 (결말 장면)
     ════════════════════════════════════════ -->
<div class="page">
  <div class="accent-bar" style="background: ${getActColor(ending.spreadNumber)};"></div>

  <div class="activity-label" style="background: ${getActBg(ending.spreadNumber)}; color: ${getActColor(ending.spreadNumber)};">
    SP${String(ending.spreadNumber).padStart(2, "0")} · 결말
  </div>

  <div class="scene-quote" style="border-color: ${getActColor(ending.spreadNumber)};">
    "${escapeHtml(getKeyLine(ending.text))}"
  </div>

  <div class="section-title">💌 ${escapeHtml(charEnding)}에게 편지 쓰기</div>
  <div class="letter-area" style="min-height: 260px;">
    <div class="letter-header">${escapeHtml(charEnding)}에게</div>
    ${writingLines(lineCount + 2)}
    <div style="text-align: right; margin-top: 12px; font-size: 13px; color: #8B6B57;">
      보내는 사람: <span style="border-bottom: 1.5px solid #D0D0D0; display: inline-block; width: 80px;"></span>
    </div>
  </div>

  <div style="margin-top: 24px;">
    <div class="section-title">🤝 우리 반 약속 만들기</div>
    <div style="font-size: 12px; color: #8B6B57; margin-bottom: 10px;">
      이 동화를 읽고 우리 반이 함께 지킬 약속을 만들어봐요.
    </div>
    ${Array.from({ length: 3 }, (_, i) => `
      <div class="promise-item">
        <div class="checkbox"></div>
        <div style="border-bottom: 1.5px dashed #D0D0D0; flex: 1; height: ${lineH};"></div>
      </div>
    `).join("")}
  </div>

</div>

<!-- ════════════════════════════════════════
     PAGE 5: 나의 동화 + 유료 CTA
     ════════════════════════════════════════ -->
<div class="page">
  <div class="accent-bar" style="background: linear-gradient(90deg, #7FBFB0, #E07A5F, #8B6AAF);"></div>

  <div class="section-title">📖 내가 만드는 뒷이야기</div>
  <div style="font-size: 12px; color: #8B6B57; margin-bottom: 12px;">
    이 동화의 뒷이야기를 상상해서 그리고 써봐요!
  </div>

  <div class="drawing-area" style="min-height: 350px; margin-bottom: 8px;"></div>
  ${writingLines(lineCount)}

  <div style="margin-top: 16px;">
    <div style="display: flex; gap: 12px; align-items: center;">
      <div style="text-align: center; flex: 1;">
        <div style="width: 70px; height: 70px; border: 2px dashed #E07A5F; border-radius: 50%; margin: 0 auto 6px; display: flex; align-items: center; justify-content: center; font-size: 20px;">⭐</div>
        <div style="font-size: 10px; color: #8B6B57;">선생님 칭찬</div>
      </div>
      <div style="text-align: center; flex: 1;">
        <div style="width: 70px; height: 70px; border: 2px dashed #7FBFB0; border-radius: 50%; margin: 0 auto 6px; display: flex; align-items: center; justify-content: center; font-size: 20px;">💖</div>
        <div style="font-size: 10px; color: #8B6B57;">엄마아빠 칭찬</div>
      </div>
      <div style="text-align: center; flex: 1;">
        <div style="width: 70px; height: 70px; border: 2px dashed #8B6AAF; border-radius: 50%; margin: 0 auto 6px; display: flex; align-items: center; justify-content: center; font-size: 20px;">🌈</div>
        <div style="font-size: 10px; color: #8B6B57;">친구 칭찬</div>
      </div>
    </div>
  </div>

  <p style="font-size: 11px; color: #C4A882; text-align: center; margin-top: 16px;">
    이 동화로 더 많은 활동을 만들고 싶다면, 선생님 모드에서 AI 맞춤 활동지를 이용해 보세요.
  </p>

</div>

<script>window.onload = function() { window.print(); }</script>
</body>
</html>`;
}
