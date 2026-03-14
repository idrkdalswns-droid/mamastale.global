"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const KAKAO_CHANNEL_URL = "https://open.kakao.com/o/gSSkFmii";

const NAV_ITEMS_PUBLIC = [
  { href: "/about", label: "소개" },
  { href: "/diy", label: "DIY 동화" },
  { href: "/pricing", label: "구매" },
];

const NAV_ITEMS_AUTH = [
  { href: "/about", label: "소개" },
  { href: "/diy", label: "DIY 동화" },
  { href: "/library", label: "서재" },
  { href: "/community", label: "커뮤니티" },
  { href: "/pricing", label: "구매" },
];

/**
 * Global navigation bar — shown on all pages except home (/) and auth callback.
 * Home page has its own SPA navigation.
 */
export function GlobalNav() {
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();

  // Hide on home page (SPA with its own nav) and auth callback
  if (pathname === "/" || pathname === "/auth/callback") return null;

  return (
    <nav
      aria-label="메인 내비게이션"
      className="sticky top-0 z-40 backdrop-blur-lg border-b border-brown-pale/10 transition-shadow"
      style={{ background: "rgb(var(--cream) / 0.85)" }}
    >
      <div className="flex items-center justify-between h-12 px-4">
        {/* Left: Logo + theme */}
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="font-serif text-base font-bold text-brown no-underline"
          >
            mamastale
          </Link>
          <ThemeToggle />
        </div>

        {/* Right: Nav links + auth */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {(user ? NAV_ITEMS_AUTH : NAV_ITEMS_PUBLIC).map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                // R9-FIX: aria-current="page" for screen readers (WCAG 2.4.8)
                aria-current={isActive ? "page" : undefined}
                className={`text-[11px] whitespace-nowrap no-underline transition-colors min-h-[44px] justify-center px-1 sm:px-2 flex items-center ${
                  isActive
                    ? "text-coral font-medium"
                    : "text-brown-mid font-light"
                }`}
              >
                {item.label}
              </Link>
            );
          })}

          {/* 고객센터 */}
          <a
            href={KAKAO_CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="카카오톡 고객센터"
            className="text-brown-mid min-h-[44px] flex items-center px-1"
            title="카카오톡 문의"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2C6.48 2 2 5.83 2 10.5c0 2.95 1.95 5.54 4.88 7.01l-1.01 3.74c-.08.3.26.54.52.37l4.43-2.95c.38.04.78.08 1.18.08 5.52 0 10-3.83 10-8.25S17.52 2 12 2z" />
            </svg>
          </a>

          {!loading &&
            (user ? (
              <button
                onClick={() => signOut()}
                className="text-[11px] whitespace-nowrap text-brown-pale font-light min-h-[44px] flex items-center"
              >
                로그아웃
              </button>
            ) : (
              <Link
                href="/login"
                className="text-[11px] whitespace-nowrap text-white font-medium no-underline px-2 sm:px-2.5 py-1 rounded-full min-h-[44px] flex items-center"
                style={{
                  background: "linear-gradient(135deg, #E07A5F, #C96B52)",
                }}
              >
                로그인
              </Link>
            ))}
        </div>
      </div>
    </nav>
  );
}
