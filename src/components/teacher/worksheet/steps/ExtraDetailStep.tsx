"use client";

import { useWorksheetStore } from "@/lib/hooks/useWorksheetStore";
import { getQuestionsForActivity } from "@/lib/worksheet/types";

export function ExtraDetailStep() {
  const { activityType, extraDetail, setExtraDetail, goNext } = useWorksheetStore();

  if (!activityType) return null;

  const questions = getQuestionsForActivity(activityType);
  const q5 = questions.find((q) => q.id === "extra_detail");
  if (!q5) return null;

  const handleSelect = (value: string) => {
    setExtraDetail(value);
    goNext();
  };

  return (
    <div>
      <h3 className="text-[17px] font-medium text-brown mb-2">{q5.label}</h3>

      <div className="space-y-3">
        {q5.options.map((opt) => (
          <label key={opt.value} className="block cursor-pointer">
            <input
              type="radio"
              name="extra_detail"
              value={opt.value}
              checked={extraDetail === opt.value}
              onChange={() => handleSelect(opt.value)}
              className="peer sr-only"
            />
            <div className="p-4 rounded-xl border-2 peer-checked:border-coral peer-checked:bg-coral/5 border-brown-pale/30 hover:border-brown-pale/60 transition-all active:scale-[0.98]">
              <span className="text-[15px] font-medium text-brown">{opt.label}</span>
              {opt.description && (
                <p className="text-[13px] text-brown-light mt-1">{opt.description}</p>
              )}
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
