/*
# Adapt ai_research cache to the single-user model

The terminal no longer has per-user accounts (master-code auth only), so the
`user_id NOT NULL DEFAULT auth.uid()` column made every cache insert from the
service-role edge function fail the NOT NULL / FK constraint — the AI research
cache never populated and every call re-hit Claude.

1. Changes
  - Drop the NOT NULL constraint and the FK on `user_id` (kept nullable for
    history compatibility; new rows leave it null).
  - Replace the owner-scoped RLS policies with a single "no direct client
    access" posture — the edge function uses the service role, which bypasses
    RLS; nothing else should touch this table.
*/

ALTER TABLE ai_research ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE ai_research ALTER COLUMN user_id DROP DEFAULT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'ai_research_user_id_fkey'
      AND table_name = 'ai_research'
  ) THEN
    ALTER TABLE ai_research DROP CONSTRAINT ai_research_user_id_fkey;
  END IF;
END $$;

DROP POLICY IF EXISTS "select_own_research" ON ai_research;
DROP POLICY IF EXISTS "insert_own_research" ON ai_research;
DROP POLICY IF EXISTS "update_own_research" ON ai_research;
DROP POLICY IF EXISTS "delete_own_research" ON ai_research;

-- RLS stays enabled; with no policies, only the service role (which bypasses
-- RLS) can read or write. That is exactly the access the edge function needs.
