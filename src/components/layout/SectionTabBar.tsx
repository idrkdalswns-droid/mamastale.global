"use client";

import { useEffect, useRef, useState } from "react";

interface Section {
  id: string;
  label: string;
}

interface SectionTabBarProps {
  sections: Section[];
  /** Tailwind top class, e.g. "top-0" or "top-12" */
  stickyTop?: string;
  /** Total sticky header height in px for scroll offset compensation */
  scrollOffset?: number;
}

export default function SectionTabBar({
  sections,
  stickyTop = "top-0",
  scrollOffset = 34,
}: SectionTabBarProps) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");
  const barRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // ---------- IntersectionObserver → active tab tracking ----------
  useEffect(() => {
    const els = sections
      .map((s) => document.getElementById(s.id))
      .filter(Boolean) as HTMLElement[];

    if (els.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the first intersecting entry from top
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: `-${scrollOffset}px 0px -50% 0px`,
        threshold: 0,
      },
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections, scrollOffset]);

  // ---------- Auto-center active tab in scrollable bar ----------
  useEffect(() => {
    const btn = tabRefs.current.get(activeId);
    if (btn && barRef.current) {
      btn.scrollIntoView({ inline: "center", behavior: "smooth", block: "nearest" });
    }
  }, [activeId]);

  // ---------- Tab click → smooth scroll to section ----------
  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - scrollOffset;
    window.scrollTo({ top: y, behavior: "smooth" });
    setActiveId(id);
  };

  return (
    <nav
      ref={barRef}
      className={`sticky ${stickyTop} z-30 flex h-[34px] items-center gap-0 overflow-x-auto scrollbar-hide border-b border-brown-pale/10`}
      style={{ backgroundColor: "rgb(var(--cream) / 0.92)", backdropFilter: "blur(12px)" }}
      aria-label="섹션 탐색"
    >
      {sections.map((s) => {
        const isActive = activeId === s.id;
        return (
          <button
            key={s.id}
            ref={(el) => {
              if (el) tabRefs.current.set(s.id, el);
            }}
            onClick={() => handleClick(s.id)}
            className={`relative shrink-0 px-3 py-1 text-[11px] transition-colors duration-200 ${
              isActive ? "font-medium text-coral" : "text-brown-pale"
            }`}
            aria-current={isActive ? "true" : undefined}
          >
            {s.label}
            {/* Active indicator bar */}
            <span
              className={`absolute bottom-0 left-1/2 h-[2px] -translate-x-1/2 rounded-full bg-coral transition-all duration-300 ${
                isActive ? "w-4/5" : "w-0"
              }`}
            />
          </button>
        );
      })}
    </nav>
  );
}
