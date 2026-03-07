"use client";

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh px-6 text-center bg-cream">
      <div className="text-6xl mb-6">📖</div>
      <h1 className="text-2xl font-bold text-gray-800 mb-3" style={{ fontFamily: "'Nanum Myeongjo', serif" }}>
        오프라인 상태입니다
      </h1>
      <p className="text-gray-600 mb-6 leading-relaxed">
        인터넷 연결이 끊어졌어요.<br />
        Wi-Fi나 데이터를 확인해 주세요.
      </p>
      <p className="text-sm text-gray-400">
        이전에 저장된 동화는 오프라인에서도 볼 수 있어요.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-8 px-6 py-3 bg-coral text-white rounded-2xl font-medium hover:bg-coral/90 transition-colors"
      >
        다시 시도하기
      </button>
    </div>
  );
}
