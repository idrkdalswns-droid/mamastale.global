"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Scroll to top on client-side route changes */
export function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
