"use client";

import { useWorksheetStore } from "@/lib/hooks/useWorksheetStore";

export function CharacterSelectStep() {
  const { characterFocus, characterOptions, setCharacterFocus, goNext } = useWorksheetStore();

  const allOptions = [
    { name: "all", role: "모든 캐릭터" },
    ...characterOptions,
  ];

  const handleSelect = (name: string) => {
    setCharacterFocus(name);
    goNext();
  };

  return (
    <div>
      <h3 className="text-[17px] font-medium text-brown mb-2">
        어떤 캐릭터에 집중할까요?
      </h3>
      <p className="text-[13px] text-brown-light mb-4">
        선택한 캐릭터를 중심으로 활동지를 만들어요
      </p>

      <div className="space-y-3">
        {allOptions.map((opt) => (
          <label key={opt.name} className="block cursor-pointer">
            <input
              type="radio"
              name="character"
              value={opt.name}
              checked={characterFocus === opt.name}
              onChange={() => handleSelect(opt.name)}
              className="peer sr-only"
            />
            <div className="p-4 rounded-xl border-2 peer-checked:border-coral peer-checked:bg-coral/5 border-brown-pale/30 hover:border-brown-pale/60 transition-all active:scale-[0.98]">
              <span className="text-[15px] font-medium text-brown">{opt.name === "all" ? "🌟 모든 캐릭터" : opt.name}</span>
              {opt.role && opt.name !== "all" && (
                <span className="text-[12px] text-brown-light ml-2">({opt.role})</span>
              )}
            </div>
          </label>
        ))}

        {characterOptions.length === 0 && (
          <p className="text-[13px] text-brown-pale text-center py-4">
            캐릭터 정보를 불러오고 있어요...
          </p>
        )}
      </div>
    </div>
  );
}
