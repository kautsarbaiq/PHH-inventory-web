// ============================================================
// PHH Inventory — Better Auth Instance
// ============================================================

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/index.js";
import * as schema from "../db/schema/auth.js";

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
  trustedOrigins: [
    "https://phh-inventory-web-client.vercel.app",
    "http://localhost:5173",
    ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL.replace(/\/$/, "")] : [])
  ],
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
