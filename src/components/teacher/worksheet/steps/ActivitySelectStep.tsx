"use client";

import { useWorksheetStore } from "@/lib/hooks/useWorksheetStore";
import { ACTIVITY_META } from "@/lib/worksheet/types";

export function ActivitySelectStep() {
  const { activityType, setActivityType, goNext } = useWorksheetStore();

  const handleSelect = (type: string) => {
    setActivityType(type as typeof activityType & string);
    goNext();
  };

  return (
    <div>
      <h3 className="text-[17px] font-medium text-brown mb-2">어떤 활동지를 만들까요?</h3>
      <p className="text-[13px] text-brown-light mb-4">동화에 맞는 활동지를 골라주세요</p>

      <div className="space-y-3">
        {ACTIVITY_META.map((meta) => (
          <label key={meta.type} className="block cursor-pointer">
            <input
              type="radio"
              name="activity"
              value={meta.type}
              checked={activityType === meta.type}
              onChange={() => handleSelect(meta.type)}
              className="peer sr-only"
              disabled={!meta.available}
            />
            <div className={`
              p-4 rounded-xl border-2 transition-all active:scale-[0.98]
              ${meta.available
                ? "peer-checked:border-coral peer-checked:bg-coral/5 border-brown-pale/30 hover:border-brown-pale/60"
                : "border-brown-pale/15 opacity-50 cursor-not-allowed"
              }
            `}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[15px] font-medium text-brown">{meta.name}</span>
                  {!meta.available && (
                    <span className="ml-2 text-[11px] text-brown-pale bg-brown-pale/10 px-2 py-0.5 rounded-full">
                      곧 출시
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-brown-pale">{meta.nuri_domain}</span>
              </div>
              <p className="text-[13px] text-brown-light mt-1">{meta.description}</p>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
