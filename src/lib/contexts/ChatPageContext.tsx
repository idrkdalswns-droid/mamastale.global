"use client";

import { createContext, useContext } from "react";

/**
 * Cross-cutting state for the chat screen.
 * Eliminates prop drilling from page.tsx → ChatContainer → PhaseHeader/TurnFivePopup.
 */
export interface ChatPageContextValue {
  // Page-level callbacks (from page.tsx)
  onComplete: () => void;
  onGoHome: () => void;
  onTicketUsed?: () => void;

  // Page-level state (from page.tsx)
  freeTrialMode: boolean;
  ticketsRemaining: number | null;

  // Derived chat state (computed in ChatContainer)
  userMsgCount: number;
  freeTurnLimit: number;
  isGuest: boolean;
}

const ChatPageContext = createContext<ChatPageContextValue | null>(null);

export function ChatPageProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: ChatPageContextValue;
}) {
  return (
    <ChatPageContext.Provider value={value}>
      {children}
    </ChatPageContext.Provider>
  );
}

export function useChatPage() {
  const ctx = useContext(ChatPageContext);
  if (!ctx) {
    throw new Error("useChatPage must be used within ChatPageProvider");
  }
  return ctx;
}
