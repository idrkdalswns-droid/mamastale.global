"use client";

import { useEffect, useRef, useCallback, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface FocusTrapModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  /** aria-label for the dialog */
  label?: string;
  /** Additional className for the content wrapper */
  className?: string;
  /** Override dialog role (e.g. "alertdialog" for destructive confirmations) */
  role?: "dialog" | "alertdialog";
  /** Additional className for the overlay wrapper */
  overlayClassName?: string;
}

/**
 * C5: Reusable modal with focus trap, Escape key, aria-modal.
 * Uses aria-hidden on #main-content instead of `inert` (카카오 인앱 브라우저 호환).
 */
export function FocusTrapModal({ isOpen, onClose, children, label, className, role = "dialog", overlayClassName }: FocusTrapModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Trap focus within modal
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key !== "Tab") return;

      const modal = modalRef.current;
      if (!modal) return;

      const focusable = modal.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return;

    // Save current focus
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Hide background from assistive tech
    const main = document.getElementById("main-content");
    if (main) main.setAttribute("aria-hidden", "true");

    // Add keydown listener
    document.addEventListener("keydown", handleKeyDown);

    // Focus first focusable element
    requestAnimationFrame(() => {
      const modal = modalRef.current;
      if (!modal) return;
      const first = modal.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      first?.focus();
    });

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (main) main.removeAttribute("aria-hidden");
      // Restore previous focus
      previousFocusRef.current?.focus();
    };
  }, [isOpen, handleKeyDown]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={overlayClassName || "fixed inset-0 z-[200] flex items-center justify-center"}
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
          role={role}
          aria-modal="true"
          aria-label={label}
          ref={modalRef}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={className}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
