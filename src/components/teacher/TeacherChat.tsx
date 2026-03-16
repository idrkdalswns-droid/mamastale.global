"use client";

import { useRef, useEffect, useCallback } from "react";
import { useTeacherStore } from "@/lib/hooks/useTeacherStore";
import MessageBubble from "@/components/chat/MessageBubble";
import ChatInput from "@/components/chat/ChatInput";
import { TeacherPhaseIndicator } from "./TeacherPhaseIndicator";
import { TeacherTimer } from "./TeacherTimer";
import { TEACHER_PHASE_TO_NUMBER } from "@/lib/types/teacher";
import type { Message } from "@/lib/types/chat";

interface TeacherChatProps {
  onSessionExpired: () => void;
  onRequestGenerate: () => void;
}

export function TeacherChat({
  onSessionExpired,
  onRequestGenerate,
}: TeacherChatProps) {
  const {
    messages,
    currentPhase,
    turnCount,
    isLoading,
    expiresAt,
    sendMessageStreaming,
  } = useTeacherStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Phase 번호 매핑 (기존 MessageBubble/ChatInput 호환)
  const phaseNumber = TEACHER_PHASE_TO_NUMBER[currentPhase] || 1;

  const handleSend = useCallback(
    async (text: string) => {
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
        await sendMessageStreaming(text, true); // forceGenerate=true
        // 생성 요청은 상위에서 처리
        setTimeout(() => onRequestGenerate(), 500);
        return;
      }

      await sendMessageStreaming(text);
    },
    [sendMessageStreaming, turnCount, onRequestGenerate]
  );

  // TeacherMessage → Message 변환 (기존 MessageBubble 호환)
  const adaptedMessages: Message[] = messages.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    phase: m.phase ? TEACHER_PHASE_TO_NUMBER[m.phase] : phaseNumber,
    isError: m.isError,
  }));

  return (
    <div className="flex flex-col h-[100dvh] max-h-[100dvh]">
      {/* 상단 바: Phase 인디케이터 + 타이머 */}
      <div className="flex-shrink-0 border-b border-brown-pale/15 bg-cream/50 backdrop-blur-sm
                       safe-top">
        <div className="flex items-center justify-between px-3 py-1.5">
          <TeacherPhaseIndicator currentPhase={currentPhase} />
          {expiresAt && (
            <TeacherTimer
              expiresAt={expiresAt}
              onExpired={onSessionExpired}
            />
          )}
        </div>
      </div>

      {/* 메시지 영역 */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
      >
        {/* 웰컴 메시지 (첫 메시지 없을 때) */}
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-3xl mb-3">📚</p>
            <p className="text-sm text-brown font-medium break-keep">
              안녕하세요, 선생님! 함께 동화를 만들어볼까요?
            </p>
            <p className="text-xs text-brown-light mt-1 break-keep">
              아이들에게 어떤 이야기가 필요한지 편하게 말씀해주세요
            </p>
          </div>
        )}

        {adaptedMessages.map((msg, idx) => (
          <MessageBubble
            key={msg.id || idx}
            message={msg}
            currentPhase={phaseNumber}
          />
        ))}

        {/* 타이핑 인디케이터 */}
        {isLoading &&
          messages.length > 0 &&
          messages[messages.length - 1].role === "user" && (
            <div className="flex items-center gap-1.5 px-4 py-2">
              <div
                className="w-2 h-2 rounded-full animate-bounce"
                style={{
                  backgroundColor: "#8B6F55",
                  animationDelay: "0ms",
                }}
              />
              <div
                className="w-2 h-2 rounded-full animate-bounce"
                style={{
                  backgroundColor: "#8B6F55",
                  animationDelay: "150ms",
                }}
              />
              <div
                className="w-2 h-2 rounded-full animate-bounce"
                style={{
                  backgroundColor: "#8B6F55",
                  animationDelay: "300ms",
                }}
              />
            </div>
          )}

        <div ref={messagesEndRef} />
      </div>

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
