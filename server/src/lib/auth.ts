// ============================================================
// PHH Inventory — Better Auth Instance
// ============================================================

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/index.js";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
  },
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
  },
});
