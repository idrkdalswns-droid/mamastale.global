/**
 * 선생님 모드 — 활동지 PDF (HTML 기반)
 *
 * 16페이지 A4 구성:
 *   1p:  표지 (제목, 반 이름, 연령, 누리과정 연계 영역)
 *   2p:  선생님 가이드 (교육 목표, 확장 활동, 읽어주기 팁)
 *   3-12p: 장면 활동지 10장 (핵심 스프레드별)
 *   13-14p: 종합 활동 (편지 쓰기, 우리 반 약속)
 *   15p: 가정 연계 안내문
 *   16p: 삽화 프롬프트 카드 (3개 핵심 장면)
 *
 * @module teacher-activity-sheet
 */

import type { TeacherSpread, TeacherStoryMetadata } from "@/lib/types/teacher";

// ─── 유틸 ───

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** 스프레드 → 3막 구조 라벨 */
function getActLabel(num: number): string {
  if (num <= 4) return "도입";
  if (num <= 11) return "전개";
  return "결말";
}

/** 3막 색상 */
function getActColor(num: number): string {
  if (num <= 4) return "#7FBFB0";
  if (num <= 11) return "#E07A5F";
  return "#8B6AAF";
}

/** 3막 배경색 */
function getActBg(num: number): string {
  if (num <= 4) return "#EEF6F3";
  if (num <= 11) return "#FFF4ED";
  return "#F3EDF7";
}

// ─── 연령 라벨 ───

const AGE_LABELS: Record<string, string> = {
  infant: "영아반 (0-2세)",
  toddler: "유아반 (3-4세)",
  kindergarten: "유치반 (5-7세)",
  mixed: "혼합연령반",
};

// ─── 핵심 스프레드 10개 선택 ───

function selectKeySpreads(spreads: TeacherSpread[]): TeacherSpread[] {
  if (spreads.length <= 10) return spreads;
  // 14스프레드에서 10개 선택: 1-4(도입 전체) + 5,7,9,11(전개 짝수) + 13,14(결말)
  const picks = [1, 2, 3, 4, 5, 7, 9, 11, 13, 14];
  return picks
    .map((n) => spreads.find((s) => s.spreadNumber === n))
    .filter(Boolean) as TeacherSpread[];
}

// ─── 삽화 프롬프트에서 핵심 3개 추출 ───

function extractKeyIllustPrompts(illustPrompts?: string): string[] {
  if (!illustPrompts) return [];
  // [SP01], [SP07], [SP14] 등의 패턴에서 추출
  const sections = illustPrompts.split(/\[SP\s*\d+\]/gi).filter((s) => s.trim());
  if (sections.length <= 3) return sections.map((s) => s.trim());
  // 도입(첫), 클라이맥스(중간), 결말(끝)
  return [
    sections[0].trim(),
    sections[Math.floor(sections.length / 2)].trim(),
    sections[sections.length - 1].trim(),
  ];
}

// ─── 활동 질문 생성 ───

function getActivityQuestion(num: number): string {
  const questions: Record<number, string> = {
    1: "이 장면에서 어떤 느낌이 드나요? 얼굴로 표현해볼까요?",
    2: "주인공은 지금 어디에 있을까요? 그려볼 수 있어요?",
    3: "만약 친구가 이런 상황이라면 뭐라고 말해줄 거예요?",
    4: "이 장면에서 들리는 소리가 있을까요? 흉내 내볼까요?",
    5: "주인공의 마음이 어떨지 이야기해봐요.",
    6: "여러분이 주인공이라면 어떻게 했을까요?",
    7: "이 장면에서 가장 중요한 것은 무엇일까요?",
    8: "주인공에게 편지를 써볼까요?",
    9: "이 이야기에서 배운 것이 있나요?",
    10: "이 이야기의 뒷이야기를 만들어볼까요?",
  };
  return questions[num] || "이 장면에서 느낀 것을 이야기해봐요.";
}

function getPlayActivity(num: number): string {
  const activities: Record<number, string> = {
    1: "🎭 역할놀이: 주인공처럼 인사해보기",
    2: "🖍️ 미술놀이: 이 장면을 그림으로 그려보기",
    3: "🗣️ 말놀이: 주인공의 대사를 바꿔서 말해보기",
    4: "🎵 음악놀이: 이 장면에 어울리는 소리 만들기",
    5: "🤝 신체놀이: 주인공의 감정을 몸으로 표현하기",
    6: "🧩 생각놀이: 다른 방법으로 문제 해결하기",
    7: "📝 글놀이: 주인공에게 한 마디 적어보기",
    8: "🎨 만들기: 이 장면의 소품 만들어보기",
    9: "👥 토의놀이: 친구와 느낌 나누기",
    10: "📖 이야기놀이: 뒷이야기 만들어보기",
  };
  return activities[num] || "🎨 이 장면과 관련된 놀이를 해보세요.";
}

// ─── 메인 HTML 생성 ───

export interface ActivitySheetParams {
  title: string;
  spreads: TeacherSpread[];
  metadata: TeacherStoryMetadata;
  ageGroup?: string;
  kindergartenName?: string;
}

export function generateActivitySheetHtml(params: ActivitySheetParams): string {
  const {
    title,
    spreads,
    metadata,
    ageGroup = "toddler",
    kindergartenName = "",
  } = params;

  const safeTitle = escapeHtml(title || "새 동화");
  const safeKindergarten = escapeHtml(kindergartenName);
  const ageLabel = AGE_LABELS[ageGroup] || "유아반";
  const createdAt = new Date().toLocaleDateString("ko-KR");

  const keySpreads = selectKeySpreads(spreads);
  const illustPromptCards = extractKeyIllustPrompts(metadata.illustPrompts);

  // ─── 누리과정 영역 추출 ───
  const nuriAreas = metadata.nuriMapping
    ? extractNuriAreas(metadata.nuriMapping)
    : "사회관계, 의사소통";

  // ─── 1p: 표지 ───
  const coverPage = `
  <div class="page cover-page">
    <div class="cover-badge">활동지</div>
    <div class="cover-deco"></div>
    <h1 class="cover-title">${safeTitle}</h1>
    <div class="cover-divider"></div>
    <div class="cover-info">
      ${safeKindergarten ? `<p class="cover-kindergarten">${safeKindergarten}</p>` : ""}
      <p class="cover-age">${escapeHtml(ageLabel)}</p>
      <p class="cover-nuri">누리과정 연계: ${escapeHtml(nuriAreas)}</p>
    </div>
    <div class="cover-footer">
      <span>${createdAt}</span>
      <span>mamastale 선생님 모드</span>
    </div>
  </div>`;

  // ─── 2p: 선생님 가이드 ───
  const guidePage = `
  <div class="page guide-page">
    <div class="page-header">
      <span class="page-icon">📋</span>
      <h2>선생님 가이드</h2>
    </div>
    <div class="guide-section">
      <h3>📚 읽어주기 팁</h3>
      <div class="guide-content">${escapeHtml(metadata.readingGuide || "동화를 읽기 전에 표지를 보며 이야기를 상상해보세요. 천천히, 등장인물의 목소리를 바꿔가며 읽어주시면 아이들의 집중도가 높아집니다.")}</div>
    </div>
    ${metadata.devReview ? `
    <div class="guide-section">
      <h3>✅ 발달 적합성</h3>
      <div class="guide-content">${escapeHtml(metadata.devReview)}</div>
    </div>` : ""}
    ${metadata.nuriMapping ? `
    <div class="guide-section">
      <h3>🎯 누리과정 연계</h3>
      <div class="guide-content">${escapeHtml(metadata.nuriMapping)}</div>
    </div>` : ""}
  </div>`;

  // ─── 3-12p: 장면 활동지 10장 ───
  const spreadPages = keySpreads
    .map((spread, idx) => {
      const actLabel = getActLabel(spread.spreadNumber);
      const actColor = getActColor(spread.spreadNumber);
      const actBg = getActBg(spread.spreadNumber);
      const question = getActivityQuestion(idx + 1);
      const play = getPlayActivity(idx + 1);

      return `
  <div class="page spread-page" style="--act-color: ${actColor}; --act-bg: ${actBg}">
    <div class="spread-header">
      <div class="spread-badge" style="background: ${actColor}">${escapeHtml(actLabel)}</div>
      <span class="spread-num">SP${String(spread.spreadNumber).padStart(2, "0")}</span>
    </div>
    <h3 class="spread-title">${escapeHtml(spread.title || `장면 ${spread.spreadNumber}`)}</h3>
    <div class="spread-text">${escapeHtml(spread.text)}</div>
    <div class="spread-illustration-area">
      <div class="illustration-placeholder">
        <span class="illustration-icon">🎨</span>
        <span class="illustration-label">그림을 그려보세요</span>
      </div>
    </div>
    <div class="spread-activity">
      <div class="activity-question">
        <span class="activity-icon">💬</span>
        <p>${escapeHtml(question)}</p>
      </div>
      <div class="activity-play">
        <p>${escapeHtml(play)}</p>
      </div>
    </div>
  </div>`;
    })
    .join("\n");

  // ─── 13p: 편지 쓰기 ───
  const letterPage = `
  <div class="page letter-page">
    <div class="page-header">
      <span class="page-icon">💌</span>
      <h2>주인공에게 편지 쓰기</h2>
    </div>
    <div class="letter-area">
      <div class="letter-to">주인공에게</div>
      <div class="letter-lines">
        ${Array(10).fill('<div class="letter-line"></div>').join("\n        ")}
      </div>
      <div class="letter-from">
        <span>이름:</span>
        <div class="letter-line short"></div>
      </div>
    </div>
  </div>`;

  // ─── 14p: 우리 반 약속 ───
  const promisePage = `
  <div class="page promise-page">
    <div class="page-header">
      <span class="page-icon">🤝</span>
      <h2>우리 반 약속</h2>
    </div>
    <p class="promise-intro">${escapeHtml(safeTitle)}을(를) 읽고 우리 반이 함께 지킬 약속을 만들어봐요!</p>
    <div class="promise-list">
      ${Array(5)
        .fill(null)
        .map(
          (_, i) => `
      <div class="promise-item">
        <span class="promise-num">${i + 1}</span>
        <div class="promise-line"></div>
      </div>`
        )
        .join("\n")}
    </div>
    <div class="promise-sign">
      <p>우리 모두 약속해요! 🌟</p>
      <div class="sign-area">
        <span>날짜:</span>
        <div class="sign-line"></div>
      </div>
    </div>
  </div>`;

  // ─── 15p: 가정 연계 안내문 ───
  const homePage = `
  <div class="page home-page">
    <div class="page-header">
      <span class="page-icon">🏠</span>
      <h2>가정 연계 안내문</h2>
    </div>
    <div class="home-content">
      <p class="home-greeting">학부모님께,</p>
      <p class="home-body">
        오늘 우리 반에서 <strong>${safeTitle}</strong> 동화를 함께 읽고 활동했습니다.
        이 동화는 아이들의 발달 단계에 맞춰 제작된 맞춤 동화입니다.
      </p>
      <div class="home-tips">
        <h3>🏡 가정에서 이렇게 해주세요</h3>
        <ul>
          <li>아이에게 "오늘 어떤 이야기를 들었어?" 하고 물어봐 주세요.</li>
          <li>아이가 이야기를 들려주면, 끝까지 들어주세요.</li>
          <li>동화 속 주인공의 행동에 대해 함께 이야기해 보세요.</li>
          <li>"만약 네가 주인공이라면?" 질문을 던져보세요.</li>
          <li>아이가 그린 그림이 있다면, 잘 보이는 곳에 붙여주세요.</li>
        </ul>
      </div>
      <p class="home-closing">
        아이의 상상력과 감정 표현력 발달에 도움이 되었으면 합니다.
        궁금한 점이 있으시면 언제든 연락주세요.
      </p>
      <p class="home-sign">담임 선생님 드림</p>
    </div>
  </div>`;

  // ─── 16p: 삽화 프롬프트 카드 ───
  const illustPage = `
  <div class="page illust-page">
    <div class="page-header">
      <span class="page-icon">🎨</span>
      <h2>삽화 프롬프트 카드</h2>
    </div>
    <p class="illust-intro">AI 이미지 생성 도구(나노바나나프로 등)에서 사용할 수 있는 프롬프트입니다.</p>
    <div class="illust-cards">
      ${illustPromptCards.length > 0
        ? illustPromptCards
            .map(
              (prompt, idx) => `
      <div class="illust-card">
        <div class="illust-card-header">핵심 장면 ${idx + 1}</div>
        <div class="illust-card-body">${escapeHtml(prompt)}</div>
      </div>`
            )
            .join("\n")
        : `
      <div class="illust-card">
        <div class="illust-card-body">삽화 프롬프트가 생성되지 않았습니다. 동화를 다시 생성해주세요.</div>
      </div>`
      }
    </div>
  </div>`;

  // ─── 전체 HTML ───
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>${safeTitle} — 활동지</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap');
    @page { size: A4 portrait; margin: 15mm 18mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif;
      color: #3C1E1E; background: #fff;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
      font-size: 14px; line-height: 1.6;
    }

    /* ── 공통 ── */
    .page { page-break-after: always; min-height: 100vh; padding: 40px; position: relative; }
    .page:last-child { page-break-after: auto; }
    .page-header { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; padding-bottom: 12px; border-bottom: 2px solid #E07A5F; }
    .page-header h2 { font-size: 1.3rem; font-weight: 700; color: #3C1E1E; }
    .page-icon { font-size: 1.4rem; }

    /* ── 표지 ── */
    .cover-page {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      text-align: center; background: linear-gradient(160deg, #FBF5EC 0%, #FFF4ED 50%, #F3EDF7 100%);
    }
    .cover-badge { display: inline-block; padding: 6px 20px; border-radius: 20px; background: #E07A5F; color: #fff; font-size: 0.85rem; font-weight: 500; margin-bottom: 32px; letter-spacing: 2px; }
    .cover-deco { width: 60px; height: 2px; background: linear-gradient(90deg, #7FBFB0, #E07A5F, #8B6AAF); margin-bottom: 24px; border-radius: 1px; }
    .cover-title { font-size: 2rem; font-weight: 700; color: #3C1E1E; margin-bottom: 20px; line-height: 1.4; word-break: keep-all; }
    .cover-divider { width: 40px; height: 1px; background: #C4956A; margin: 0 auto 24px; }
    .cover-info { margin-bottom: 40px; }
    .cover-info p { font-size: 0.95rem; color: #8B6F55; margin-bottom: 6px; font-weight: 400; }
    .cover-kindergarten { font-weight: 500 !important; font-size: 1.05rem !important; color: #5A3E2B !important; }
    .cover-nuri { font-size: 0.85rem !important; color: #7FBFB0 !important; }
    .cover-footer { display: flex; gap: 20px; font-size: 0.75rem; color: #C4956A; }

    /* ── 가이드 ── */
    .guide-section { margin-bottom: 24px; }
    .guide-section h3 { font-size: 1rem; font-weight: 600; color: #5A3E2B; margin-bottom: 8px; }
    .guide-content { font-size: 0.9rem; color: #44403c; line-height: 1.8; white-space: pre-line; word-break: keep-all; background: #FAFAF8; padding: 16px; border-radius: 12px; border-left: 3px solid #E07A5F; }

    /* ── 장면 활동지 ── */
    .spread-page { padding: 32px; }
    .spread-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
    .spread-badge { display: inline-block; padding: 3px 12px; border-radius: 12px; color: #fff; font-size: 0.75rem; font-weight: 500; }
    .spread-num { font-size: 0.75rem; color: #C4956A; font-weight: 400; }
    .spread-title { font-size: 1.1rem; font-weight: 600; color: #3C1E1E; margin-bottom: 10px; word-break: keep-all; }
    .spread-text { font-size: 0.9rem; color: #44403c; line-height: 1.8; margin-bottom: 16px; white-space: pre-line; word-break: keep-all; background: var(--act-bg, #FAFAF8); padding: 12px 16px; border-radius: 12px; }
    .spread-illustration-area { margin-bottom: 16px; }
    .illustration-placeholder {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      height: 180px; border: 2px dashed #C4956A; border-radius: 16px;
      background: #FDFBF7; color: #C4956A;
    }
    .illustration-icon { font-size: 2rem; margin-bottom: 8px; }
    .illustration-label { font-size: 0.85rem; font-weight: 400; }
    .spread-activity { background: #F8F6F2; border-radius: 12px; padding: 14px 16px; }
    .activity-question { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 8px; }
    .activity-icon { font-size: 1.1rem; flex-shrink: 0; margin-top: 2px; }
    .activity-question p { font-size: 0.9rem; color: #5A3E2B; font-weight: 500; }
    .activity-play p { font-size: 0.85rem; color: #8B6F55; }

    /* ── 편지 ── */
    .letter-area { padding: 24px; background: #FDFBF7; border-radius: 16px; border: 1px solid #E8E0D4; }
    .letter-to { font-size: 1rem; font-weight: 500; color: #5A3E2B; margin-bottom: 20px; }
    .letter-lines { display: flex; flex-direction: column; gap: 28px; margin-bottom: 24px; }
    .letter-line { height: 1px; background: #D4C8B8; }
    .letter-line.short { width: 160px; display: inline-block; }
    .letter-from { display: flex; align-items: center; gap: 12px; font-size: 0.9rem; color: #8B6F55; }

    /* ── 약속 ── */
    .promise-intro { font-size: 0.95rem; color: #5A3E2B; margin-bottom: 24px; word-break: keep-all; line-height: 1.6; }
    .promise-list { display: flex; flex-direction: column; gap: 20px; margin-bottom: 32px; }
    .promise-item { display: flex; align-items: center; gap: 12px; }
    .promise-num { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; background: #E07A5F; color: #fff; font-size: 0.85rem; font-weight: 700; flex-shrink: 0; }
    .promise-line { flex: 1; height: 1px; background: #D4C8B8; }
    .promise-sign { text-align: center; }
    .promise-sign p { font-size: 1.1rem; font-weight: 600; color: #5A3E2B; margin-bottom: 16px; }
    .sign-area { display: flex; align-items: center; justify-content: center; gap: 12px; font-size: 0.9rem; color: #8B6F55; }
    .sign-line { width: 200px; height: 1px; background: #D4C8B8; }

    /* ── 가정 연계 ── */
    .home-content { background: #FDFBF7; border-radius: 16px; padding: 28px; border: 1px solid #E8E0D4; }
    .home-greeting { font-size: 1rem; font-weight: 500; color: #5A3E2B; margin-bottom: 16px; }
    .home-body { font-size: 0.9rem; color: #44403c; line-height: 1.8; margin-bottom: 20px; word-break: keep-all; }
    .home-tips { margin-bottom: 20px; }
    .home-tips h3 { font-size: 0.95rem; font-weight: 600; color: #5A3E2B; margin-bottom: 10px; }
    .home-tips ul { padding-left: 20px; }
    .home-tips li { font-size: 0.88rem; color: #44403c; line-height: 1.8; margin-bottom: 4px; word-break: keep-all; }
    .home-closing { font-size: 0.9rem; color: #44403c; line-height: 1.8; margin-bottom: 16px; word-break: keep-all; }
    .home-sign { text-align: right; font-size: 0.9rem; color: #8B6F55; font-weight: 500; }

    /* ── 삽화 프롬프트 ── */
    .illust-intro { font-size: 0.9rem; color: #8B6F55; margin-bottom: 20px; }
    .illust-cards { display: flex; flex-direction: column; gap: 16px; }
    .illust-card { background: #F8F6F2; border-radius: 12px; overflow: hidden; }
    .illust-card-header { background: #5A3E2B; color: #fff; padding: 8px 16px; font-size: 0.85rem; font-weight: 500; }
    .illust-card-body { padding: 14px 16px; font-size: 0.85rem; color: #44403c; line-height: 1.7; white-space: pre-line; word-break: keep-all; }

    @media print {
      .page { min-height: auto; padding: 0; }
      .cover-page { padding: 60px 40px; }
    }
  </style>
</head>
<body>
  ${coverPage}
  ${guidePage}
  ${spreadPages}
  ${letterPage}
  ${promisePage}
  ${homePage}
  ${illustPage}
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;
}

/** 누리과정 매핑 텍스트에서 영역명 추출 */
function extractNuriAreas(nuriMapping: string): string {
  const areas = ["신체운동·건강", "의사소통", "사회관계", "예술경험", "자연탐구"];
  const found = areas.filter((area) =>
    nuriMapping.includes(area) || nuriMapping.includes(area.replace("·", ""))
  );
  return found.length > 0 ? found.join(", ") : "사회관계, 의사소통";
}
