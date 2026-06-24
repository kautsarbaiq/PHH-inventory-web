// ============================================================
// PHH Inventory — Role helper hook
// Reads the current user's role from the auth session so the UI
// can hide manager-only actions. Server-side checks remain the
// source of truth; this is purely UX.
// ============================================================

import { useSession } from "../lib/auth-client";

export function useRole() {
  const { data: session } = useSession();
  const role = session?.user?.role || "operator";
  return { role, isManager: role === "manager", isOperator: role === "operator" };
}

export default useRole;
