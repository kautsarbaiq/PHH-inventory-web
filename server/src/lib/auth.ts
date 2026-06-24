// ============================================================
// PHH Inventory — Better Auth Instance
// ============================================================

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/index.js";
import * as schema from "../db/schema/auth.js";
import { parseAllowedOrigins } from "./origins.js";

const isProduction = process.env.NODE_ENV === "production";
const defaultBaseURL = `http://localhost:${process.env.PORT || 3001}`;

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
  baseURL: process.env.BETTER_AUTH_URL || defaultBaseURL,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  trustedOrigins: parseAllowedOrigins(),
  // Throttle credential-stuffing / brute-force against the auth endpoints.
  rateLimit: {
    enabled: true,
    window: 60, // seconds
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 10 },
      "/sign-up/email": { window: 60, max: 5 },
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "operator",
        // SECURITY: never allow the client to set its own role at sign-up.
        // Roles are assigned server-side (DB seed / admin action) only.
        input: false,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        // Defense-in-depth: force every self-registered user to "operator",
        // even if a future config change re-enables role input.
        before: async (user: Record<string, unknown>) => {
          return { data: { ...user, role: "operator" } };
        },
      },
    },
  },
  advanced: {
    database: {
      generateId: "uuid",
    },
    defaultCookieAttributes: {
      sameSite: isProduction ? "none" : "lax",
      secure: isProduction,
    },
  },
});
