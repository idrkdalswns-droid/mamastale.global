"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/hooks/useAuth";
import { useTeacherStore } from "@/lib/hooks/useTeacherStore";
import { TeacherCodeModal } from "@/components/teacher/TeacherCodeModal";
import { TeacherOnboarding } from "@/components/teacher/TeacherOnboarding";
import { TeacherCelebration } from "@/components/teacher/TeacherCelebration";
import { TeacherHome } from "@/components/teacher/TeacherHome";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import dynamic from "next/dynamic";

// P1-9: Dynamic imports for heavy components (reduce initial bundle)
const TeacherChat = dynamic(() => import("@/components/teacher/TeacherChat").then(m => ({ default: m.TeacherChat })), {
  ssr: false,
  loading: () => <div className="flex-1 flex items-center justify-center"><span className="text-brown-light text-sm">로딩 중...</span></div>,
});
const TeacherPreview = dynamic(() => import("@/components/teacher/TeacherPreview").then(m => ({ default: m.TeacherPreview })), {
  ssr: false,
  loading: () => <div className="flex-1 flex items-center justify-center"><span className="text-brown-light text-sm">로딩 중...</span></div>,
});
const TeacherStoryWriter = dynamic(() => import("@/components/teacher/TeacherStoryWriter").then(m => ({ default: m.TeacherStoryWriter })), {
  ssr: false,
  loading: () => <div className="flex-1 flex items-center justify-center"><span className="text-brown-light text-sm">로딩 중...</span></div>,
});
const WorksheetWizard = dynamic(() => import("@/components/teacher/worksheet/WorksheetWizard").then(m => ({ default: m.WorksheetWizard })), {
  ssr: false,
});
import type { TeacherOnboarding as TeacherOnboardingType, TeacherStory } from "@/lib/types/teacher";

export default function TeacherPage() {
  const { user, loading: authLoading } = useAuth();
  const store = useTeacherStore();
  const router = useRouter();
  const [isRecovering, setIsRecovering] = useState(true);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [editStory, setEditStory] = useState<{ storyId: string; title: string; spreads: import("@/lib/types/teacher").TeacherSpread[] } | null>(null);
  // T-F2: Guard against duplicate session recovery (React StrictMode double-invoke)
  const recoveryCalledRef = useRef(false);

  // 킬 스위치 체크
  const isEnabled = process.env.NEXT_PUBLIC_TEACHER_MODE_ENABLED !== "false";

  // 세션 복구 (페이지 마운트 시)
  useEffect(() => {
    if (authLoading || !user) return;
    // T-F9: Use getState() for async context to avoid stale closure
    const { screenState, sessionId } = useTeacherStore.getState();
    // 이미 HOME이면 복구 불필요 (handleCodeVerified에서 이미 처리됨)
    if (screenState === "HOME" || sessionId) {
      setIsRecovering(false);
      return;
    }

    // T-F2: Prevent duplicate recovery calls (React StrictMode)
    if (recoveryCalledRef.current) return;
    recoveryCalledRef.current = true;

    const recoverSession = async () => {
      try {
        const res = await fetch("/api/teacher/session");
        if (!res.ok) {
          setIsRecovering(false);
          return;
        }

        const data = await res.json();
        if (data.session) {
          // restoreSession + screenState를 원자적으로 세팅
          useTeacherStore.setState({
            sessionId: data.session.id,
            expiresAt: data.session.expiresAt,
            currentPhase: data.session.currentPhase,
            turnCount: data.session.turnCount,
            onboarding: data.session.onboarding,
            messages: data.messages || [],
            screenState: "HOME",
          });
        } else {
          useTeacherStore.getState().setScreenState("CODE_ENTRY");
        }
      } catch {
        useTeacherStore.getState().setScreenState("CODE_ENTRY");
      } finally {
        setIsRecovering(false);
      }
    };

    recoverSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  // CELEBRATION 상태에서 generatedStory 없으면 HOME으로 복구
  useEffect(() => {
    if (store.screenState === "CELEBRATION" && !store.generatedStory) {
      store.setScreenState("HOME");
    }
  }, [store.screenState, store.generatedStory]);

  // Disable pull-to-refresh during chat/onboarding/generating
  useEffect(() => {
    if (["CHAT", "ONBOARDING", "GENERATING"].includes(store.screenState)) {
      document.body.classList.add("no-pull-refresh");
    } else {
      document.body.classList.remove("no-pull-refresh");
    }
    return () => document.body.classList.remove("no-pull-refresh");
  }, [store.screenState]);

  // P0-7: 세션 만료 통합 폴링 (30초, TeacherChat의 중복 체크 제거됨)
  useEffect(() => {
    const interval = setInterval(() => {
      const { expiresAt, sessionId, screenState } = useTeacherStore.getState();
      if (!sessionId || !expiresAt || screenState === "CODE_ENTRY") return;

      const expiresMs = new Date(expiresAt).getTime();
      const now = Date.now();
      const remainMs = expiresMs - now;

      if (remainMs <= 0) {
        useTeacherStore.getState().reset();
        useTeacherStore.getState().setScreenState("CODE_ENTRY");
        toast.error("세션이 만료되었습니다. 코드를 다시 입력해주세요.");
      } else if (remainMs <= 10 * 60 * 1000 && remainMs > 9.5 * 60 * 1000) {
        toast("세션이 10분 후 만료됩니다. 작업을 저장해주세요.", { icon: "⏰", duration: 8000 });
      } else if (remainMs <= 5 * 60 * 1000 && remainMs > 4.5 * 60 * 1000) {
        toast("세션이 5분 후 만료됩니다!", { icon: "⏰", duration: 8000 });
      }
    }, 30_000);

    return () => clearInterval(interval);
  }, []);

  // 코드 검증 완료
  const handleCodeVerified = useCallback(
    (data: {
      sessionId: string;
      kindergartenName: string;
      expiresAt: string;
      currentPhase: string;
      turnCount: number;
      isExisting: boolean;
      teacherCode?: string;
    }) => {
      // 세션 + 화면 상태를 한 번에 세팅 (race condition 방지)
      useTeacherStore.setState({
        sessionId: data.sessionId,
        expiresAt: data.expiresAt,
        kindergartenName: data.kindergartenName,
        currentPhase: (data.currentPhase as "A" | "B" | "C" | "D" | "E") || "A",
        turnCount: data.turnCount || 0,
        ...(data.teacherCode ? { teacherCode: data.teacherCode } : {}),
        screenState: "HOME",
      });

      if (data.isExisting && data.turnCount > 0) {
        // 기존 세션 복구 — 대화 히스토리 로드
        fetch("/api/teacher/session")
          .then((res) => res.json())
          .then((sessionData) => {
            if (sessionData.session && sessionData.messages?.length > 0) {
              store.restoreSession(sessionData.session, sessionData.messages);
            }
            store.setScreenState("HOME");
          })
          .catch(() => store.setScreenState("HOME"));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // 온보딩 완료
  const handleOnboardingComplete = useCallback(
    async (onboarding: TeacherOnboardingType) => {
      store.setOnboarding(onboarding);

      // DB에 온보딩 데이터 저장
      if (store.sessionId) {
        try {
          await fetch("/api/teacher/session", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId: store.sessionId,
              onboarding,
            }),
          });
        } catch {
          // 저장 실패해도 진행 (로컬에 있으므로)
        }
      }

      store.setScreenState("CHAT");
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store.sessionId]
  );

  // 세션 만료
  const handleSessionExpired = useCallback(() => {
    store.reset();
    store.setScreenState("CODE_ENTRY");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 생성 요청 (Phase E)
  const handleRequestGenerate = useCallback(async () => {
    if (!store.sessionId) return;

    store.setScreenState("GENERATING");
    store.setGenerating(true);

    try {
      // TB1 Fix: Split into brief (Haiku, ~5s) + story (Opus, ~20s) to stay under Edge 30s
      // Step 1: Brief extraction
      const briefRes = await fetch("/api/teacher/generate/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: store.sessionId }),
      });

      if (!briefRes.ok) {
        const errData = await briefRes.json().catch(() => ({}));
        throw new Error((errData as { error?: string }).error || `HTTP ${briefRes.status}`);
      }

      const briefData = await briefRes.json();

      // If already generated (idempotency), skip Step 2
      if (briefData.alreadyGenerated) {
        store.setGeneratedStory(briefData);
        store.setScreenState("CELEBRATION");
        return;
      }

      // Step 2: Story generation
      const storyRes = await fetch("/api/teacher/generate/story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: store.sessionId,
          briefContext: briefData.briefContext,
          onboarding: briefData.onboarding,
        }),
      });

      if (!storyRes.ok) {
        const errData = await storyRes.json().catch(() => ({}));
        throw new Error((errData as { error?: string }).error || `HTTP ${storyRes.status}`);
      }

      const data = await storyRes.json();
      store.setGeneratedStory(data);
      store.setScreenState("CELEBRATION");
    } catch (err) {
      console.error("[Teacher] Generation failed:", err);
      store.setScreenState("CHAT");
      store.addMessage({
        role: "assistant",
        content: "동화 생성 중 오류가 발생했어요. 다시 시도해주세요.",
        isError: true,
      });
    } finally {
      store.setGenerating(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.sessionId]);

  // 새 동화 만들기 — 세션 만료 체크 + 기존 세션 강제 만료 + verify-code 재호출
  const handleNewStory = useCallback(async () => {
    // 세션 만료 체크
    if (store.expiresAt && new Date(store.expiresAt).getTime() <= Date.now()) {
      store.reset();
      store.setScreenState("CODE_ENTRY");
      toast.error("세션이 만료되었습니다. 코드를 다시 입력해주세요.");
      return;
    }

    setIsCreatingNew(true);
    // H6-FIX: try/finally ensures isCreatingNew resets even on unexpected errors
    try {
      const currentCode = store.teacherCode;

      // 1. 기존 세션 강제 만료
      if (store.sessionId) {
        await fetch("/api/teacher/session", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: store.sessionId,
            currentPhase: "DONE",
            expiresAt: new Date().toISOString(),
          }),
        }).catch(() => {});
      }

      // 2. store 초기화
      store.reset();

      // 3. 동일 코드로 새 세션 생성
      if (currentCode) {
        try {
          const res = await fetch("/api/teacher/verify-code", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: currentCode }),
          });

          if (res.ok) {
            const data = await res.json();
            store.setSession({
              sessionId: data.sessionId,
              expiresAt: data.expiresAt,
              kindergartenName: data.kindergartenName,
              currentPhase: (data.currentPhase as "A" | "B" | "C" | "D" | "E") || "A",
              turnCount: data.turnCount || 0,
              teacherCode: currentCode,
            });
            store.setScreenState("ONBOARDING");
          } else {
            toast.error("오늘 동화 만들기 횟수를 초과했어요.");
            store.setScreenState("HOME");
          }
        } catch {
          toast.error("네트워크 오류. 다시 시도해주세요.");
          store.setScreenState("HOME");
        }
      } else {
        // teacherCode 없으면 코드 입력부터 다시
        store.setScreenState("CODE_ENTRY");
      }
    } finally {
      setIsCreatingNew(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.sessionId, store.teacherCode]);

  // 채팅에서 나가기 → HOME으로
  const handleChatExit = useCallback(
    () => {
      store.setScreenState("HOME");
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ─── 렌더링 ───

  // 킬 스위치
  if (!isEnabled) {
    return (
      <div className="flex items-center justify-center min-h-[60dvh] px-6">
        <div className="text-center">
          <div className="w-16 h-16 relative rounded-xl overflow-hidden mx-auto mb-3">
            <Image src="/images/teacher/state/locked.jpeg" alt="준비 중" fill className="object-cover" sizes="64px" />
          </div>
          <p className="text-sm text-brown-light break-keep">
            선생님 모드는 현재 준비 중입니다.
          </p>
        </div>
      </div>
    );
  }

  // 로딩
  if (authLoading || isRecovering) {
    return (
      <div className="flex items-center justify-center min-h-[60dvh]">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-coral border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm text-brown-light">불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 미로그인 (middleware가 처리하지만 안전 장치)
  if (!user) {
    return null;
  }

  // 상태 머신 기반 렌더링 (ErrorBoundary로 render 에러 catch)
  const renderScreen = () => {
    switch (store.screenState) {
      case "CODE_ENTRY":
        return <TeacherCodeModal onVerified={handleCodeVerified} onBack={() => { window.location.href = "/"; }} />;

      case "HOME":
        return (
          <TeacherHome
            kindergartenName={store.kindergartenName}
            onNewStory={handleNewStory}
            onContinue={() => store.setScreenState("CHAT")}
            onContinueOnboarding={() => store.setScreenState("ONBOARDING")}
            onViewStory={(story: TeacherStory) => {
              store.setGeneratedStory(story);
              store.setScreenState("PREVIEW");
            }}
            onWriteStory={() => store.setScreenState("WRITING")}
            onExit={() => router.push("/")}
            messages={store.messages}
            onboarding={store.onboarding}
            currentPhase={store.currentPhase}
            isCreatingNew={isCreatingNew}
          />
        );

      case "ONBOARDING":
        return (
          <TeacherOnboarding
            onComplete={handleOnboardingComplete}
            onExit={() => store.setScreenState("HOME")}
          />
        );

      case "CHAT":
        return (
          <TeacherChat
            onSessionExpired={handleSessionExpired}
            onRequestGenerate={handleRequestGenerate}
            onExit={handleChatExit}
          />
        );

    case "GENERATING":
      return (
        <div className="flex flex-col items-center justify-center min-h-[60dvh] px-6">
          <div className="text-center">
            <div className="w-20 h-20 relative rounded-xl overflow-hidden mx-auto mb-4 animate-bounce">
              <Image src="/images/teacher/state/generating.jpeg" alt="생성 중" fill className="object-cover" sizes="80px" />
            </div>
            <p className="text-lg font-semibold text-brown mb-2">
              동화를 만들고 있어요...
            </p>
            <p className="text-sm text-brown-light break-keep">
              14개 스프레드 + 활동 가이드를 준비하고 있어요
            </p>
            <div className="mt-6">
              <div className="animate-spin w-6 h-6 border-2 border-coral border-t-transparent rounded-full mx-auto" />
            </div>
          </div>
        </div>
      );

    case "CELEBRATION":
      if (!store.generatedStory) {
        // generatedStory 없이 CELEBRATION에 도달한 경우 — HOME으로 리디렉트
        // (useEffect에서 처리)
        return null;
      }
      return (
        <TeacherCelebration
          story={store.generatedStory}
          sessionId={store.sessionId}
          onViewStory={() => store.setScreenState("PREVIEW")}
          onNewStory={() => store.setScreenState("HOME")}
        />
      );

    case "WRITING":
      return (
        <ErrorBoundary fullScreen>
          <TeacherStoryWriter
            onSave={(story: TeacherStory) => {
              setEditStory(null);
              store.setGeneratedStory(story);
              store.setScreenState("PREVIEW");
            }}
            onBack={() => {
              setEditStory(null);
              store.setScreenState("HOME");
            }}
            editMode={editStory || undefined}
          />
        </ErrorBoundary>
      );

    case "PREVIEW":
      return store.generatedStory ? (
        <TeacherPreview
          story={store.generatedStory}
          onNewStory={() => store.setScreenState("HOME")}
          onBack={() => store.setScreenState("HOME")}
          onEditStory={() => {
            const s = store.generatedStory;
            if (s) {
              setEditStory({
                storyId: s.id || "",
                title: s.title || "",
                spreads: s.spreads || [],
              });
              store.setScreenState("WRITING");
            }
          }}
        />
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[60dvh] px-6">
          <div className="text-center">
            <div className="w-16 h-16 relative rounded-xl overflow-hidden mx-auto mb-4">
              <Image src="/images/teacher/state/error.jpeg" alt="오류" fill className="object-cover" sizes="64px" />
            </div>
            <p className="text-sm text-brown-light mb-4">
              동화 데이터를 찾을 수 없습니다.
            </p>
            <button
              onClick={() => store.setScreenState("HOME")}
              className="px-6 py-3 rounded-full text-white text-sm font-medium
                         active:scale-[0.97] transition-all"
              style={{
                background: "linear-gradient(135deg, #E07A5F, #C96B52)",
                boxShadow: "0 4px 16px rgba(224,122,95,0.25)",
              }}
            >
              홈으로
            </button>
          </div>
        </div>
      );

    case "DONE":
      return (
        <div className="flex flex-col items-center justify-center min-h-[60dvh] px-6">
          <div className="text-center">
            <div className="w-20 h-20 relative rounded-xl overflow-hidden mx-auto mb-4">
              <Image src="/images/teacher/state/done.jpeg" alt="완료" fill className="object-cover" sizes="80px" />
            </div>
            <p className="text-lg font-semibold text-brown mb-4">
              오늘도 멋진 동화를 만드셨어요!
            </p>
            <button
              onClick={() => store.setScreenState("HOME")}
              className="px-6 py-3 rounded-full text-white text-sm font-medium
                         active:scale-[0.97] transition-all"
              style={{
                background: "linear-gradient(135deg, #E07A5F, #C96B52)",
                boxShadow: "0 4px 16px rgba(224,122,95,0.25)",
              }}
            >
              홈으로
            </button>
          </div>
        </div>
      );

      default:
        return null;
    }
  };

  return (
    <ErrorBoundary>
      {renderScreen()}
      <WorksheetWizard />
    </ErrorBoundary>
  );
}
