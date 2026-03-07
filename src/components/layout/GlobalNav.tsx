"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const NAV_ITEMS = [
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
      className="sticky top-0 z-40 backdrop-blur-lg border-b border-brown-pale/10 transition-shadow"
      style={{ background: "rgba(251,245,236,0.85)" }}
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
        <div className="flex items-center gap-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-[11px] no-underline transition-colors min-h-[44px] flex items-center ${
                pathname === item.href
                  ? "text-coral font-medium"
                  : "text-brown-mid font-light"
              }`}
            >
              {item.label}
            </Link>
          ))}

          {!loading &&
            (user ? (
              <button
                onClick={() => signOut()}
                className="text-[11px] text-brown-pale font-light min-h-[44px] flex items-center"
              >
                로그아웃
              </button>
            ) : (
              <Link
                href="/login"
                className="text-[11px] text-white font-medium no-underline px-2.5 py-1 rounded-full min-h-[44px] flex items-center"
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
