"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CoverPicker } from "@/components/story/CoverPicker";
import { authFetchOnce } from "@/lib/utils/auth-fetch";
import { tc } from "@/lib/i18n/client";

interface CoverPickerModalProps {
  isOpen: boolean;
  storyId: string;
  storyTitle: string;
  authorName?: string;
  onCoverChange: (coverPath: string) => void;
  onClose: () => void;
}

/**
 * Full-screen modal wrapper around CoverPicker.
 * Handles the PATCH API call to persist the cover image selection.
 */
export function CoverPickerModal({
  isOpen,
  storyId,
  storyTitle,
  authorName,
  onCoverChange,
  onClose,
}: CoverPickerModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSelect = useCallback(
    async (coverPath: string) => {
      setSaving(true);
      setError("");
      try {
        const res = await authFetchOnce(`/api/stories/${storyId}`, {
          method: "PATCH",
          body: JSON.stringify({ coverImage: coverPath }),
        });

        if (!res.ok) {
          setError(tc("UI.common.coverSaveFailedShort"));
          setSaving(false);
          return;
        }

        onCoverChange(coverPath);
        onClose();
      } catch {
        setError(tc("UI.common.coverSaveFailedShort"));
      } finally {
        setSaving(false);
      }
    },
    [storyId, onCoverChange, onClose],
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[100]"
        >
          {/* The CoverPicker already has min-h-dvh bg-cream, so it fills the screen */}
          <CoverPicker
            storyTitle={storyTitle}
            authorName={authorName}
            onSelect={handleSelect}
            onSkip={onClose}
          />

          {/* Error toast */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="fixed bottom-8 left-1/2 -translate-x-1/2 px-5 py-3 rounded-full text-[13px] font-medium text-white z-[110]"
                style={{ background: "rgba(224,122,95,0.95)" }}
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Saving overlay */}
          {saving && (
            <div className="fixed inset-0 bg-black/10 z-[105] flex items-center justify-center">
              <div className="bg-paper/90 backdrop-blur-xl px-6 py-4 rounded-2xl text-sm text-brown font-medium">
                저장하는 중...
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
