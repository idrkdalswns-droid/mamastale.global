import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-dvh bg-cream flex items-center justify-center px-8">
      <div className="text-center">
        <div className="text-[56px] mb-4">📖</div>
        <h1
          className="text-xl font-semibold mb-2"
          style={{
            color: "rgb(var(--brown))",
            fontFamily: "'Nanum Myeongjo', serif",
          }}
        >
          페이지를 찾을 수 없어요
        </h1>
        <p
          className="text-sm font-light mb-8 leading-relaxed"
          style={{ color: "rgb(var(--brown-light))" }}
        >
          찾으시는 이야기가 다른 곳에 있을지도 몰라요.
          <br />
          홈으로 돌아가서 새로운 이야기를 시작해 보세요.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center min-h-[44px] px-8 py-3 rounded-full text-sm font-medium text-white transition-all active:scale-[0.97]"
          style={{
            background: "linear-gradient(135deg, #E07A5F, #C96B52)",
            boxShadow: "0 6px 20px rgba(224,122,95,0.3)",
          }}
        >
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
