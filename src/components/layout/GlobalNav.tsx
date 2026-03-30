"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";

import { NAV_ITEMS_PUBLIC, NAV_ITEMS_AUTH } from "@/lib/constants/nav";

/**
 * Global navigation bar — shown on all pages except home (/) and auth callback.
 * Home page has its own SPA navigation.
 */
export function GlobalNav() {
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();

  // Hide on home page (SPA with its own nav), auth callback, and teacher mode
  if (pathname === "/" || pathname === "/auth/callback" || pathname.startsWith("/teacher") || pathname.startsWith("/dalkkak")) return null;

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
                className={`text-xs whitespace-nowrap no-underline transition-colors min-h-[44px] justify-center px-1 sm:px-2 flex items-center ${
                  isActive
                    ? "text-coral font-medium"
                    : "text-brown-mid font-light"
                }`}
              >
                {item.label}
              </Link>
            );
          })}

          {!loading &&
            (user ? (
              <button
                onClick={() => signOut()}
                className="text-xs whitespace-nowrap text-brown-pale font-light min-h-[44px] flex items-center"
              >
                로그아웃
              </button>
            ) : (
              <Link
                href="/login"
                className="text-xs whitespace-nowrap text-white font-medium no-underline px-2 sm:px-2.5 py-1 rounded-full min-h-[44px] flex items-center"
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
