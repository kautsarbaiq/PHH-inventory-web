// ============================================================
// PHH Inventory — Better Auth Instance
// ============================================================

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/index.js";
import * as schema from "../db/schema/auth.js";

// ---- Parse trusted origins from env ----
const parseTrustedOrigins = (): string[] => {
  const env = process.env.CORS_ORIGIN || process.env.CLIENT_URL;
  const defaults = ["http://localhost:5173"];
  if (!env) return defaults;
  const origins = env.split(",").map((o) => o.trim().replace(/\/$/, "")).filter(Boolean);
  return [...new Set([...origins, ...defaults])];
};

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  baseURL: process.env.BETTER_AUTH_URL || "https://phh-inventory-web.onrender.com",
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins: parseTrustedOrigins(),
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "operator",
        input: true,
      },
    },
  },
  advanced: {
    database: {
      generateId: "uuid",
    },
    defaultCookieAttributes: {
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
    },
  },
});
