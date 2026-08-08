-- ============================================================
-- Security: lock down the public schema against Supabase's REST API
--
-- Supabase auto-exposes every table in the `public` schema through
-- PostgREST using the project's anon key (which is public by design).
-- With Row-Level Security disabled, that means anyone holding the anon
-- key can read/write every row — including password hashes in `account`
-- and live session tokens in `session`. This is what Supabase's
-- `rls_disabled_in_public` / `sensitive_columns_exposed` advisors flag.
--
-- This app does NOT use PostgREST or the anon key: it talks to Postgres
-- directly as the table-owning `postgres` role via DATABASE_URL, and a
-- table owner bypasses RLS. So enabling RLS with NO policies blocks the
-- REST API completely while leaving the application untouched.
--
-- Defence in depth: also revoke the default grants from the anon and
-- authenticated roles, so the tables are unreachable even if a policy is
-- added by accident later.
-- ============================================================

-- 1) Enable RLS on every table (no policies => deny-all for non-owners)
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "verification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "master_sheets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cutting_orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sheet_groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sheet_group_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bins" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "purchase_orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "po_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pick_lists" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pick_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "placement_items" ENABLE ROW LEVEL SECURITY;

-- 2) Revoke API-role grants (Supabase-only roles; skipped elsewhere)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
    REVOKE USAGE ON SCHEMA public FROM anon;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated;
    REVOKE USAGE ON SCHEMA public FROM authenticated;
  END IF;
END
$$;
