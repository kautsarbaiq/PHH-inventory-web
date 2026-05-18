// ============================================================
// PHH Inventory — Better Auth Client
// ============================================================

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: window.location.origin, // Uses Vite proxy in dev
});

export const { signIn, signUp, signOut, useSession } = authClient;
