/*
# Create audit_journal table

1. New Tables
  - `audit_journal`
    - `id` (uuid, primary key) — unique event identifier
    - `user_id` (uuid, not null, default auth.uid()) — owner, FK to auth.users
    - `ts` (timestamptz, default now()) — event timestamp
    - `event_type` (text, not null) — e.g. 'order_submitted', 'kill_switch', 'signal_generated'
    - `payload` (jsonb, default '{}') — structured event data
    - `source` (text, not null, default 'app') — originating system ('app', 'edge_fn', 'manual')
    - `created_at` (timestamptz, default now()) — row creation time

2. Security
  - Enable RLS on `audit_journal`.
  - Owner-scoped CRUD: authenticated users can only access their own rows.

3. Indexes
  - (user_id, ts DESC) for efficient timeline queries
  - (event_type) for filtering by type

4. Notes
  - This is an append-mostly journal; updates are rare but allowed for corrections.
  - No columns are dropped or renamed.
*/

CREATE TABLE IF NOT EXISTS audit_journal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  ts timestamptz NOT NULL DEFAULT now(),
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL DEFAULT 'app',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE audit_journal ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_audit_journal_user_ts ON audit_journal (user_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_audit_journal_event_type ON audit_journal (event_type);

DROP POLICY IF EXISTS "select_own_audit" ON audit_journal;
CREATE POLICY "select_own_audit" ON audit_journal FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_audit" ON audit_journal;
CREATE POLICY "insert_own_audit" ON audit_journal FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_audit" ON audit_journal;
CREATE POLICY "update_own_audit" ON audit_journal FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_audit" ON audit_journal;
CREATE POLICY "delete_own_audit" ON audit_journal FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
