import type { Scene } from "@/lib/types/story";

/**
 * Parse 10-scene fairy tale from Phase 4 AI responses.
 * Expects scenes in format like:
 *   [장면 1] or 장면 1: or **장면 1**
 *   Text content...
 *   [Image Prompt: English description]
 */
export function parseStoryScenes(allPhase4Text: string): Scene[] {
  const scenes: Scene[] = [];

  // Match scene blocks: [장면 N], 장면 N:, **장면 N**, etc.
  const scenePattern = /(?:\[장면\s*(\d+)\]|\*?\*?장면\s*(\d+)\*?\*?[:\s])/g;
  const matches = [...allPhase4Text.matchAll(scenePattern)];

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const sceneNum = parseInt(match[1] || match[2]);
    const startIdx = match.index! + match[0].length;
    const endIdx = i < matches.length - 1 ? matches[i + 1].index! : allPhase4Text.length;

    let block = allPhase4Text.slice(startIdx, endIdx).trim();

    // Extract image prompt if present
    let imagePrompt: string | undefined;
    const imgMatch = block.match(/\[Image Prompt:\s*(.*?)\]/i);
    if (imgMatch) {
      imagePrompt = imgMatch[1].trim();
      block = block.replace(imgMatch[0], "").trim();
    }

    // Determine structural title
    const titles: Record<number, string> = {
      1: "도입 1",
      2: "도입 2",
      3: "갈등 1",
      4: "갈등 2",
      5: "시도 1",
      6: "시도 2",
      7: "해결 1",
      8: "해결 2",
      9: "교훈 1",
      10: "교훈 2",
    };

    // Validate sceneNumber is within expected range (1-10)
    if (sceneNum >= 1 && sceneNum <= 10 && !scenes.some((s) => s.sceneNumber === sceneNum)) {
      scenes.push({
        sceneNumber: sceneNum,
        title: titles[sceneNum] || `장면 ${sceneNum}`,
        text: block,
        imagePrompt,
      });
    }
  }

  // Sort by sceneNumber to ensure correct order
  scenes.sort((a, b) => a.sceneNumber - b.sceneNumber);

  return scenes;
}

/**
 * Combine all Phase 4 assistant messages into a single text for parsing
 */
export function combinePhase4Messages(
  messages: { role: string; content: string; phase?: number }[]
): string {
  return messages
    .filter((m) => m.role === "assistant" && m.phase === 4)
    .map((m) => m.content)
    .join("\n\n");
}
