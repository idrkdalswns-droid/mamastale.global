import { NextRequest, NextResponse } from "next/server";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";

export const runtime = "edge";

// GDPR Art. 20: Right to Data Portability
export async function GET(request: NextRequest) {
  const sb = createApiSupabaseClient(request);
  if (!sb) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }

  const { data: { user } } = await sb.client.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const userId = user.id;

  try {
    const [profileRes, storiesRes, commentsRes] = await Promise.all([
      sb.client.from("profiles").select("*").eq("id", userId).single(),
      sb.client.from("stories").select("id, title, scenes, metadata, status, created_at").eq("user_id", userId),
      sb.client.from("comments").select("id, content, author_alias, story_id, created_at").eq("user_id", userId),
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
    return NextResponse.json({ error: "데이터 내보내기에 실패했습니다." }, { status: 500 });
  }
}
