/**
 * Supabase Storage 업로드 (Edge Runtime 호환)
 * illustrations 버킷에 표지 이미지 업로드
 */

import { createClient } from "@supabase/supabase-js";

const BUCKET = "illustrations";

export async function uploadCoverToStorage(
  base64Data: string,
  mimeType: string,
  storyId: string,
): Promise<string | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error("[Illustration] Supabase credentials not configured");
    return null;
  }

  try {
    // base64 → Uint8Array (Edge 호환, Buffer 미사용)
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // 확장자 추출
    const ext = mimeType === "image/png" ? "png" : "jpeg";
    const filePath = `covers/${storyId}.${ext}`;

    // Service role 클라이언트 (INSERT 권한)
    const supabase = createClient(supabaseUrl, serviceKey);

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, bytes, {
        contentType: mimeType,
        upsert: true,
      });

    if (error) {
      console.error("[Illustration] Upload failed:", error.message);
      return null;
    }

    // Public URL 반환
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${filePath}`;
    return publicUrl;
  } catch (err) {
    console.error("[Illustration] Upload error:", err);
    return null;
  }
}
