/**
 * Environment variable validation — warn-only, never throws.
 *
 * Coexists with existing per-use checks (e.g., `if (!SUPABASE_URL) return`).
 * This function is for early detection after deployment — surfaces missing
 * vars in Cloudflare logs on first request instead of failing silently.
 *
 * @module env-check
 */

const REQUIRED_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "ANTHROPIC_API_KEY",
] as const;

const OPTIONAL_VARS = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "TOSS_SECRET_KEY",
  "SLACK_CRISIS_WEBHOOK_URL",
] as const;

let checked = false;

export function checkRequiredEnvVars(): void {
  if (checked) return;
  const missing = REQUIRED_VARS.filter(v => !process.env[v]);
  if (missing.length > 0) {
    console.error(`[ENV] Missing required vars: ${missing.join(", ")}`);
  }
  const missingOptional = OPTIONAL_VARS.filter(v => !process.env[v]);
  if (missingOptional.length > 0) {
    console.warn(`[ENV] Missing optional vars: ${missingOptional.join(", ")}`);
  }
  checked = true;
}
