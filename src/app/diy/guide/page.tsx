import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "DIY 동화 사용 안내 | mamastale",
  description:
    "엄마와 아이가 함께 그림을 고르고, 순서를 정하고, 이야기를 써보세요. 무료 DIY 동화 만들기 안내.",
};

const STEPS = [
  {
    step: 1,
    title: "그림 고르기",
    description:
      "동화 하나를 선택하면 10장 이상의 일러스트가 준비되어 있어요. 아이와 함께 어떤 그림을 넣을지, 어떤 순서로 놓을지 이야기해보세요.",
  },
  {
    step: 2,
    title: "이야기 쓰기",
    description:
      "각 그림을 보며 아이에게 물어보세요. \"이 그림에서 무슨 일이 일어나고 있을까?\" 아이의 상상력을 엄마가 글로 담아주세요.",
  },
  {
    step: 3,
    title: "완성 & 저장",
    description:
      "세상에 하나뿐인 우리 가족의 동화가 완성됩니다. 서재에 저장하고, 커뮤니티에 공유할 수도 있어요.",
  },
];

const MOMENTS = [
  "주말 오후, 아이와 함께하는 특별한 시간",
  "잠자리에서 \"오늘은 우리가 동화를 만들어볼까?\"",
  "긴 이동 시간, 아이와 함께하는 창작 놀이",
];

export default function DIYGuidePage() {
  return (
    <div className="px-6 pt-10 pb-4">
      {/* ════════════════════════════════════════
          HERO
          ════════════════════════════════════════ */}
      <section className="text-center mb-10">
        <h1 className="font-serif text-[28px] font-bold text-brown tracking-tight leading-tight mb-3">
          엄마와 아이가
          <br />
          함께 만드는 동화
        </h1>
        <p className="text-[13px] text-brown-light font-light leading-relaxed break-keep">
          그림을 고르고, 순서를 정하고, 이야기를 써보세요
        </p>
      </section>

      {/* ════════════════════════════════════════
          PURPOSE — 취지 카드
          ════════════════════════════════════════ */}
      <section className="mb-10">
        <div className="rounded-2xl p-5 border bg-white/60 border-[rgba(127,191,176,0.15)] backdrop-blur-sm">
          <div className="space-y-3 text-[13px] text-brown-light font-light leading-7 break-keep">
            <p>
              마마스테일 DIY 동화는 엄마와 아이가{" "}
              <span className="font-medium text-brown">함께</span> 만들어가는
              동화입니다.
            </p>
            <p>
              한 페이지 한 페이지, 어떤 그림을 넣을지 함께 고르고, 어떤 순서로
              이야기가 흘러갈지 함께 고민하며, 서로의 생각을 나눠보세요.
            </p>
            <p>
              아이의 상상력을 이끌어주고, 엄마는 들어주고 공감하고. 서로
              아이디어를 나누고, 배려하고, 양보하며 하나의 동화를 완성해가는
              과정 자체가 우리 가족만의 특별한 시간이 됩니다.
            </p>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          HOW TO — 3단계 사용 안내
          ════════════════════════════════════════ */}
      <section className="mb-12">
        <h2 className="font-serif text-base font-bold text-brown text-center mb-5">
          이렇게 만들어요
        </h2>

        <div className="space-y-3">
          {STEPS.map((item) => (
            <div
              key={item.step}
              className="rounded-xl px-4 py-4 flex gap-3"
              style={{
                background: "rgba(127,191,176,0.06)",
                border: "1px solid rgba(127,191,176,0.12)",
              }}
            >
              <span
                className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 mt-0.5"
                style={{ background: "#7FBFB0" }}
              >
                {item.step}
              </span>
              <div>
                <p className="text-[13px] text-brown font-medium mb-1">
                  {item.title}
                </p>
                <p className="text-[12px] text-brown-light font-light leading-6 break-keep">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════
          MOMENTS — 이런 순간에 함께하세요
          ════════════════════════════════════════ */}
      <section className="mb-12">
        <h2 className="font-serif text-base font-bold text-brown text-center mb-4">
          이런 순간에 함께하세요
        </h2>
        <div className="space-y-2">
          {MOMENTS.map((moment, i) => (
            <div
              key={i}
              className="rounded-xl px-4 py-3 text-[12.5px] text-brown-light font-light leading-6 break-keep"
              style={{
                background: "rgba(255,255,255,0.55)",
                border: "1px solid rgba(196,149,106,0.1)",
              }}
            >
              {moment}
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════
          CTA
          ════════════════════════════════════════ */}
      <section className="text-center mb-8">
        <div
          className="rounded-2xl p-6"
          style={{
            background:
              "linear-gradient(180deg, rgba(127,191,176,0.08) 0%, rgba(255,255,255,0.4) 100%)",
            border: "1px solid rgba(127,191,176,0.15)",
          }}
        >
          <p className="font-serif text-[15px] text-brown font-bold mb-2 leading-snug">
            아이와 함께
            <br />
            동화를 만들어 보세요
          </p>
          <p className="text-[11px] text-brown-pale font-light mb-4 break-keep">
            무료로 이용할 수 있어요
          </p>
          <Link
            href="/diy"
            className="inline-flex items-center justify-center w-full py-3.5 rounded-full text-white text-sm font-medium no-underline transition-transform active:scale-[0.97]"
            style={{
              background: "linear-gradient(135deg, #7FBFB0, #5A9E94)",
              boxShadow: "0 6px 20px rgba(127,191,176,0.25)",
            }}
          >
            동화 고르러 가기 →
          </Link>
          <Link
            href="/?action=start"
            className="inline-flex items-center justify-center mt-3 text-[11px] text-brown-pale font-light no-underline hover:text-coral transition-colors min-h-[44px]"
          >
            AI가 만드는 맞춤 동화도 있어요 →
          </Link>
        </div>
      </section>
    </div>
  );
}
