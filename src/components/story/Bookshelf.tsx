"use client";

import { BookSpine, EmptySlot } from "./BookSpine";
import type { Scene } from "@/lib/types/story";

const SLOTS_PER_SHELF = 7;

interface ShelfStory {
  id: string;
  title: string;
  scenes: Scene[];
  created_at: string;
}

interface BookshelfProps {
  stories: ShelfStory[];
  /** If true, this is the last shelf and empty slots + CTA are shown */
  showEmptySlots?: boolean;
  /** Global color offset so multi-shelf colors continue cycling */
  colorOffset?: number;
}

function ShelfPlank() {
  return (
    <div className="shelf-plank" aria-hidden="true">
      <div className="shelf-plank-grain" />
    </div>
  );
}

export function Bookshelf({ stories, showEmptySlots = true, colorOffset = 0 }: BookshelfProps) {
  const totalStories = stories.length;
  const isEmpty = totalStories === 0;

  // Build 7 slots: fill with stories, then empties
  const slots: Array<{ type: "book"; story: ShelfStory; colorIndex: number } | { type: "empty" } | { type: "cta" }> = [];

  for (let i = 0; i < SLOTS_PER_SHELF; i++) {
    if (i < totalStories) {
      slots.push({ type: "book", story: stories[i], colorIndex: colorOffset + i });
    } else if (showEmptySlots) {
      // First empty slot after books = CTA, rest are ghosts
      const hasCTA = slots.some((s) => s.type === "cta");
      slots.push(hasCTA ? { type: "empty" } : { type: "cta" });
    }
  }

  // Split into rows: top 4, bottom 3
  const topRow = slots.slice(0, 4);
  const bottomRow = slots.slice(4);

  return (
    <div
      className="rounded-xl px-3 pt-4 pb-1"
      style={{
        background: "linear-gradient(180deg, rgba(196,149,106,0.04) 0%, rgba(196,149,106,0.08) 100%)",
        border: "1px solid rgba(196,149,106,0.06)",
      }}
    >
      {/* Top row — 4 slots */}
      {topRow.length > 0 && (
        <>
          <div className="flex items-end justify-center gap-2.5 pb-1">
            {topRow.map((slot, i) => (
              <div key={`top-${i}`} className="animate-book-entry" style={{ animationDelay: `${i * 60}ms` }}>
                {slot.type === "book" ? (
                  <BookSpine story={slot.story} colorIndex={slot.colorIndex} />
                ) : slot.type === "cta" ? (
                  <EmptySlot isCTA isEmpty={isEmpty} />
                ) : (
                  <EmptySlot />
                )}
              </div>
            ))}
          </div>
          <ShelfPlank />
        </>
      )}

      {/* Bottom row — 3 slots */}
      {bottomRow.length > 0 && (
        <>
          <div className="flex items-end justify-center gap-2.5 pb-1 mt-4">
            {bottomRow.map((slot, i) => (
              <div key={`bot-${i}`} className="animate-book-entry" style={{ animationDelay: `${(i + 4) * 60}ms` }}>
                {slot.type === "book" ? (
                  <BookSpine story={slot.story} colorIndex={slot.colorIndex} />
                ) : slot.type === "cta" ? (
                  <EmptySlot isCTA isEmpty={isEmpty} />
                ) : (
                  <EmptySlot />
                )}
              </div>
            ))}
          </div>
          <ShelfPlank />
        </>
      )}

      {/* Empty bookshelf message */}
      {isEmpty && (
        <p className="font-serif text-xs text-brown-pale font-light text-center mt-3 mb-2">
          책장을 채워 보세요
        </p>
      )}
    </div>
  );
}

/** Splits stories into chunks of 7 and renders multiple shelves */
export function BookshelfGrid({ stories }: { stories: ShelfStory[] }) {
  if (stories.length === 0) {
    return <Bookshelf stories={[]} showEmptySlots />;
  }

  const shelves: ShelfStory[][] = [];
  for (let i = 0; i < stories.length; i += SLOTS_PER_SHELF) {
    shelves.push(stories.slice(i, i + SLOTS_PER_SHELF));
  }

  return (
    <div className="space-y-6">
      {shelves.map((shelfStories, idx) => (
        <Bookshelf
          key={idx}
          stories={shelfStories}
          showEmptySlots={idx === shelves.length - 1} // Only last shelf shows empty slots
          colorOffset={idx * SLOTS_PER_SHELF}
        />
      ))}
    </div>
  );
}
