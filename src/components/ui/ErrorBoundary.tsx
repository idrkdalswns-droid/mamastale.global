"use client";

import React, { Component, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  /** Show full-screen fallback UI (min-h-dvh) instead of inline */
  fullScreen?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

// FI-6: ErrorBoundary to gracefully catch rendering errors in chat/story flow
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error.message || "Unknown error" };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error.message, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const containerClass = this.props.fullScreen
        ? "min-h-dvh bg-cream flex flex-col items-center justify-center px-8 text-center font-sans"
        : "flex flex-col items-center justify-center min-h-[300px] p-6 text-center font-sans";

      return (
        <div className={containerClass}>
          <div className="text-4xl mb-4">🌿</div>
          <h2 className="font-serif text-lg font-bold text-brown mb-2">
            일시적인 오류가 발생했어요
          </h2>
          <p className="text-sm text-brown-light font-light leading-relaxed mb-6 break-keep">
            예상치 못한 문제가 생겼어요.<br />
            아래 버튼으로 다시 시도해 주세요.
          </p>
          <div className="flex flex-col gap-2.5 w-full max-w-[240px]">
            <button
              onClick={() => this.setState({ hasError: false, errorMessage: "" })}
              className="w-full py-3 rounded-full text-sm font-medium text-white transition-all active:scale-[0.97]"
              style={{
                background: "linear-gradient(135deg, #E07A5F, #C96B52)",
                boxShadow: "0 6px 20px rgba(224,122,95,0.3)",
              }}
            >
              다시 시도
            </button>
            <a
              href="/"
              className="w-full py-2.5 rounded-full text-xs font-light text-brown-pale text-center transition-all"
              style={{ border: "1px solid rgba(196,149,106,0.2)" }}
            >
              홈으로 돌아가기
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
