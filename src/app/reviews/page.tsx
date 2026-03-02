import Link from "next/link";
import { ReviewSection } from "@/components/reviews/ReviewSection";

const reviews = [
  {
    alias: "준우맘",
    age: "32세",
    childAge: "아들 3세",
    stars: 5,
    text: "산후우울증으로 힘든 시간을 보내고 있었는데, 대화를 나누며 울컥했어요. 완성된 동화를 아이에게 읽어줬더니 \"엄마가 만든 거야?\"라며 좋아하는 모습에 저도 모르게 웃음이 났습니다. 제 아픔이 아이를 위한 선물이 될 수 있다는 게 신기했어요.",
  },
  {
    alias: "서연이네",
    age: "34세",
    childAge: "딸 5세, 아들 2세",
    stars: 5,
    text: "두 아이를 키우면서 번아웃이 왔었어요. 대화하면서 \"지금 충분히 잘하고 있다\"는 말에 눈물이 났습니다. 동화 속 주인공이 저와 너무 닮아있어서 놀랐고, 큰아이가 매일 밤 이 동화를 읽어달라고 해요.",
  },
  {
    alias: "하준맘",
    age: "31세",
    childAge: "아들 4세",
    stars: 4,
    text: "시댁과의 관계에서 받은 상처를 꺼내기 어려웠는데, 동화라는 형식 덕분에 자연스럽게 이야기할 수 있었어요. 완성된 동화가 제 마음을 정리하는 데 도움이 됐습니다. 아이에게도 좋은 이야기가 되었고요.",
  },
  {
    alias: "지우맘",
    age: "36세",
    childAge: "딸 6세",
    stars: 5,
    text: "경력단절 후 자존감이 바닥이었는데, 대화를 통해 제 경험이 얼마나 소중한지 다시 느꼈어요. 아이가 동화 속 주인공을 보며 \"엄마처럼 용감해!\"라고 말해줄 때 정말 치유되는 느낌이었습니다.",
  },
  {
    alias: "시우맘",
    age: "28세",
    childAge: "아들 14개월",
    stars: 5,
    text: "첫 아이를 낳고 \"좋은 엄마가 맞나\" 매일 불안했어요. 15분 정도의 대화였는데 오랜 친구와 이야기한 것처럼 편했습니다. 아이가 좀 더 크면 이 동화를 함께 읽으며 엄마의 마음을 전해주고 싶어요.",
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
        <Link
          href="/"
          className="font-serif text-lg font-bold text-brown no-underline"
        >
          mamastale
        </Link>

        <h1 className="font-serif text-2xl text-brown font-bold mt-8 mb-2">
          부모님들의 이야기
        </h1>
        <p className="text-sm text-brown-light font-light leading-relaxed mb-8">
          mamastale을 경험한 부모님들의 솔직한 후기입니다.
        </p>

        {/* Featured review cards */}
        <div className="space-y-5">
          {reviews.map((r) => (
            <div
              key={r.alias}
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
                <div style={{ color: "#E07A5F" }}>
                  <StarRating count={r.stars} />
                </div>
              </div>

              {/* Review text */}
              <p className="text-[13px] text-brown-light leading-7 font-light break-keep">
                {r.text}
              </p>
            </div>
          ))}
        </div>

        {/* User review section (client component) */}
        <ReviewSection />

        {/* CTA */}
        <div className="mt-10 text-center">
          <Link
            href="/?action=start"
            className="inline-flex items-center justify-center min-h-[44px] px-8 py-3.5 rounded-full text-white text-sm font-medium no-underline transition-transform active:scale-[0.97]"
            style={{
              background: "linear-gradient(135deg, #E07A5F, #C96B52)",
              boxShadow: "0 6px 20px rgba(224,122,95,0.3)",
            }}
          >
            나도 동화 만들어보기
          </Link>
        </div>

        {/* Footer */}
        <div className="mt-10">
          <Link
            href="/"
            className="text-sm text-brown-mid no-underline"
          >
            ← 홈으로
          </Link>
        </div>
      </div>
    </div>
  );
}
