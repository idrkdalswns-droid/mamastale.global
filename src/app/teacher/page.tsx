"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { useAuth } from "@/lib/hooks/useAuth";
import { useTeacherStore } from "@/lib/hooks/useTeacherStore";
import { TeacherCodeModal } from "@/components/teacher/TeacherCodeModal";
import { TeacherOnboarding } from "@/components/teacher/TeacherOnboarding";
import { TeacherChat } from "@/components/teacher/TeacherChat";
import { TeacherPreview } from "@/components/teacher/TeacherPreview";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import type { TeacherOnboarding as TeacherOnboardingType } from "@/lib/types/teacher";

export default function TeacherPage() {
  const { user, loading: authLoading } = useAuth();
  const store = useTeacherStore();
  const [isRecovering, setIsRecovering] = useState(true);

  // 킬 스위치 체크
  const isEnabled = process.env.NEXT_PUBLIC_TEACHER_MODE_ENABLED !== "false";

  // 세션 복구 (페이지 마운트 시)
  useEffect(() => {
    if (authLoading || !user) return;

    const recoverSession = async () => {
      try {
        const res = await fetch("/api/teacher/session");
        if (!res.ok) {
          setIsRecovering(false);
          return;
        }

        const data = await res.json();
        if (data.session) {
          store.restoreSession(data.session, data.messages || []);
          // 온보딩 완료 여부에 따라 스크린 결정
          const hasOnboarding =
            data.session.onboarding &&
            Object.keys(data.session.onboarding).length > 0;
          if (data.session.currentPhase === "DONE") {
            store.setScreenState("DONE");
          } else if (hasOnboarding) {
            store.setScreenState("CHAT");
          } else {
            store.setScreenState("ONBOARDING");
          }
        } else {
          store.setScreenState("CODE_ENTRY");
        }
      } catch {
        store.setScreenState("CODE_ENTRY");
      } finally {
        setIsRecovering(false);
      }
    };

    recoverSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  // 코드 검증 완료
  const handleCodeVerified = useCallback(
    (data: {
      sessionId: string;
      kindergartenName: string;
      expiresAt: string;
      currentPhase: string;
      turnCount: number;
      isExisting: boolean;
    }) => {
      store.setSession({
        sessionId: data.sessionId,
        expiresAt: data.expiresAt,
        kindergartenName: data.kindergartenName,
        currentPhase: (data.currentPhase as "A" | "B" | "C" | "D" | "E") || "A",
        turnCount: data.turnCount || 0,
      });

      if (data.isExisting && data.turnCount > 0) {
        // 기존 세션 복구 — 대화 히스토리 로드
        fetch("/api/teacher/session")
          .then((res) => res.json())
          .then((sessionData) => {
            if (sessionData.session && sessionData.messages?.length > 0) {
              store.restoreSession(sessionData.session, sessionData.messages);
              store.setScreenState("CHAT");
            } else {
              store.setScreenState("ONBOARDING");
            }
          })
          .catch(() => store.setScreenState("ONBOARDING"));
      } else {
        store.setScreenState("ONBOARDING");
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
      const res = await fetch("/api/teacher/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: store.sessionId }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          (errData as { error?: string }).error || `HTTP ${res.status}`
        );
      }

      const data = await res.json();
      store.setGeneratedStory(data);
      store.setScreenState("PREVIEW");
    } catch (err) {
      console.error("[Teacher] Generation failed:", err);
      // 에러 시 챗으로 돌아감
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

  // 새 동화 만들기
  const handleNewStory = useCallback(() => {
    store.reset();
    store.setScreenState("ONBOARDING");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        return <TeacherCodeModal onVerified={handleCodeVerified} />;

      case "ONBOARDING":
        return <TeacherOnboarding onComplete={handleOnboardingComplete} />;

      case "CHAT":
        return (
          <TeacherChat
            onSessionExpired={handleSessionExpired}
            onRequestGenerate={handleRequestGenerate}
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

    case "PREVIEW":
      return store.generatedStory ? (
        <TeacherPreview
          story={store.generatedStory}
          onNewStory={handleNewStory}
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
              onClick={handleNewStory}
              className="px-6 py-3 rounded-full text-white text-sm font-medium
                         active:scale-[0.97] transition-all"
              style={{
                background: "linear-gradient(135deg, #E07A5F, #C96B52)",
                boxShadow: "0 4px 16px rgba(224,122,95,0.25)",
              }}
            >
              새 동화 만들기
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
              onClick={handleNewStory}
              className="px-6 py-3 rounded-full text-white text-sm font-medium
                         active:scale-[0.97] transition-all"
              style={{
                background: "linear-gradient(135deg, #E07A5F, #C96B52)",
                boxShadow: "0 4px 16px rgba(224,122,95,0.25)",
              }}
            >
              새 동화 만들기
            </button>
          </div>
        </div>
      );

      default:
        return null;
    }
  };

  return <ErrorBoundary>{renderScreen()}</ErrorBoundary>;
}
