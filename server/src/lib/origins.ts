// ============================================================
// PHH Inventory — Allowed origin parsing (single source of truth)
// Used by both CORS (index.ts) and Better Auth trustedOrigins (auth.ts)
// so the two lists can never drift.
// ============================================================

/**
 * Parse the allowed frontend origins from env.
 * - Dev: falls back to http://localhost:5173 when nothing is configured.
 * - Production: requires CORS_ORIGIN/CLIENT_URL to be set explicitly and
 *   does NOT silently allow localhost (avoids a permanent dev origin in
 *   the production credentialed allowlist).
 */
export function parseAllowedOrigins(): string[] {
  const env = process.env.CORS_ORIGIN || process.env.CLIENT_URL;
  const isProd = process.env.NODE_ENV === "production";

  const fromEnv = (env || "")
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean);

  const devDefaults = isProd ? [] : ["http://localhost:5173"];
  const origins = [...new Set([...fromEnv, ...devDefaults])];

  if (isProd && origins.length === 0) {
    throw new Error(
      "CORS_ORIGIN (or CLIENT_URL) must be set in production — refusing to start with an empty origin allowlist."
    );
  }

  return origins;
}
