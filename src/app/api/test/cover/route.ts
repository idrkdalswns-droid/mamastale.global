/**
 * 테스트 전용: 동화 저장 + Gemini 표지 자동 생성 E2E 시뮬레이션
 * dev 환경에서만 동작, production에서는 404 반환
 * 테스트 완료 후 이 파일/디렉토리 삭제
 */

export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { generateCoverImage } from "@/lib/illustration/generate";
import { uploadCoverToStorage } from "@/lib/illustration/upload";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";
import type { Scene } from "@/lib/types/story";

const MOCK_SCENES: Scene[] = [
  {
    sceneNumber: 1,
    title: "숲 속의 작은 집",
    text: "깊은 숲 속에 작은 집이 하나 있었어요. 나무 사이로 햇살이 비추면 지붕이 반짝였어요.",
    imagePrompt:
      "A small cozy cottage nestled deep in a lush green forest, morning sunlight filtering through tall trees, a winding path leading to the front door, wildflowers blooming around the cottage",
  },
  {
    sceneNumber: 2,
    title: "엄마와 아이",
    text: "그 집에는 엄마와 작은 아이가 살고 있었어요. 아이는 엄마의 손을 꼭 잡고 있었어요.",
    imagePrompt:
      "A gentle mother holding her young child's hand, standing in front of a warm cottage doorway, soft golden light surrounding them",
  },
  {
    sceneNumber: 3,
    title: "짙은 안개",
    text: "어느 날 짙은 안개가 숲을 덮었어요. 앞이 하나도 보이지 않았어요.",
  },
  {
    sceneNumber: 4,
    title: "길을 잃다",
    text: "엄마는 익숙한 길도 찾을 수 없었어요. 마음이 무거워졌어요.",
  },
  {
    sceneNumber: 5,
    title: "작은 빛",
    text: "그때 작은 반딧불이 하나가 나타났어요. 깜빡깜빡 빛나고 있었어요.",
  },
  {
    sceneNumber: 6,
    title: "함께 걷기",
    text: "반딧불이를 따라 천천히 걸었어요. 아이가 말했어요. '엄마, 저기 빛이 보여!'",
  },
  {
    sceneNumber: 7,
    title: "안개가 걷히다",
    text: "조금씩 안개가 걷히기 시작했어요. 나무 사이로 하늘이 보였어요.",
  },
  {
    sceneNumber: 8,
    title: "다시 찾은 길",
    text: "드디어 집으로 돌아가는 길이 보였어요. 반딧불이가 환하게 빛났어요.",
  },
  {
    sceneNumber: 9,
    title: "따뜻한 포옹",
    text: "엄마와 아이는 따뜻하게 안았어요. '우리 함께여서 길을 찾았어.'",
  },
  {
    sceneNumber: 10,
    title: "새로운 아침",
    text: "다음 날, 햇살이 환하게 비추었어요. 안개 속에서 피어난 꽃들이 아름답게 빛나고 있었어요.",
  },
];

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const startTime = Date.now();

  // Step 1: 인증 확인
  const sb = createApiSupabaseClient(request);
  if (!sb) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const { data: { user } } = await sb.client.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인 후 테스트해주세요" }, { status: 401 });
  }

  console.log("[Test/Cover] E2E test for user:", user.id.slice(0, 8));

  // Step 2: Gemini 표지 생성
  console.log("[Test/Cover] Step 2: Generating cover with Gemini...");
  const result = await generateCoverImage(MOCK_SCENES, "숲 속의 작은 빛");
  if (!result) {
    return NextResponse.json({ error: "Gemini 표지 생성 실패 — 콘솔 로그 확인" }, { status: 500 });
  }

  console.log("[Test/Cover] Cover generated:", result.mimeType, result.base64.length, "bytes");

  // Step 3: DB에 동화 저장
  console.log("[Test/Cover] Step 3: Saving story to DB...");
  const { data: storyData, error: insertErr } = await sb.client
    .from("stories")
    .insert({
      user_id: user.id,
      title: "숲 속의 작은 빛",
      scenes: MOCK_SCENES,
      status: "completed",
      is_unlocked: true,
      metadata: { test: true },
    })
    .select("id")
    .single();

  if (insertErr || !storyData) {
    console.error("[Test/Cover] DB insert failed:", insertErr?.message);
    return NextResponse.json({ error: "동화 저장 실패: " + (insertErr?.message || "unknown") }, { status: 500 });
  }

  const storyId = storyData.id;
  console.log("[Test/Cover] Story saved:", storyId);

  // Step 4: Storage 업로드 (실제 storyId로)
  console.log("[Test/Cover] Step 4: Uploading to Supabase Storage...");
  const publicUrl = await uploadCoverToStorage(result.base64, result.mimeType, storyId);
  if (!publicUrl) {
    return NextResponse.json({
      error: "업로드 실패 — illustrations 버킷 확인",
      storyId,
      storyCreated: true,
    }, { status: 500 });
  }

  // Step 5: DB에 cover_image 업데이트
  console.log("[Test/Cover] Step 5: Updating cover_image in DB...");
  const { error: updateErr } = await sb.client
    .from("stories")
    .update({ cover_image: publicUrl })
    .eq("id", storyId);

  if (updateErr) {
    console.error("[Test/Cover] Cover update failed:", updateErr.message);
  }

  const elapsed = Date.now() - startTime;
  console.log("[Test/Cover] E2E complete!", publicUrl, "in", elapsed, "ms");

  return sb.applyCookies(NextResponse.json({
    success: true,
    storyId,
    coverUrl: publicUrl,
    elapsed_ms: elapsed,
    message: "서재(/library)에서 확인하세요!",
  }));
}

// GET: 상태 확인
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    status: "ready",
    geminiKeySet: !!process.env.GEMINI_API_KEY,
    supabaseUrlSet: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceKeySet: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}
