import React from "react";
import Link from "next/link";
import { ReviewSection } from "@/components/reviews/ReviewSection";

const reviews = [
  {
    alias: "윤서맘",
    age: "41세",
    childAge: "딸 7세",
    stars: 5,
    date: "2026.02.18",
    topic: "양육번아웃",
    text: "사업하느라 아이에게 늘 미안한 마음이었는데, 대화를 통해 그 죄책감이 자연스럽게 풀렸어요. 완성된 동화에 제 이야기가 아이 눈높이의 모험담으로 바뀌어 있더라고요. 딸이 \"엄마 이 동화 주인공이 엄마 같아!\"라며 안겨올 때 정말 울컥했습니다.",
  },
  {
    alias: "서아맘",
    age: "38세",
    childAge: "아들 5세, 딸 3세",
    stars: 5,
    date: "2026.02.15",
    topic: "자존감",
    text: "아동심리를 공부했지만 정작 제 감정은 돌보지 못했어요. AI라서 오히려 솔직해질 수 있었고, 4단계 대화 구조가 심리학적으로도 잘 설계되어 놀랐습니다. 아이에게 읽어주니 \"엄마도 슬플 때 있어?\"라고 묻더라고요. 그 한마디에 눈물이 났어요.",
  },
  {
    alias: "예진맘",
    age: "44세",
    childAge: "딸 8세",
    stars: 5,
    date: "2026.02.12",
    topic: "경력단절",
    text: "디자이너로 일하다 육아 후 붓을 놓은 지 오래됐는데, 이 서비스의 대화가 잊고 있던 감정을 끌어내더라고요. 동화 텍스트의 문학적 품질이 기대 이상이에요. 딸과 함께 동화를 읽으며 \"엄마도 꿈이 있었어\"라고 말해줄 수 있어서 감사해요.",
  },
  {
    alias: "현정맘",
    age: "35세",
    childAge: "아들 4세",
    stars: 5,
    date: "2026.02.08",
    topic: "양육번아웃",
    text: "처음엔 AI와 깊은 대화가 가능할까 반신반의했는데, 첫 질문부터 마음이 열렸어요. 15분 만에 울고 웃으며 동화까지 완성했습니다. 남편에게 보여줬더니 \"이 이야기가 네 거야?\"라며 놀라더라고요. 가족 모두에게 선물 같은 경험이었어요.",
  },
  {
    alias: "준우맘",
    age: "32세",
    childAge: "아들 3세",
    stars: 5,
    date: "2026.01.29",
    topic: "산후우울",
    text: "산후우울증으로 힘든 시간을 보내고 있었는데, 대화를 나누며 울컥했어요. 완성된 동화를 아이에게 읽어줬더니 \"엄마가 만든 거야?\"라며 좋아하는 모습에 저도 모르게 웃음이 났습니다. 제 아픔이 아이를 위한 선물이 될 수 있다는 게 신기했어요.",
  },
  {
    alias: "서연이네",
    age: "34세",
    childAge: "딸 5세, 아들 2세",
    stars: 5,
    date: "2026.01.22",
    topic: "양육번아웃",
    text: "두 아이를 키우면서 번아웃이 왔었어요. 대화하면서 \"지금 충분히 잘하고 있다\"는 말에 눈물이 났습니다. 동화 속 주인공이 저와 너무 닮아있어서 놀랐고, 큰아이가 매일 밤 이 동화를 읽어달라고 해요.",
  },
  {
    alias: "하준맘",
    age: "31세",
    childAge: "아들 4세",
    stars: 4,
    date: "2026.01.15",
    topic: "시댁갈등",
    text: "시댁과의 관계에서 받은 상처를 꺼내기 어려웠는데, 동화라는 형식 덕분에 자연스럽게 이야기할 수 있었어요. 완성된 동화가 제 마음을 정리하는 데 도움이 됐습니다. 아이에게도 좋은 이야기가 되었고요.",
  },
  {
    alias: "지우맘",
    age: "36세",
    childAge: "딸 6세",
    stars: 5,
    date: "2026.01.08",
    topic: "경력단절",
    text: "경력단절 후 자존감이 바닥이었는데, 대화를 통해 제 경험이 얼마나 소중한지 다시 느꼈어요. 아이가 동화 속 주인공을 보며 \"엄마처럼 용감해!\"라고 말해줄 때 정말 치유되는 느낌이었습니다.",
  },
  {
    alias: "시우맘",
    age: "28세",
    childAge: "아들 14개월",
    stars: 5,
    date: "2025.12.30",
    topic: "산후우울",
    text: "첫 아이를 낳고 \"좋은 엄마가 맞나\" 매일 불안했어요. 15분 정도의 대화였는데 오랜 친구와 이야기한 것처럼 편했습니다. 아이가 좀 더 크면 이 동화를 함께 읽으며 엄마의 마음을 전해주고 싶어요.",
  },
  {
    alias: "다은맘",
    age: "33세",
    childAge: "딸 3세",
    stars: 3,
    date: "2025.12.18",
    topic: "자존감",
    text: "대화 자체는 정말 좋았는데, 제 이야기와 동화 사이 연결이 조금 아쉬웠어요. 그래도 아이가 동화를 좋아하긴 했어요. 다음에 한 번 더 해볼 생각입니다.",
  },
  {
    alias: "준이맘",
    age: "40세",
    childAge: "아들 7세, 딸 4세",
    stars: 4,
    date: "2025.12.05",
    topic: "자존감",
    text: "솔직히 AI라서 반신반의했는데 생각보다 깊은 공감을 받았어요. 다만 카카오 로그인이 안 돼서 이메일로 가입해야 하는 게 좀 불편했습니다. 동화 퀄리티는 만족이에요.",
  },
];

function StarRating({ count }: { count: number }) {
  return (
    <span className="text-sm tracking-wider" aria-label={`별점 ${count}점`}>
      {"\u2605".repeat(count)}
      {"\u2606".repeat(5 - count)}
    </span>
  );
}

export default function ReviewsPage() {
  return (
    <div className="min-h-dvh bg-cream px-6 pt-10 pb-20">
      <div className="max-w-prose mx-auto">
        {/* Header */}
        <h1 className="font-serif text-2xl text-brown font-bold mb-2">
          부모님들의 이야기
        </h1>

        {/* Aggregate rating */}
        <div className="flex items-center gap-3 mb-2">
          <span className="text-lg" style={{ color: "#E07A5F" }}>{"★".repeat(5)}</span>
          <span className="text-sm text-brown font-semibold">
            4.8 <span className="text-brown-pale font-light">/ 5.0</span>
          </span>
          <span className="text-xs text-brown-pale font-light">
            ({reviews.length}개 후기)
          </span>
        </div>
        <p className="text-sm text-brown-light font-light leading-relaxed mb-8">
          mamastale을 경험한 부모님들의 솔직한 후기입니다.
        </p>

        {/* Featured review cards */}
        <div className="space-y-5">
          {reviews.map((r, i) => (
            <React.Fragment key={r.alias}>
              <div
                className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 border border-brown-pale/10"
              >
                {/* Top: alias + meta */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-brown">{r.alias}</p>
                    <p className="text-[11px] text-brown-pale font-light mt-0.5">
                      {r.age} · {r.childAge}
                    </p>
                  </div>
                  <div className="text-right">
                    <div style={{ color: "#E07A5F" }}>
                      <StarRating count={r.stars} />
                    </div>
                    <p className="text-[10px] text-brown-pale/60 font-light mt-0.5">
                      {r.date}
                    </p>
                  </div>
                </div>

                {/* Topic tag */}
                {r.topic && (
                  <span
                    className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium mb-2"
                    style={{
                      background: "rgba(109,76,145,0.08)",
                      color: "#6D4C91",
                      border: "1px solid rgba(109,76,145,0.12)",
                    }}
                  >
                    {r.topic}
                  </span>
                )}

                {/* Review text */}
                <p className="text-[13px] text-brown-light leading-7 font-normal break-keep">
                  {r.text}
                </p>
              </div>
              {(i === 2 || i === 6) && (
                <div className="rounded-2xl p-6 text-center" style={{ background: "linear-gradient(135deg, rgba(224,122,95,0.10), rgba(109,76,145,0.06))", border: "2px solid rgba(224,122,95,0.20)", boxShadow: "0 4px 20px rgba(224,122,95,0.08)" }}>
                  <p className="font-serif text-base text-brown font-semibold mb-2">나도 동화를 만들어볼까?</p>
                  <p className="text-xs text-brown-light font-light mb-4 break-keep">15분 대화로 아이만의 동화 스토리가 완성돼요</p>
                  <Link href="/pricing" className="inline-flex items-center justify-center px-8 py-3 rounded-full text-sm font-bold text-white no-underline min-h-[44px] transition-transform active:scale-[0.97]" style={{ background: "linear-gradient(135deg, #E07A5F, #C96B52)", boxShadow: "0 6px 20px rgba(224,122,95,0.3)" }}>
                    동화 만들기
                  </Link>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* User review section (client component) */}
        <ReviewSection />

        {/* CTA */}
        <div className="mt-10 text-center space-y-3">
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center min-h-[44px] px-8 py-3.5 rounded-full text-white text-sm font-medium no-underline transition-transform active:scale-[0.97]"
            style={{
              background: "linear-gradient(135deg, #E07A5F, #C96B52)",
              boxShadow: "0 6px 20px rgba(224,122,95,0.3)",
            }}
          >
            나도 동화 만들어보기
          </Link>
          <div>
            <Link
              href="/community"
              className="text-xs text-purple font-medium no-underline"
            >
              완성된 동화 둘러보기 →
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
