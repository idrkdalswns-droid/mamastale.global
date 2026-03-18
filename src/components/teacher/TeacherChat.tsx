"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import toast from "react-hot-toast";
import { useTeacherStore } from "@/lib/hooks/useTeacherStore";
import MessageBubble from "@/components/chat/MessageBubble";
import ChatInput from "@/components/chat/ChatInput";
import TypingIndicator from "@/components/chat/TypingIndicator";
import { TeacherPhaseIndicator } from "./TeacherPhaseIndicator";
import { TEACHER_PHASE_TO_NUMBER } from "@/lib/types/teacher";
import type { Message } from "@/lib/types/chat";

interface TeacherChatProps {
  onSessionExpired: () => void;
  onRequestGenerate: () => void;
  onExit: () => void;
}

export function TeacherChat({
  onSessionExpired,
  onRequestGenerate,
  onExit,
}: TeacherChatProps) {
  const {
    messages,
    currentPhase,
    turnCount,
    isLoading,
    expiresAt,
    sendMessageStreaming,
    onboarding,
    addSystemGreeting,
  } = useTeacherStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const generateTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const userScrolledRef = useRef(false);
  const isInitialMount = useRef(true);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);

  // Cleanup generate timer on unmount
  useEffect(() => () => clearTimeout(generateTimerRef.current), []);

  // 세션 만료 감지 (타이머 UI 제거, 감지만 유지)
  const onSessionExpiredRef = useRef(onSessionExpired);
  useEffect(() => { onSessionExpiredRef.current = onSessionExpired; }, [onSessionExpired]);

  useEffect(() => {
    if (!expiresAt) return;
    let warned = false;
    let fired = false;

    const check = () => {
      if (fired) return;
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        fired = true;
        onSessionExpiredRef.current();
        return;
      }
      if (diff < 10 * 60 * 1000 && !warned) {
        warned = true;
        toast("세션이 10분 후 만료됩니다", { icon: "⏰" });
      }
    };

    check();
    const id = setInterval(check, 10_000);
    return () => clearInterval(id);
  }, [expiresAt]);

  // 스마트 스크롤 — 초기 마운트 시 즉시 하단, 이후 사용자 스크롤 위치 존중
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (isInitialMount.current && messages.length > 0) {
      el.scrollTop = el.scrollHeight;
      isInitialMount.current = false;
      return;
    }
    if (!userScrolledRef.current) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    } else {
      setShowScrollDown(true);
    }
  }, [messages, isLoading]);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    userScrolledRef.current = distFromBottom > 80;
    if (!userScrolledRef.current) {
      setShowScrollDown(false);
    }
  }, []);

  const scrollToBottom = useCallback(() => {
    userScrolledRef.current = false;
    setShowScrollDown(false);
    containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: "smooth" });
  }, []);

  // beforeunload — 채팅 중 탭 닫기 방지
  useEffect(() => {
    if (messages.length === 0) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [messages.length]);

  // Phase 번호 매핑 (기존 MessageBubble/ChatInput 호환)
  const phaseNumber = TEACHER_PHASE_TO_NUMBER[currentPhase] || 1;

  const handleSend = useCallback(
    async (text: string) => {
      userScrolledRef.current = false;
      setShowScrollDown(false);
      // "생성해주세요" 등 명시적 생성 요청 감지 (오탐 방지를 위해 패턴 엄격화)
      const generatePatterns = [
        /동화.{0,4}(생성|만들어|시작)/,
        /생성해\s*(주|줘)/,
        /빨리.{0,4}(만들|생성)/,
        /이제.{0,4}(만들|생성|시작)/,
      ];
      const isGenerateRequest = generatePatterns.some((pat) =>
        pat.test(text)
      );

      if (isGenerateRequest && turnCount >= 4) {
        // 최소 4턴 이상이면 즉시 생성 가능
        const success = await sendMessageStreaming(text, true);
        // 스트리밍 성공 시에만 생성 요청
        if (success) {
          generateTimerRef.current = setTimeout(
            () => onRequestGenerate(),
            500
          );
        }
        return;
      }

      await sendMessageStreaming(text);
    },
    [sendMessageStreaming, turnCount, onRequestGenerate]
  );

  // 웰컴 메시지 개인화
  const ageLabel: Record<string, string> = {
    infant: "영아반 친구들", toddler: "유아반 아이들",
    kindergarten: "유치반 친구들", mixed: "우리 반 아이들",
  };
  const ageText = ageLabel[onboarding?.ageGroup as string] || "아이들";

  const topicMention = onboarding?.topic && onboarding.topic !== "_custom"
    ? `'${onboarding.topic}' 이야기를 함께 만들어볼게요.`
    : `${ageText}을 위한 특별한 동화를 함께 만들어볼게요.`;

  const TOPIC_CHIPS: Record<string, string[]> = {
    "양치": ["양치를 싫어하는 토끼 이야기로 시작해주세요", "양치 시간이 즐거워지는 동화 만들어주세요"],
    "편식": ["채소를 안 먹는 곰돌이 이야기는 어때요?", "편식쟁이가 달라지는 동화 만들어주세요"],
    "화 조절": ["화가 나면 참지 못하는 아이 이야기요", "감정을 다스리는 법을 알려주는 동화요"],
    "분리불안": ["엄마와 떨어지기 싫은 아기새 이야기요", "유치원이 즐거워지는 동화 만들어주세요"],
    "정리정돈": ["장난감 정리를 싫어하는 아이 이야기요", "정리하면 좋은 일이 생기는 동화요"],
    "거짓말": ["거짓말하는 아이의 이야기를 만들어주세요", "정직의 소중함을 알려주는 동화요"],
    "양보/공유": ["장난감을 나누지 않는 아이 이야기요", "함께하면 즐거운 동화 만들어주세요"],
  };
  const defaultChips = ["오늘 반에서 있었던 이야기로 시작할게요", "아이들에게 전하고 싶은 메시지가 있어요"];
  const chips = TOPIC_CHIPS[onboarding?.topic as string] || defaultChips;

  // 웰컴 → AI 첫 채팅 메시지 자동 추가 (v1.22.1)
  useEffect(() => {
    if (messages.length === 0 && !isLoading) {
      const greeting = `선생님, 반가워요! 🌿\n\n${topicMention}\n\n오늘 반에서 있었던 일이나 전하고 싶은 메시지를 편하게 이야기해주세요`;
      addSystemGreeting(greeting);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicMention]);

  // TeacherMessage → Message 변환 (기존 MessageBubble 호환)
  const adaptedMessages: Message[] = messages.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    phase: m.phase ? TEACHER_PHASE_TO_NUMBER[m.phase] : phaseNumber,
    isError: m.isError,
  }));

  return (
    <div className="relative flex flex-col h-[100dvh] max-h-[100dvh]">
      {/* 상단 바: 나가기 + Phase 인디케이터 */}
      <div className="flex-shrink-0 border-b border-brown-pale/15 bg-cream/50 backdrop-blur-sm
                       safe-top">
        <div className="flex items-center px-3 py-1.5">
          <button
            onClick={() => messages.length > 0 ? setShowExitDialog(true) : onExit()}
            className="p-1.5 -ml-1 text-brown-light active:scale-[0.9] transition-transform"
            aria-label="나가기"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div className="flex-1 flex justify-center">
            <TeacherPhaseIndicator currentPhase={currentPhase} />
          </div>
          <div className="w-8" />
        </div>
      </div>

      {/* 나가기 확인 다이얼로그 */}
      {showExitDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-cream rounded-2xl p-6 mx-6 max-w-sm w-full"
               style={{ boxShadow: "0 8px 32px rgba(90,62,43,0.15)" }}>
            <p className="text-[15px] text-brown font-medium text-center break-keep">
              대화를 나가시겠어요?
            </p>
            <p className="text-xs text-brown-light text-center mt-2 break-keep">
              대화는 자동 저장되어 홈에서 이어할 수 있어요
            </p>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowExitDialog(false)}
                className="flex-1 py-3 rounded-full text-sm font-medium text-brown-light
                           border border-brown-pale/30 active:scale-[0.97] transition-all"
              >
                계속하기
              </button>
              <button
                onClick={() => { setShowExitDialog(false); onExit(); }}
                className="flex-1 py-3 rounded-full text-white text-sm font-medium
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
        </div>
      )}

      {/* 메시지 영역 */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="relative flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {/* 빈 assistant 메시지 숨기기 — isLoading 중에만 (이중 로딩 방지) */}
        {adaptedMessages
          .filter(msg => !(msg.role === "assistant" && !msg.content.trim() && isLoading))
          .map((msg, idx) => (
          <MessageBubble
            key={msg.id || idx}
            message={msg}
            currentPhase={phaseNumber}
          />
        ))}

        {/* greeting 아래 빠른 시작 칩 버튼 */}
        {messages.length === 1 && messages[0].id?.startsWith("greeting") && !isLoading && (
          <div className="flex flex-wrap gap-2 px-1 mb-3">
            {chips.map((chip, i) => (
              <button
                key={i}
                onClick={() => handleSend(chip)}
                className="text-xs px-3 py-1.5 rounded-full bg-paper border border-brown-pale/15
                           text-brown-light active:scale-[0.96] transition-all"
              >
                💬 {chip}
              </button>
            ))}
          </div>
        )}

        {/* 타이핑 인디케이터 */}
        {isLoading && messages.length > 0 && (
          <TypingIndicator phase={phaseNumber} />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 새 메시지 플로팅 버튼 */}
      {showScrollDown && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-28 left-1/2 -translate-x-1/2 z-10
                     px-4 py-2 rounded-full text-xs font-medium text-white
                     active:scale-[0.95] transition-all animate-fade-in"
          style={{
            background: "linear-gradient(135deg, #E07A5F, #C96B52)",
            boxShadow: "0 4px 16px rgba(224,122,95,0.3)",
          }}
        >
          새 메시지 ↓
        </button>
      )}

      {/* 입력 영역 */}
      <div className="flex-shrink-0 border-t border-brown-pale/15 bg-cream/80 backdrop-blur-sm
                       pb-[env(safe-area-inset-bottom,0px)]">
        <ChatInput
          onSend={handleSend}
          isLoading={isLoading}
          phase={phaseNumber}
        />
      </div>
    </div>
  );
}
