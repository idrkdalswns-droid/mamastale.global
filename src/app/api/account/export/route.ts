import { NextRequest, NextResponse } from "next/server";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";
import { createInMemoryLimiter, RATE_KEYS } from "@/lib/utils/rate-limiter";
import { resolveUser } from "@/lib/supabase/resolve-user";

export const runtime = "edge";

const exportLimiter = createInMemoryLimiter(RATE_KEYS.ACCOUNT_EXPORT, { maxEntries: 100 });

// GDPR Art. 20: Right to Data Portability
export async function GET(request: NextRequest) {
  const sb = createApiSupabaseClient(request);
  if (!sb) {
    return NextResponse.json({ error: "시스템 설정 오류입니다." }, { status: 503 });
  }

  const user = await resolveUser(sb.client, request, "Account/Export");
  if (!user) {
    return sb.applyCookies(NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }));
  }

  // JP-05: Rate limit exports (3 per hour per user)
  if (!exportLimiter.check(user.id, 3, 3_600_000)) {
    return sb.applyCookies(NextResponse.json({ error: "데이터 내보내기는 1시간에 3회까지 가능합니다." }, { status: 429, headers: { "Retry-After": "60" } }));
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

    const [profileRes, storiesRes, commentsRes, feedbackData, subsData, likesData, reviewsData, sessionsData] = await Promise.all([
      // R4-B4: Explicit column list (never use select("*") to avoid leaking internal/future columns)
      sb.client.from("profiles").select("id, display_name, avatar_url, free_stories_remaining, created_at, updated_at").eq("id", userId).single(),
      sb.client.from("stories").select("id, title, scenes, metadata, status, cover_image, created_at").eq("user_id", userId).limit(100),
      sb.client.from("comments").select("id, content, author_alias, story_id, created_at").eq("user_id", userId).limit(500),
      safeQuery("feedback", "id, empathy_rating, insight_rating, overall_rating, free_text, created_at", "user_id"),
      safeQuery("subscriptions", "id, plan, status, created_at", "user_id"),
      safeQuery("likes", "id, story_id, created_at", "user_id"),
      safeQuery("user_reviews", "id, author_alias, stars, content, created_at", "user_id"),
      // R4-5: Include sessions for GDPR Art. 20 completeness
      safeQuery("sessions", "id, current_phase, status, created_at, updated_at", "user_id"),
    ]);

    // R4-5: Fetch messages for user's sessions (messages reference session_id, not user_id)
    let messagesData: unknown[] = [];
    const sessionIds = (sessionsData as unknown as Array<{ id: string }>).map(s => s.id);
    if (sessionIds.length > 0) {
      try {
        const { data } = await sb.client
          .from("messages")
          .select("id, session_id, role, content, phase, created_at")
          .in("session_id", sessionIds)
          .limit(5000);
        messagesData = data || [];
      } catch { /* graceful fallback */ }
    }

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
      sessions: sessionsData,
      messages: messagesData,
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
