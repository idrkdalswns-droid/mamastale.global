import { NextRequest, NextResponse } from "next/server";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";

export const runtime = "edge";

// JP-05: Rate limiting for export endpoint
const exportRateMap = new Map<string, { count: number; resetAt: number }>();
function checkExportRateLimit(userId: string): boolean {
  const now = Date.now();
  if (exportRateMap.size > 100) {
    for (const [k, v] of exportRateMap) { if (now > v.resetAt) exportRateMap.delete(k); }
  }
  const entry = exportRateMap.get(userId);
  if (!entry || now > entry.resetAt) {
    exportRateMap.set(userId, { count: 1, resetAt: now + 3_600_000 }); // 1 hour window
    return true;
  }
  if (entry.count >= 3) return false; // 3 exports per hour
  entry.count++;
  return true;
}

// GDPR Art. 20: Right to Data Portability
export async function GET(request: NextRequest) {
  const sb = createApiSupabaseClient(request);
  if (!sb) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }

  // CTO-FIX: Bearer token fallback for mobile/WebView compatibility
  let user = (await sb.client.auth.getUser()).data.user;
  if (!user) {
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const { data: tokenData } = await sb.client.auth.getUser(authHeader.slice(7));
      user = tokenData.user;
    }
  }
  if (!user) {
    return sb.applyCookies(NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }));
  }

  // JP-05: Rate limit exports
  if (!checkExportRateLimit(user.id)) {
    return sb.applyCookies(NextResponse.json({ error: "데이터 내보내기는 1시간에 3회까지 가능합니다." }, { status: 429 }));
  }

  const userId = user.id;

  try {
    // KR-17: Limit export query results to prevent oversized responses
    // R2-FIX(C1): Include all user data tables for complete GDPR Art.20 compliance
    const safeQuery = async (table: string, select: string, col: string) => {
      try {
        const { data } = await sb.client.from(table).select(select).eq(col, userId).limit(500);
        return data || [];
      } catch { return []; }
    };

    const [profileRes, storiesRes, commentsRes, feedbackData, subsData, likesData, reviewsData] = await Promise.all([
      sb.client.from("profiles").select("*").eq("id", userId).single(),
      sb.client.from("stories").select("id, title, scenes, metadata, status, created_at").eq("user_id", userId).limit(100),
      sb.client.from("comments").select("id, content, author_alias, story_id, created_at").eq("user_id", userId).limit(500),
      safeQuery("feedback", "id, empathy_rating, insight_rating, overall_rating, free_text, created_at", "user_id"),
      safeQuery("subscriptions", "id, plan, status, created_at", "user_id"),
      safeQuery("likes", "id, story_id, created_at", "user_id"),
      safeQuery("user_reviews", "id, author_alias, stars, content, created_at", "user_id"),
    ]);

    const exportData = {
      exportDate: new Date().toISOString(),
      format: "GDPR Art. 20 Data Export",
      account: {
        email: user.email,
        name: user.user_metadata?.name,
        createdAt: user.created_at,
      },
      profile: profileRes.data,
      stories: storiesRes.data || [],
      comments: commentsRes.data || [],
      feedback: feedbackData,
      subscriptions: subsData,
      likes: likesData,
      reviews: reviewsData,
    };

    const dateStr = new Date().toISOString().split("T")[0];

    return sb.applyCookies(
      new NextResponse(JSON.stringify(exportData, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="mamastale-data-export-${dateStr}.json"`,
        },
      })
    );
  } catch (e) {
    console.error("[Account] Export error:", e instanceof Error ? e.name : "Unknown");
    return sb.applyCookies(NextResponse.json({ error: "데이터 내보내기에 실패했습니다." }, { status: 500 }));
  }
}
