import type { Metadata } from "next";
import Link from "next/link";
import { PHASES } from "@/lib/constants/phases";

export const metadata: Metadata = {
  title: "서비스 소개 | mamastale",
  description: "mamastale은 엄마의 이야기를 AI 대화로 10장면 동화로 만드는 치유적 서비스입니다.",
};

/* ──────────────────────────────────────────────────────────
   4-Phase AI Engine — detailed content for the about page
   ────────────────────────────────────────────────────────── */
const PHASE_DETAILS = [
  {
    id: 1 as const,
    character: "하은이",
    role: "감정 표현 안내자",
    tagline: "있는 그대로 들어줘요",
    summary:
      "마마스테일의 여정은 하은이와의 따뜻한 대화로 시작됩니다. 하은이는 어머니의 이야기를 판단 없이, 조건 없이 들어줍니다. 조언도, 해결책도 제시하지 않아요. 오직 공감하고 반영할 뿐입니다.",
    dialogue:
      "\"그 순간 정말 힘드셨겠어요.\" \"그 감정이 언제부터 시작되었는지 기억나세요?\" — 하은이는 이런 말들로 엄마가 오래 참아왔던 마음을 자연스럽게 꺼낼 수 있도록 도와줍니다.",
    theory:
      "펜네베이커(Pennebaker) 교수의 40년 연구에 따르면, 감정을 말로 표현하는 순간 그 감정은 '외면화'되어 더 이상 몸 안에서 스트레스를 만들지 않게 됩니다. 리버만(Lieberman) 교수의 연구에서는 감정에 이름을 붙이는 것만으로도 편도체의 과활성화가 즉각 억제된다는 것이 확인되었습니다.",
    feeling:
      "마음속에 쌓아두었던 이야기를 꺼내면, 어깨가 조금 가벼워지는 걸 느끼실 거예요.",
    keywords: ["무조건적 수용", "공감과 반영", "감정의 언어화"],
  },
  {
    id: 2 as const,
    character: "민서",
    role: "소크라틱 질문자",
    tagline: "새로운 시선으로 바라봐요",
    summary:
      "민서는 엄마가 미처 발견하지 못한 새로운 시선을 함께 찾아줍니다. 직접적으로 \"당신은 훌륭한 엄마예요\"라고 말하지 않아요. 대신, 질문을 통해 엄마가 스스로 자신의 강점을 발견하도록 이끕니다.",
    dialogue:
      "\"친한 친구가 똑같은 상황이라면, 어떤 따뜻한 말을 건네시겠어요?\" \"지난 24시간 동안, 단 1분이라도 아이에게 인내심을 보여준 순간이 있었나요?\" — 이런 질문들이 굳어진 생각에 작은 균열을 만들어 줍니다.",
    theory:
      "인지행동치료(CBT)의 소크라틱 질문법에 기반합니다. 우울한 마음은 긍정적인 증거를 무시하고 부정적인 것만 확대하는 경향이 있어요. 민서의 질문은 간과했던 강점을 수면 위로 끌어올리고, 엄마가 고통 속에서도 지켜온 핵심 가치를 발견하게 합니다.",
    feeling:
      "내가 지켜온 것, 포기하지 않았던 것의 의미를 새롭게 발견하게 됩니다. 이것이 바로 동화의 씨앗이 됩니다.",
    keywords: ["증거 확인", "관점 전환", "스토리 씨앗 발견"],
  },
  {
    id: 3 as const,
    character: "지우",
    role: "은유의 마법사",
    tagline: "이야기로 바꿔줘요",
    summary:
      "지우는 엄마의 고통스러운 감정을 동화 캐릭터로 변환합니다. 산후우울은 '마을의 색을 지우는 안개 괴물'로, 양육 번아웃은 '불을 조절하지 못하는 아기 용'으로. 문제가 나와 분리된 별개의 존재가 되는 순간, 비로소 그것을 바라보고 이해하고 대면할 수 있게 됩니다.",
    dialogue:
      "\"그 무거운 마음을 동화 속 캐릭터로 만들어 볼까요?\" \"엄마가 발견한 그 사랑의 힘을, 이 캐릭터를 물리칠 마법 무기로 만들면 어떨까요?\" — 지우는 엄마와 함께 문제를 의인화하고, 엄마의 핵심 가치를 마법의 무기로 변환합니다.",
    theory:
      "마이클 화이트(Michael White)의 내러티브 테라피 핵심 원칙에 기반합니다. \"사람이 문제가 아니라, 문제가 문제다.\" 문제의 외면화(externalization)는 심리적 거리를 만들어 엄마를 피해자에서 영웅으로 변환시킵니다.",
    feeling:
      "나는 '망가진 엄마'가 아니라, '사랑의 횃불로 안개 괴물에 맞서는 용감한 영웅'이 됩니다.",
    keywords: ["문제의 외면화", "은유적 변환", "영웅으로의 전환"],
  },
  {
    id: 4 as const,
    character: "서연",
    role: "동화 편집장",
    tagline: "동화로 완성해요",
    summary:
      "서연이 모든 과정을 엮어 10장면의 마음 동화 스토리를 완성합니다. 엄마의 경험, 감정, 은유, 핵심 가치 — 모든 것이 도입, 갈등, 시도, 해결, 교훈의 구조로 짜여진 완성된 이야기가 됩니다.",
    dialogue:
      "서연은 조셉 캠벨의 영웅의 여정 구조와 루이즈 드살보의 치유적 서사 5대 원칙을 따릅니다. 감각적이고 구체적인 묘사, 사건과 감정의 인과 관계, 긍정과 부정의 균형, 핵심 가치의 지혜로의 전환, 그리고 파편화된 기억을 하나의 완결된 이야기로 통합합니다.",
    theory:
      "트라우마 기억은 시간 순서 없이 파편화된 감각 인상으로 저장됩니다. 서사적 구조화(Narrative Structuring)는 이 파편들에 시간 인과 관계와 의미를 부여하여, 뇌가 고통스러운 기억을 '안전하게 종결된 과거'로 재분류하게 합니다. 이 과정을 기억 재고형화(Memory Reconsolidation)라고 합니다.",
    feeling:
      "엄마의 상처가 아이를 위한 심리적 백신이 되는 순간을 경험합니다. 완성된 동화를 아이에게 읽어줄 때, 치유는 비로소 완성됩니다.",
    keywords: ["10장면 서사 구조", "치유적 글쓰기", "기억 재고형화"],
  },
];

/* ──────────────────────────────────────────────────────────
   10-Scene Story Structure
   ────────────────────────────────────────────────────────── */
const STORY_STRUCTURE = [
  { act: "기", scenes: "1-2", title: "평화로운 세계와 유대", description: "엄마 캐릭터와 아이 캐릭터가 따뜻한 숲 속 세계에서 소개됩니다. 안전하고 평화로운 일상, 그리고 곧 다가올 변화의 조짐." },
  { act: "승", scenes: "3-4", title: "갈등의 시작과 심화", description: "외면화된 '괴물'이 평화로운 숲을 덮칩니다. 주인공은 맞서보지만 실패하고, 어둠은 깊어집니다." },
  { act: "전", scenes: "5-6", title: "저항과 작은 반란", description: "무력감 속에서도 주인공은 내면의 목소리를 듣습니다. 작은 반란이 시작되고, 희미한 빛이 보이기 시작합니다." },
  { act: "전", scenes: "7-8", title: "스토리 씨앗의 각성과 승리", description: "결정적 순간, 주인공은 깊은 내면에서 빛나는 '스토리 씨앗'(마법의 방패, 빛, 노래)을 꺼내어 괴물을 물리치거나 달래줍니다." },
  { act: "결", scenes: "9-10", title: "지혜와 순환적 귀환", description: "주인공이 아이에게 흔들리지 않는 삶의 지혜와 무조건적 사랑을 전합니다. 처음 장면의 이미지가 변화된 모습으로 돌아옵니다." },
];

/* ──────────────────────────────────────────────────────────
   Research References
   ────────────────────────────────────────────────────────── */
const REFERENCES = [
  { name: "제임스 펜네베이커 (James Pennebaker)", field: "표현적 글쓰기 · 능동적 억제 가설", contribution: "감정을 언어로 표현하면 자율신경계의 만성 스트레스가 해소됩니다." },
  { name: "매튜 리버만 (Matthew Lieberman)", field: "정동 라벨링 (Affect Labeling)", contribution: "감정에 이름을 붙이면 편도체 활성이 억제되고 전두엽이 활성화됩니다." },
  { name: "아론 벡 · 앨버트 엘리스", field: "인지행동치료 (CBT)", contribution: "소크라틱 질문을 통해 왜곡된 인지를 교정하고 자기 자비를 활성화합니다." },
  { name: "마이클 화이트 (Michael White)", field: "내러티브 테라피", contribution: "문제의 외면화를 통해 사람과 문제를 분리하고, 대안적 서사를 구축합니다." },
  { name: "루이즈 드살보 (Louise DeSalvo)", field: "치유적 서사 연구", contribution: "카타르시스만으로는 치유되지 않으며, 새로운 의미 부여가 핵심입니다." },
  { name: "조셉 캠벨 (Joseph Campbell)", field: "영웅의 여정 (Hero\u2019s Journey)", contribution: "보편적 서사 구조로 개인의 경험을 의미 있는 여정으로 재구성합니다." },
];

export default function AboutPage() {
  return (
    <div className="px-6 pt-10 pb-4">
      {/* ════════════════════════════════════════
          HERO
          ════════════════════════════════════════ */}
      <section className="text-center mb-10">
        <h1 className="font-serif text-[28px] font-bold text-brown tracking-tight leading-tight mb-3">
          마마스테일이란
        </h1>
        <p className="text-[13px] text-brown-light font-light leading-relaxed break-keep">
          엄마의 이야기가 아이의 동화가 되는 여정을
          <br />
          소개합니다.
        </p>
      </section>

      {/* ════════════════════════════════════════
          SERVICE OVERVIEW
          ════════════════════════════════════════ */}
      <section className="mb-10">
        <div
          className="rounded-2xl p-5 border bg-white/60 border-[rgba(196,149,106,0.12)] backdrop-blur-sm"
        >
          <h2 className="font-serif text-lg font-bold text-brown mb-3 leading-snug">
            엄마의 경험이 아이에게 읽어줄
            <br />
            세상에 하나뿐인 동화가 됩니다
          </h2>
          <div className="space-y-3 text-[13px] text-brown-light font-light leading-7 break-keep">
            <p>
              마마스테일(mamastale)은 엄마의 삶 속 이야기를 AI와의 따뜻한 대화를 통해 아이에게 읽어줄 수 있는 10장면 동화 스토리로 변환하는 서비스입니다.
            </p>
            <p>
              육아의 기쁨과 고됨, 삶의 변화 속에서 느끼는 복잡한 감정들 — 이 모든 것이 아이의 눈높이에 맞춘 아름다운 동화로 다시 태어납니다. 단순한 이야기 생성이 아닌, 심리학적 근거에 기반한 4단계 치유적 대화 과정을 거칩니다.
            </p>
            <p>
              약 15-20분의 대화면 충분합니다. 대화가 끝나면 10장면의 완성된 동화 스토리가 만들어지며, 내 서재에 영구 보관됩니다.
            </p>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          PROCESS OVERVIEW — Visual flow
          ════════════════════════════════════════ */}
      <section className="mb-12">
        <h2 className="font-serif text-base font-bold text-brown text-center mb-5">
          어떻게 만들어지나요?
        </h2>
        <div className="flex items-center justify-between gap-1 px-1 mb-4">
          {[
            { step: "AI 대화", sub: "15-20분", color: "#7FBFB0" },
            { step: "이야기 구성", sub: "자동 생성", color: "#E07A5F" },
            { step: "스토리 완성", sub: "10장면", color: "#8B6AAF" },
            { step: "서재 보관", sub: "PDF 저장", color: "#C4956A" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className="flex flex-col items-center gap-1">
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ background: item.color }}
                >
                  {i + 1}
                </span>
                <span className="text-[9px] text-brown font-medium whitespace-nowrap">{item.step}</span>
                <span className="text-[8px] text-brown-pale font-light whitespace-nowrap">{item.sub}</span>
              </div>
              {i < 3 && (
                <span className="text-[10px] text-brown-light/60 -mt-5 mx-0.5" aria-hidden="true">→</span>
              )}
            </div>
          ))}
        </div>
        <p className="text-[11px] text-brown-pale font-light text-center">
          대화부터 동화 완성까지, 모든 과정이 하나의 흐름으로 연결됩니다.
        </p>
      </section>

      {/* ════════════════════════════════════════
          4-PHASE AI ENGINE — Detailed explanation
          ════════════════════════════════════════ */}
      <section className="mb-12">
        <div className="text-center mb-6">
          <h2 className="font-serif text-lg font-bold text-brown mb-1.5">
            4단계 AI 대화 엔진
          </h2>
          <p className="text-[12px] text-brown-pale font-light break-keep leading-relaxed">
            각 단계는 독립적인 치유 원리에 기반하여 설계되었습니다.
            <br />
            AI 상담사 네 명이 순서대로 엄마와 대화합니다.
          </p>
        </div>

        <div className="space-y-5">
          {PHASE_DETAILS.map((detail) => {
            const phase = PHASES[detail.id];
            return (
              <article
                key={detail.id}
                className="rounded-2xl overflow-hidden"
                style={{
                  border: `1.5px solid ${phase.accent}25`,
                  background: phase.bg,
                }}
              >
                {/* Phase header */}
                <div
                  className="px-5 py-4 flex items-center gap-3"
                  style={{ borderBottom: `1px solid ${phase.accent}18` }}
                >
                  <span
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                    style={{ background: phase.accent }}
                  >
                    {detail.id}
                  </span>
                  <div>
                    <p className="text-sm font-bold" style={{ color: phase.text }}>
                      {detail.character} · {detail.role}
                    </p>
                    <p className="text-[11px] font-light" style={{ color: phase.text, opacity: 0.7 }}>
                      {detail.tagline}
                    </p>
                  </div>
                </div>

                {/* Phase content */}
                <div className="px-5 py-4 space-y-4">
                  {/* Summary */}
                  <div>
                    <p
                      className="text-[12.5px] leading-7 break-keep font-light"
                      style={{ color: phase.text }}
                    >
                      {detail.summary}
                    </p>
                  </div>

                  {/* Dialogue example */}
                  <div
                    className="rounded-xl px-4 py-3"
                    style={{ background: `${phase.accent}0D` }}
                  >
                    <p className="text-[10px] font-medium mb-1.5" style={{ color: phase.accent }}>
                      {detail.id < 4 ? "어떤 대화가 이루어지나요?" : "어떻게 구성되나요?"}
                    </p>
                    <p
                      className="text-[11.5px] leading-6 break-keep font-light italic"
                      style={{ color: phase.text }}
                    >
                      {detail.dialogue}
                    </p>
                  </div>

                  {/* Theory */}
                  <div>
                    <p className="text-[10px] font-medium mb-1.5" style={{ color: phase.accent }}>
                      왜 효과적인가요?
                    </p>
                    <p
                      className="text-[11.5px] leading-6 break-keep font-light"
                      style={{ color: phase.text, opacity: 0.85 }}
                    >
                      {detail.theory}
                    </p>
                  </div>

                  {/* Feeling */}
                  <div
                    className="rounded-xl px-4 py-3 text-center"
                    style={{
                      background: `${phase.accent}12`,
                      border: `1px solid ${phase.accent}18`,
                    }}
                  >
                    <p
                      className="text-[12px] leading-6 break-keep font-medium"
                      style={{ color: phase.text }}
                    >
                      {detail.feeling}
                    </p>
                  </div>

                  {/* Keywords */}
                  <div className="flex flex-wrap gap-1.5">
                    {detail.keywords.map((kw) => (
                      <span
                        key={kw}
                        className="text-[9px] px-2.5 py-1 rounded-full font-medium"
                        style={{
                          background: `${phase.accent}15`,
                          color: phase.accent,
                        }}
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* ════════════════════════════════════════
          STORY STRUCTURE — 10-scene overview
          ════════════════════════════════════════ */}
      <section className="mb-12">
        <div className="text-center mb-5">
          <h2 className="font-serif text-base font-bold text-brown mb-1.5">
            10장면 동화의 구조
          </h2>
          <p className="text-[11px] text-brown-pale font-light break-keep">
            영웅의 여정 구조를 기반으로 한 치유적 서사
          </p>
        </div>

        <div className="space-y-2.5">
          {STORY_STRUCTURE.map((item, i) => (
            <div
              key={i}
              className="rounded-xl px-4 py-3 flex gap-3"
              style={{
                background: "rgba(255,255,255,0.55)",
                border: "1px solid rgba(196,149,106,0.1)",
              }}
            >
              <div className="flex-shrink-0 pt-0.5">
                <span
                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-[10px] font-bold text-brown"
                  style={{ background: "rgba(196,149,106,0.1)" }}
                >
                  {item.act}
                </span>
              </div>
              <div>
                <p className="text-[11px] text-brown-pale font-light mb-0.5">
                  장면 {item.scenes}
                </p>
                <p className="text-[12.5px] text-brown font-medium mb-1">
                  {item.title}
                </p>
                <p className="text-[11px] text-brown-light font-light leading-5 break-keep">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════
          THEORETICAL FOUNDATIONS
          ════════════════════════════════════════ */}
      <section className="mb-12">
        <div className="text-center mb-5">
          <h2 className="font-serif text-base font-bold text-brown mb-1.5">
            과학적 기반
          </h2>
          <p className="text-[11px] text-brown-pale font-light break-keep">
            마마스테일의 4단계 엔진은 다음 연구자들의 이론에 기반합니다
          </p>
        </div>

        <div className="space-y-2">
          {REFERENCES.map((ref, i) => (
            <div
              key={i}
              className="rounded-xl px-4 py-3"
              style={{
                background: "rgba(255,255,255,0.5)",
                border: "1px solid rgba(196,149,106,0.08)",
              }}
            >
              <p className="text-[12px] text-brown font-medium mb-0.5">
                {ref.name}
              </p>
              <p className="text-[10px] text-brown-pale font-light mb-1">
                {ref.field}
              </p>
              <p className="text-[11px] text-brown-light font-light leading-5 break-keep">
                {ref.contribution}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════
          SAFETY & TRUST
          ════════════════════════════════════════ */}
      <section className="mb-12">
        <div className="text-center mb-5">
          <h2 className="font-serif text-base font-bold text-brown mb-1.5">
            안전과 신뢰
          </h2>
        </div>

        <div
          className="rounded-2xl p-5 space-y-4"
          style={{
            background: "rgba(255,255,255,0.55)",
            border: "1px solid rgba(196,149,106,0.1)",
          }}
        >
          <div>
            <p className="text-[12px] text-brown font-medium mb-1">
              위기 감지 시스템
            </p>
            <p className="text-[11.5px] text-brown-light font-light leading-6 break-keep">
              모든 대화는 실시간으로 위기 수준을 모니터링합니다. 심각한 위기 징후가 감지되면 즉시 전문 상담 연결 정보를 안내합니다.
            </p>
          </div>

          <div
            className="rounded-xl px-4 py-3"
            style={{ background: "rgba(127,191,176,0.08)" }}
          >
            <p className="text-[11px] text-brown font-medium mb-2">
              긴급 연락처
            </p>
            <div className="space-y-1 text-[11px] text-brown-light font-light">
              <p>자살예방상담전화: <span className="font-medium text-brown">1393</span> (24시간)</p>
              <p>정신건강위기상담전화: <span className="font-medium text-brown">1577-0199</span> (24시간)</p>
              <p>응급: <span className="font-medium text-brown">119</span></p>
            </div>
          </div>

          <div>
            <p className="text-[12px] text-brown font-medium mb-1">
              데이터 보호
            </p>
            <p className="text-[11.5px] text-brown-light font-light leading-6 break-keep">
              대화 내용은 암호화되어 안전하게 보관됩니다. 개인 정보는 서비스 제공 목적으로만 사용되며, 제3자에게 공유되지 않습니다.
            </p>
          </div>

          <div>
            <p className="text-[12px] text-brown font-medium mb-1">
              의료 행위 대체 불가
            </p>
            <p className="text-[11.5px] text-brown-light font-light leading-6 break-keep">
              마마스테일은 심리적 지지와 자기 탐색을 돕는 도구입니다. 전문적인 의료 상담이나 치료를 대체하지 않으며, 심각한 정신건강 문제가 있을 경우 반드시 전문가의 도움을 받으시기 바랍니다.
            </p>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          FUTURE VISION
          ════════════════════════════════════════ */}
      <section className="mb-12">
        <div className="text-center mb-5">
          <h2 className="font-serif text-base font-bold text-brown mb-1.5">
            앞으로의 방향
          </h2>
          <p className="text-[11px] text-brown-pale font-light break-keep leading-relaxed">
            현재는 10장면 동화 스토리(텍스트) 완성 서비스를 제공하고 있으며,
            <br />
            앞으로 다음 기능들을 준비하고 있습니다.
          </p>
        </div>

        <div className="space-y-2.5">
          <div
            className="rounded-xl px-4 py-3 flex items-center gap-3"
            style={{
              background: "rgba(139,106,175,0.06)",
              border: "1px solid rgba(139,106,175,0.12)",
            }}
          >
            <span
              className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
              style={{ background: "#8B6AAF" }}
            >
              1
            </span>
            <div>
              <p className="text-[12.5px] text-brown font-medium">
                AI 일러스트 생성
                <span className="text-[9px] text-brown-pale font-light ml-2">준비 중</span>
              </p>
              <p className="text-[11px] text-brown-light font-light leading-5 break-keep">
                각 장면에 어울리는 수채화 스타일 일러스트를 AI가 자동으로 그려줍니다.
              </p>
            </div>
          </div>
          <div
            className="rounded-xl px-4 py-3 flex items-center gap-3"
            style={{
              background: "rgba(224,122,95,0.06)",
              border: "1px solid rgba(224,122,95,0.12)",
            }}
          >
            <span
              className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
              style={{ background: "#E07A5F" }}
            >
              2
            </span>
            <div>
              <p className="text-[12.5px] text-brown font-medium">
                영상 동화 제작
                <span className="text-[9px] text-brown-pale font-light ml-2">준비 중</span>
              </p>
              <p className="text-[11px] text-brown-light font-light leading-5 break-keep">
                완성된 동화를 나레이션과 함께 영상으로 만들어 아이에게 들려줄 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          CTA
          ════════════════════════════════════════ */}
      <section className="text-center mb-8">
        <div
          className="rounded-2xl p-6"
          style={{
            background: "linear-gradient(180deg, rgba(224,122,95,0.06) 0%, rgba(255,255,255,0.4) 100%)",
            border: "1px solid rgba(224,122,95,0.12)",
          }}
        >
          <p className="font-serif text-[15px] text-brown font-bold mb-2 leading-snug">
            지금 나만의 동화를
            <br />
            만들어 보세요
          </p>
          <p className="text-[11px] text-brown-pale font-light mb-4 break-keep">
            15-20분의 대화로 세상에 하나뿐인 동화가 완성됩니다
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center w-full py-3.5 rounded-full text-white text-sm font-medium no-underline transition-transform active:scale-[0.97]"
            style={{
              background: "linear-gradient(135deg, #E07A5F, #C96B52)",
              boxShadow: "0 6px 20px rgba(224,122,95,0.25)",
            }}
          >
            지금 동화 만들기
          </Link>
          <div className="flex items-center justify-center gap-3 mt-3">
            <Link
              href="/pricing"
              className="text-[11px] text-brown-pale font-light no-underline hover:text-coral transition-colors min-h-[44px] inline-flex items-center"
            >
              요금 안내 →
            </Link>
            <Link
              href="/reviews"
              className="text-[11px] text-brown-pale font-light no-underline hover:text-coral transition-colors min-h-[44px] inline-flex items-center"
            >
              이용 후기 →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
