"use client";

import { OAuthButtons } from "@/components/auth/OAuthButtons";

interface SignupModalProps {
  onClose: () => void;
  /** Called BEFORE any auth redirect to save chat state */
  onBeforeAuthRedirect?: () => void;
}

export function SignupModal({ onClose, onBeforeAuthRedirect }: SignupModalProps) {
  return (
    <div
      className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}
      role="dialog"
      aria-modal="true"
      aria-label="회원가입"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
    >
      <div
        className="w-full sm:max-w-sm sm:rounded-3xl rounded-t-3xl p-6 sm:p-7 max-h-[90dvh] overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-400"
        style={{
          background: "linear-gradient(180deg, #FFF9F5, #FFFFFF)",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.12)",
        }}
      >
        {/* Handle bar for mobile bottom sheet */}
        <div className="flex justify-center mb-3 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-brown-pale/30" />
        </div>

        <div className="text-center mb-5">
          <h3 className="font-serif text-lg font-bold text-brown mb-1.5 leading-tight">
            이야기가 깊어지고 있어요
          </h3>
          <p className="text-xs text-brown-light font-light leading-relaxed break-keep">
            회원가입 후 <span className="text-coral font-medium">이 대화를 그대로 이어서</span><br />
            나만의 마음 동화를 완성할 수 있어요.
          </p>
        </div>

        {/* Benefits */}
        <div className="space-y-2 mb-5">
          {[
            { icon: "💬", text: "대화 이어서 진행" },
            { icon: "📖", text: "동화 영구 보관" },
            { icon: "🎫", text: "무료 1회 티켓" },
          ].map((b, i) => (
            <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-xl" style={{ background: "rgba(224,122,95,0.05)" }}>
              <span className="text-sm">{b.icon}</span>
              <span className="text-xs text-brown font-medium">{b.text}</span>
            </div>
          ))}
        </div>

        <OAuthButtons disabled={false} onBeforeRedirect={onBeforeAuthRedirect} />

        <div className="text-center mt-4">
          <button
            onClick={onClose}
            className="text-xs font-light text-brown-pale"
          >
            나중에 할게요
          </button>
        </div>

        <p className="text-[10px] text-brown-pale font-light text-center mt-2">
          대화 내용은 안전하게 보관됩니다
        </p>
      </div>
    </div>
  );
}
