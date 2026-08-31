/*
# Create api_keys table for storing third-party API keys server-side

1. New Tables
- `api_keys`
  - `id` (uuid, primary key)
  - `name` (text, unique, not null) — key identifier e.g. 'THE_ODDS_API_KEY'
  - `value` (text, not null) — the actual API key
  - `description` (text, optional)
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

2. Security
- Enable RLS on `api_keys`.
- Deny all access to anon and authenticated roles — only the service role
  (used by edge functions) can read this table. This keeps API keys
  completely invisible to the browser.

3. Notes
- Edge functions use the service role key (available in their environment
  as SUPABASE_SERVICE_ROLE_KEY) to query this table.
- The browser can never read this table because RLS denies anon/authenticated.
*/

CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  value text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Deny all access to anon and authenticated — only service role can read
DROP POLICY IF EXISTS "deny_anon_select_api_keys" ON api_keys;
CREATE POLICY "deny_anon_select_api_keys" ON api_keys FOR SELECT
  TO anon, authenticated USING (false);

DROP POLICY IF EXISTS "deny_anon_insert_api_keys" ON api_keys;
CREATE POLICY "deny_anon_insert_api_keys" ON api_keys FOR INSERT
  TO anon, authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "deny_anon_update_api_keys" ON api_keys;
CREATE POLICY "deny_anon_update_api_keys" ON api_keys FOR UPDATE
  TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "deny_anon_delete_api_keys" ON api_keys;
CREATE POLICY "deny_anon_delete_api_keys" ON api_keys FOR DELETE
  TO anon, authenticated USING (false);
