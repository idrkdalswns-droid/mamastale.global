"use client";

import { WatercolorBlob } from "@/components/ui/WatercolorBlob";

interface CommunityPageProps {
  onRestart: () => void;
}

export function CommunityPage({ onRestart }: CommunityPageProps) {
  return (
    <div className="min-h-dvh bg-cream flex flex-col relative overflow-hidden pt-[env(safe-area-inset-top,20px)] pb-[env(safe-area-inset-bottom,20px)]">
      <WatercolorBlob top={-60} right={-80} size={240} color="rgba(232,168,124,0.07)" />
      <WatercolorBlob bottom={80} left={-60} size={200} color="rgba(184,216,208,0.08)" />
      <WatercolorBlob top="40%" left={-40} size={160} color="rgba(200,184,216,0.06)" />

      <div className="flex-1 flex flex-col px-7 py-8 relative z-[1]">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-[48px] mb-4">🎉</div>
          <h1 className="font-serif text-[26px] font-bold text-brown leading-tight mb-3">
            당신의 동화가<br />완성되었어요
          </h1>
          <p className="text-sm text-brown-light font-light leading-relaxed break-keep">
            세상에 하나뿐인 치유 동화를<br />
            아이에게 들려주세요
          </p>
        </div>

        {/* Stats card */}
        <div
          className="rounded-2xl p-5 mb-5"
          style={{
            background: "rgba(255,255,255,0.6)",
            border: "1px solid rgba(196,149,106,0.1)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="text-center mb-4">
            <div className="text-[10px] text-brown-mid tracking-[3px] font-medium mb-3">
              YOUR JOURNEY
            </div>
            <div className="flex justify-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-serif font-bold text-coral">4</div>
                <div className="text-[10px] text-brown-light font-light mt-1">치유 단계</div>
              </div>
              <div className="w-[1px] bg-brown-pale/20" />
              <div className="text-center">
                <div className="text-2xl font-serif font-bold text-mint-deep">10</div>
                <div className="text-[10px] text-brown-light font-light mt-1">동화 장면</div>
              </div>
              <div className="w-[1px] bg-brown-pale/20" />
              <div className="text-center">
                <div className="text-2xl font-serif font-bold text-purple">1</div>
                <div className="text-[10px] text-brown-light font-light mt-1">나만의 동화</div>
              </div>
            </div>
          </div>
        </div>

        {/* Community card */}
        <div
          className="rounded-2xl p-5 mb-5"
          style={{
            background: "linear-gradient(135deg, rgba(254,229,0,0.08), rgba(254,229,0,0.02))",
            border: "1px solid rgba(254,229,0,0.15)",
          }}
        >
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-full bg-kakao flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#3C1E1E">
                <path d="M12 3C6.48 3 2 6.58 2 10.9c0 2.78 1.86 5.22 4.66 6.62l-.96 3.56c-.08.3.26.54.52.37l4.24-2.82c.5.06 1.02.09 1.54.09 5.52 0 10-3.58 10-7.9S17.52 3 12 3z"/>
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-serif text-[15px] font-semibold text-brown mb-1.5">
                마마스테일 커뮤니티
              </h3>
              <p className="text-xs text-brown-light font-light leading-relaxed mb-3 break-keep">
                같은 마음을 가진 엄마들과 이야기를 나눠보세요.
                동화 창작 팁, 육아 고민, 서로의 경험을 공유하는
                따뜻한 공간입니다.
              </p>
              <a
                href="https://open.kakao.com/o/gSSkFmii"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-medium no-underline transition-transform active:scale-[0.97]"
                style={{
                  background: "#FEE500",
                  color: "#3C1E1E",
                  boxShadow: "0 3px 12px rgba(254,229,0,0.25)",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#3C1E1E">
                  <path d="M12 3C6.48 3 2 6.58 2 10.9c0 2.78 1.86 5.22 4.66 6.62l-.96 3.56c-.08.3.26.54.52.37l4.24-2.82c.5.06 1.02.09 1.54.09 5.52 0 10-3.58 10-7.9S17.52 3 12 3z"/>
                </svg>
                카카오톡 오픈채팅 참여하기
              </a>
            </div>
          </div>
        </div>

        {/* Feedback encouragement */}
        <div
          className="rounded-2xl p-5 mb-5"
          style={{
            background: "rgba(255,255,255,0.5)",
            border: "1px solid rgba(184,216,208,0.15)",
          }}
        >
          <div className="text-center">
            <div className="text-2xl mb-2">💌</div>
            <h3 className="font-serif text-[15px] font-semibold text-brown mb-2">
              어머니의 목소리가 필요합니다
            </h3>
            <p className="text-xs text-brown-light font-light leading-relaxed break-keep">
              오늘 경험은 어떠셨나요?<br />
              솔직한 피드백 한 마디가 마마스테일을<br />
              더 따뜻한 서비스로 만듭니다.
            </p>
          </div>
        </div>

        {/* Next story CTA */}
        <div
          className="rounded-2xl p-5 mb-4"
          style={{
            background: "linear-gradient(135deg, rgba(224,122,95,0.06), rgba(224,122,95,0.02))",
            border: "1px solid rgba(224,122,95,0.12)",
          }}
        >
          <div className="text-center">
            <div className="text-2xl mb-2">📖</div>
            <h3 className="font-serif text-[15px] font-semibold text-brown mb-1.5">
              또 다른 동화를 만들어 볼까요?
            </h3>
            <p className="text-xs text-brown-light font-light leading-relaxed mb-3 break-keep">
              동화 1권 티켓 · ₩1,000<br />
              다른 상처, 다른 은유, 새로운 치유 동화가 탄생합니다
            </p>
            <button
              className="w-full py-3.5 rounded-full text-sm font-medium text-white transition-all active:scale-[0.97]"
              style={{
                background: "linear-gradient(135deg, #E07A5F, #D4836B)",
                boxShadow: "0 6px 20px rgba(224,122,95,0.3)",
              }}
            >
              🎫 동화 1권 티켓 구매 · ₩1,000
            </button>
          </div>
        </div>

        {/* Restart */}
        <button
          onClick={onRestart}
          className="w-full py-3.5 rounded-full text-sm font-normal text-brown-pale transition-all active:scale-[0.97] mb-4"
          style={{ border: "1.5px solid rgba(196,149,106,0.2)" }}
        >
          처음부터 다시 체험하기
        </button>

        {/* Footer */}
        <div className="text-center mt-2">
          <p className="text-[10px] text-brown-pale leading-relaxed">
            mamastale · 나의 과거가 아이의 동화가 되다
          </p>
        </div>
      </div>
    </div>
  );
}
