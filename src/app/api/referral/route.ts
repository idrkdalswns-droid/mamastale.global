export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";
import { getClientIP } from "@/lib/utils/validation";
import { createInMemoryLimiter, RATE_KEYS } from "@/lib/utils/rate-limiter";
import { resolveUser } from "@/lib/supabase/resolve-user";
import { t } from "@/lib/i18n";

const referralSchema = z.object({
  code: z.string().min(4).max(8).transform(s => s.trim().toUpperCase()),
});

// ─── Rate limiter ───
const referralLimiter = createInMemoryLimiter(RATE_KEYS.REFERRAL, { maxEntries: 200 });

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I/O/0/1 for readability (32 chars = no modulo bias with Uint8)
  const randomBytes = new Uint8Array(6);
  crypto.getRandomValues(randomBytes);
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[randomBytes[i] % chars.length];
  }
  return code;
}

// GET: Retrieve or generate referral code + stats
export async function GET(request: NextRequest) {
  const ip = getClientIP(request);
  if (!referralLimiter.check(ip, 15, 60_000)) {
    return NextResponse.json({ error: t("Errors.rateLimit.tooManyRequestsShort") }, { status: 429, headers: { "Retry-After": "60" } });
  }

  const sb = createApiSupabaseClient(request);
  if (!sb) return NextResponse.json({ error: t("Errors.system.configError") }, { status: 503 });

  const user = await resolveUser(sb!.client, request, "Referral");
  if (!user) return NextResponse.json({ error: t("Errors.auth.loginRequired") }, { status: 401 });

  // Get or create referral code
  const { data: profile } = await sb.client
    .from("profiles")
    .select("referral_code")
    .eq("id", user.id)
    .single();

  let code = profile?.referral_code;

  if (!code) {
    // Generate unique code with retry
    for (let attempt = 0; attempt < 5; attempt++) {
      code = generateCode();
      const { error } = await sb.client
        .from("profiles")
        .update({ referral_code: code })
        .eq("id", user.id);
      if (!error) break;
      code = null;
    }
    if (!code) {
      console.error("[Referral] Code generation exhausted after 5 attempts", { userId: user.id.slice(0, 8) });
      return sb.applyCookies(
        NextResponse.json({ error: t("Errors.referral.codeGenerationFailed") }, { status: 500 })
      );
    }
  }

  // Get referral stats
  const { count } = await sb.client
    .from("referrals")
    .select("id", { count: "exact", head: true })
    .eq("referrer_id", user.id)
    .eq("referrer_rewarded", true);

  const MAX_REFERRALS = 2;
  const referralCount = count || 0;

  return sb.applyCookies(
    NextResponse.json({
      code,
      referralCount,
      ticketsEarned: referralCount,
      maxReferrals: MAX_REFERRALS,
      remainingReferrals: Math.max(0, MAX_REFERRALS - referralCount),
      shareUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://mamastale-global.pages.dev"}/?ref=${code}`,
    })
  );
}

// POST: Claim a referral code (called during/after signup)
export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  // Bug Bounty: 3/min (was 5) to slow enumeration attacks
  if (!referralLimiter.check(ip, 3, 60_000)) {
    return NextResponse.json({ error: t("Errors.rateLimit.tooManyRequestsShort") }, { status: 429, headers: { "Retry-After": "60" } });
  }

  const sb = createApiSupabaseClient(request);
  if (!sb) return NextResponse.json({ error: t("Errors.system.configError") }, { status: 503 });

  const user = await resolveUser(sb!.client, request, "Referral");
  if (!user) return NextResponse.json({ error: t("Errors.auth.loginRequired") }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: t("Errors.validation.invalidRequestFormat") }, { status: 400 });
  }

  const parsed = referralSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: t("Errors.validation.invalidRequestFormat") }, { status: 400 });
  }

  const code = parsed.data.code;

  // Bug Bounty: Reject invalid format before DB query (prevents blind enumeration)
  if (!/^[A-Z0-9]{6}$/.test(code)) {
    return NextResponse.json({ error: t("Errors.referral.invalidCodeFormat") }, { status: 400 });
  }

  // Check if already referred
  const { data: myProfile } = await sb.client
    .from("profiles")
    .select("referred_by")
    .eq("id", user.id)
    .single();

  if (myProfile?.referred_by) {
    console.warn("[Referral] Already referred user attempted again", { userId: user.id.slice(0, 8) });
    return sb.applyCookies(
      NextResponse.json({ error: t("Errors.referral.alreadyReferred") }, { status: 409 })
    );
  }

  // Find referrer by code
  const { data: referrer } = await sb.client
    .from("profiles")
    .select("id")
    .eq("referral_code", code)
    .single();

  if (!referrer) {
    console.error("[Referral] Invalid code attempted", { code, userId: user.id.slice(0, 8) });
    return sb.applyCookies(
      NextResponse.json({ error: t("Errors.referral.codeNotFound") }, { status: 404 })
    );
  }

  // Can't refer yourself
  if (referrer.id === user.id) {
    console.warn("[Referral] Self-referral attempted", { userId: user.id.slice(0, 8), code });
    return sb.applyCookies(
      NextResponse.json({ error: t("Errors.referral.selfReferral") }, { status: 400 })
    );
  }

  // Cap check: referrer can only reward up to 2 people
  const MAX_REFERRALS = 2;
  const { count: referrerRewardedCount } = await sb.client
    .from("referrals")
    .select("id", { count: "exact", head: true })
    .eq("referrer_id", referrer.id)
    .eq("referrer_rewarded", true);

  if ((referrerRewardedCount || 0) >= MAX_REFERRALS) {
    console.warn("[Referral] Max referrals reached", { referrerId: referrer.id.slice(0, 8), count: referrerRewardedCount });
    return sb.applyCookies(
      NextResponse.json({ error: t("Errors.referral.maxReached") }, { status: 409 })
    );
  }

  // Service role required for cross-user writes (RLS blocks anon client INSERT on referrals)
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !supabaseUrl) {
    return sb.applyCookies(
      NextResponse.json({ error: t("Errors.referral.serviceConfigError") }, { status: 503 })
    );
  }

  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(supabaseUrl, serviceKey);

  // Step 1: Insert referral record with rewarded=false (rollback-safe)
  const { data: refRecord, error: insertErr } = await admin
    .from("referrals")
    .insert({
      referrer_id: referrer.id,
      referred_id: user.id,
      referrer_rewarded: false,
      referred_rewarded: false,
    })
    .select("id")
    .single();

  if (insertErr) {
    if (insertErr.code === "23505") {
      console.warn("[Referral] Duplicate referral insert", { userId: user.id.slice(0, 8), referrerId: referrer.id.slice(0, 8) });
      return sb.applyCookies(
        NextResponse.json({ error: t("Errors.referral.alreadyReferred") }, { status: 409 })
      );
    }
    console.error("[Referral] Insert failed", { userId: user.id.slice(0, 8), error: insertErr.message });
    return sb.applyCookies(
      NextResponse.json({ error: t("Errors.referral.processingError") }, { status: 500 })
    );
  }

  // Step 2: Update referred_by on profile
  await admin
    .from("profiles")
    .update({ referred_by: referrer.id })
    .eq("id", user.id);

  // Step 3: Award tickets — with rollback on failure
  // F-004 FIX: If second increment fails, rollback first via RPC direct call
  // (JS wrapper incrementTickets() rejects count < 1, so we use RPC for -1)
  try {
    const { error: referrerErr } = await admin.rpc("increment_tickets", { p_user_id: referrer.id, p_count: 1 });
    if (referrerErr) throw new Error(`Referrer ticket failed: ${referrerErr.message}`);

    const { error: referredErr } = await admin.rpc("increment_tickets", { p_user_id: user.id, p_count: 1 });
    if (referredErr) {
      // Rollback referrer's ticket via RPC direct (GREATEST(0,...) prevents negative)
      await admin.rpc("increment_tickets", { p_user_id: referrer.id, p_count: -1 })
        .then(({ error }) => { if (error) console.error("[Referral] Referrer rollback failed:", error.message); });
      throw new Error(`Referred ticket failed: ${referredErr.message}`);
    }

    // Mark both as rewarded
    await admin
      .from("referrals")
      .update({ referrer_rewarded: true, referred_rewarded: true })
      .eq("id", refRecord.id);
  } catch (err) {
    console.error("[Referral] Ticket award failed:", err instanceof Error ? err.message : "Unknown");
    // ROLLBACK: delete referral record + reset referred_by so user can retry
    await admin.from("referrals").delete().eq("id", refRecord.id);
    await admin.from("profiles").update({ referred_by: null }).eq("id", user.id);
    return sb.applyCookies(
      NextResponse.json({ error: t("Errors.ticket.grantFailed") }, { status: 500 })
    );
  }

  return sb.applyCookies(
    NextResponse.json({ success: true, message: t("Errors.referral.rewardGranted") })
  );
}
