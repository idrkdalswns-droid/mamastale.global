/**
 * Gemini 이미지 생성 (Edge Runtime 호환)
 * Buffer/sharp 미사용 — fetch + Uint8Array 전용
 */

import type { Scene } from "@/lib/types/story";
import { buildCoverPrompt } from "./prompt-engine";

const GEMINI_MODEL = "gemini-2.5-flash-preview-image-generation";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const TIMEOUT_MS = 20_000;
const MAX_BASE64_SIZE = 5 * 1024 * 1024; // 5MB

interface GenerateResult {
  base64: string;
  mimeType: string;
}

export async function generateCoverImage(
  scenes: Scene[],
  title: string,
): Promise<GenerateResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("[Illustration] GEMINI_API_KEY not set, skipping cover generation");
    return null;
  }

  const prompt = buildCoverPrompt(scenes);

  // 첫 시도
  let result = await callGemini(apiKey, prompt);

  // 429 rate limit → 3초 대기 후 1회 재시도
  if (result === "RATE_LIMITED") {
    console.warn("[Illustration] Rate limited, retrying in 3s...");
    await sleep(3000);
    result = await callGemini(apiKey, prompt);
  }

  if (!result || result === "RATE_LIMITED") {
    return null;
  }

  return result;
}

async function callGemini(
  apiKey: string,
  prompt: string,
): Promise<GenerateResult | "RATE_LIMITED" | null> {
  try {
    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
          imageConfig: { aspectRatio: "3:4" },
        },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (response.status === 429) {
      console.error("[Illustration] GEMINI_QUOTA_EXCEEDED — status 429");
      return "RATE_LIMITED";
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => "unknown");
      console.error(`[Illustration] Gemini API error ${response.status}:`, errText);
      return null;
    }

    const data = await response.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find(
      (p: { inlineData?: { mimeType: string; data: string } }) =>
        p.inlineData?.mimeType?.startsWith("image/"),
    );

    if (!imagePart?.inlineData?.data) {
      console.error("[Illustration] Safety filter blocked or no image in response");
      return null;
    }

    const { data: base64, mimeType } = imagePart.inlineData;

    // 크기 체크
    if (base64.length > MAX_BASE64_SIZE) {
      console.error("[Illustration] Image too large:", base64.length, "bytes");
      return null;
    }

    return { base64, mimeType };
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      console.error("[Illustration] Gemini timeout after", TIMEOUT_MS, "ms");
    } else {
      console.error("[Illustration] Gemini call failed:", err);
    }
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
