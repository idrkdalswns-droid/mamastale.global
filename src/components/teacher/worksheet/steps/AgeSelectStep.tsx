"use client";

import { useWorksheetStore } from "@/lib/hooks/useWorksheetStore";
import type { AgeGroup } from "@/lib/worksheet/types";

const AGE_OPTIONS: { value: AgeGroup; label: string; emoji: string }[] = [
  { value: "age_3", label: "만 3세", emoji: "👶" },
  { value: "age_4", label: "만 4세", emoji: "🧒" },
  { value: "age_5", label: "만 5세", emoji: "👦" },
  { value: "mixed", label: "혼합반 (3~5세)", emoji: "👨‍👩‍👧" },
];

export function AgeSelectStep() {
  const { ageGroup, setAgeGroup, goNext } = useWorksheetStore();

  const handleSelect = (age: AgeGroup) => {
    setAgeGroup(age);
    goNext();
  };

  return (
    <div>
      <h3 className="text-[17px] font-medium text-brown mb-2">
        우리 반 아이들은 몇 살인가요?
      </h3>
      <p className="text-[13px] text-brown-light mb-4">
        연령에 맞게 활동지를 맞춤 제작해요
      </p>

      <div className="space-y-3">
        {AGE_OPTIONS.map((opt) => (
          <label key={opt.value} className="block cursor-pointer">
            <input
              type="radio"
              name="age"
              value={opt.value}
              checked={ageGroup === opt.value}
              onChange={() => handleSelect(opt.value)}
              className="peer sr-only"
            />
            <div className="p-4 rounded-xl border-2 peer-checked:border-coral peer-checked:bg-coral/5 border-brown-pale/30 hover:border-brown-pale/60 transition-all active:scale-[0.98] flex items-center gap-3">
              <span className="text-2xl">{opt.emoji}</span>
              <span className="text-[15px] font-medium text-brown">{opt.label}</span>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
